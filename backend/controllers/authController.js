const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { JWT_SECRET, SECURE_COOKIES } = require('../lib/config');
const { sendAdminLoginOtpEmail } = require('../utils/emailService');
const { generateCsrfToken, setCsrfCookie } = require('../middleware/csrf');
const { logAudit } = require('../lib/auditLog');
const { secureCompare } = require('../utils/validation');

const PENDING_2FA_SCOPE = 'admin-2fa-pending';
const SESSION_TTL = '24h'; // #22 fix: limit admin JWT lifetime to 24h (previously 30d)

const generateOTP = () => crypto.randomInt(100000, 1000000).toString();

const issuePendingToken = (adminId) =>
  jwt.sign({ adminId, scope: PENDING_2FA_SCOPE }, JWT_SECRET, { expiresIn: '10m' });

const verifyPendingToken = (pendingToken) => {
  const decoded = jwt.verify(pendingToken, JWT_SECRET);
  if (decoded.scope !== PENDING_2FA_SCOPE) throw new Error('Invalid pending token');
  return decoded.adminId;
};

// Step 1: password check, then email a 2FA code and hand back a short-lived
// pending token (not a real session) that must be exchanged for one via verify2FA.
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const code = generateOTP();
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        twoFactorOtp: code,
        twoFactorOtpExpiry: new Date(Date.now() + 10 * 60 * 1000),
        twoFactorAttempts: 0
      }
    });

    await sendAdminLoginOtpEmail(admin.email, admin.name, code);

    res.json({
      requires2FA: true,
      pendingToken: issuePendingToken(admin.id),
      email: admin.email
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Step 2: exchange the pending token + emailed code for a real session JWT.
const verify2FA = async (req, res) => {
  try {
    const { pendingToken, code } = req.body;
    if (!pendingToken || !code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    let adminId;
    try {
      adminId = verifyPendingToken(pendingToken);
    } catch (err) {
      return res.status(401).json({ error: 'Login session expired, please sign in again' });
    }

    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin || !admin.twoFactorOtp) {
      return res.status(401).json({ error: 'Login session expired, please sign in again' });
    }

    if (admin.twoFactorAttempts >= 5) {
      return res.status(429).json({ error: 'Zu viele fehlerhafte Versuche. Bitte fordern Sie einen neuen Code an / Too many incorrect attempts. Please request a new code.' });
    }

    if (!secureCompare(admin.twoFactorOtp, String(code).trim())) {
      await prisma.admin.update({
        where: { id: admin.id },
        data: { twoFactorAttempts: admin.twoFactorAttempts + 1 }
      });
      return res.status(400).json({ error: 'Invalid code' });
    }

    if (!admin.twoFactorOtpExpiry || new Date() > admin.twoFactorOtpExpiry) {
      return res.status(400).json({ error: 'Code has expired. Please request a new one.' });
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: { twoFactorOtp: null, twoFactorOtpExpiry: null, twoFactorAttempts: 0 }
    });

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: 'admin', tokenVersion: admin.tokenVersion || 0 },
      JWT_SECRET,
      { expiresIn: SESSION_TTL }
    );

    // #38 fix: set HttpOnly cookie alongside token in JSON response
    res.cookie('token', token, {
      httpOnly: true,
      secure: SECURE_COOKIES,
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000
    });
    // #4 fix: issue the CSRF cookie alongside the session — required for any
    // cookie-authenticated mutating request to pass requireCsrfForCookieAuth.
    setCsrfCookie(res, generateCsrfToken(), 24 * 60 * 60 * 1000);

    logAudit(admin.email, 'ADMIN_LOGIN', 'Erfolgreiche 2FA-Anmeldung im Admin-Dashboard');

    res.json({
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name }
    });
  } catch (error) {
    console.error('Verify 2FA error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

// Resend a fresh code against the same pending login (e.g. the first email
// was slow or missed) — issues a new pending token too so its own 10-minute
// clock restarts alongside the OTP's.
const resend2FA = async (req, res) => {
  try {
    const { pendingToken } = req.body;
    if (!pendingToken) {
      return res.status(400).json({ error: 'Pending token is required' });
    }

    let adminId;
    try {
      adminId = verifyPendingToken(pendingToken);
    } catch (err) {
      return res.status(401).json({ error: 'Login session expired, please sign in again' });
    }

    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      return res.status(401).json({ error: 'Login session expired, please sign in again' });
    }

    const code = generateOTP();
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        twoFactorOtp: code,
        twoFactorOtpExpiry: new Date(Date.now() + 10 * 60 * 1000),
        twoFactorAttempts: 0
      }
    });

    await sendAdminLoginOtpEmail(admin.email, admin.name, code);

    res.json({ pendingToken: issuePendingToken(admin.id), message: 'New code sent' });
  } catch (error) {
    console.error('Resend 2FA error:', error);
    res.status(500).json({ error: 'Failed to resend code' });
  }
};

const changePassword = async (req, res) => {
  try {
    const adminId = req.admin?.id;
    const { currentPassword, newPassword } = req.body;

    if (!adminId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    const { isStrongPassword, STRONG_PASSWORD_HINT } = require('../utils/validation');
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ error: STRONG_PASSWORD_HINT });
    }

    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const valid = await bcrypt.compare(currentPassword, admin.password);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const updated = await prisma.admin.update({
      where: { id: adminId },
      data: {
        password: hashedPassword,
        tokenVersion: { increment: 1 }
      }
    });

    const token = jwt.sign(
      { id: updated.id, email: updated.email, role: 'admin', tokenVersion: updated.tokenVersion },
      JWT_SECRET,
      { expiresIn: SESSION_TTL }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: SECURE_COOKIES,
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000
    });
    // #4 fix: the old CSRF token must not survive a password change either.
    setCsrfCookie(res, generateCsrfToken(), 24 * 60 * 60 * 1000);

    logAudit(updated.email, 'ADMIN_CHANGE_PASSWORD', 'Admin-Passwort geändert und alte Sitzungen widerrufen');

    res.json({
      message: 'Password changed successfully. All other admin sessions have been revoked.',
      token
    });
  } catch (error) {
    console.error('Admin change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

module.exports = { login, verify2FA, resend2FA, changePassword };
