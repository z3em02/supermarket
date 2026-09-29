// Driver accounts (admin side) and the driver login/approval/logout flow.

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { JWT_SECRET, SECURE_COOKIES } = require('../lib/config');
const { logAudit } = require('../lib/auditLog');
const { generateCsrfToken, setCsrfCookie, clearCsrfCookieUnlessOtherSession, requireCsrfForCookieAuth } = require('../middleware/csrf');

const DRIVER_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Generates a random numeric PIN (default 6 digits) for a new/reset driver
// account, in the same style as the OTP generators elsewhere in this app.
const generateDriverPin = (digits = 6) => {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return String(crypto.randomInt(min, max + 1));
};

// GET /api/settings/drivers - Admin only. Never returns pinHash.
const listDrivers = async (req, res) => {
  try {
    const drivers = await prisma.driver.findMany({
      select: { id: true, name: true, active: true, createdAt: true, updatedAt: true },
      orderBy: { name: 'asc' }
    });
    res.json(drivers);
  } catch (error) {
    console.error('List drivers error:', error);
    res.status(500).json({ error: 'Failed to load drivers' });
  }
};

// GET /api/settings/drivers/names - Admin only, no section PIN: just the
// names of active drivers, for the Orders page's "assign driver" choice.
// Nothing here is more sensitive than the online-driver list the Orders page
// already reads (no ids, PINs or timestamps).
const listActiveDriverNames = async (req, res) => {
  try {
    const drivers = await prisma.driver.findMany({
      where: { active: true },
      select: { name: true },
      orderBy: { name: 'asc' }
    });
    res.json(drivers.map((d) => d.name));
  } catch (error) {
    console.error('List driver names error:', error);
    res.status(500).json({ error: 'Failed to load drivers' });
  }
};

// POST /api/settings/drivers - Admin only. Creates a driver with either an
// admin-supplied PIN or a randomly generated one, returned once in the
// response — same pattern as the seed script's generated admin password:
// it isn't stored anywhere in plaintext and won't be shown again.
const createDriver = async (req, res) => {
  try {
    const { name, pin } = req.body;
    const cleanName = String(name || '').trim().slice(0, 60);
    if (!cleanName) {
      return res.status(400).json({ error: 'Fahrername ist erforderlich / Driver name is required' });
    }
    const nameLower = cleanName.toLowerCase();

    // Friendly pre-check for the common case — not the actual guarantee.
    // Two concurrent requests for names differing only in case could both
    // pass this and still race each other; `nameLower`'s DB-level unique
    // constraint (caught as P2002 below) is what actually prevents it.
    const duplicate = await prisma.driver.findUnique({ where: { nameLower } });
    if (duplicate) {
      return res.status(400).json({ error: `Fahrer "${cleanName}" existiert bereits / Driver already exists` });
    }

    let cleanPin = pin !== undefined && pin !== null && pin !== '' ? String(pin).trim() : null;
    let generated = false;
    if (cleanPin) {
      if (!/^\d{4,8}$/.test(cleanPin)) {
        return res.status(400).json({ error: 'PIN must be 4-8 digits' });
      }
    } else {
      cleanPin = generateDriverPin();
      generated = true;
    }

    const pinHash = await bcrypt.hash(cleanPin, 10);
    const driver = await prisma.driver.create({
      data: { name: cleanName, nameLower, pinHash },
      select: { id: true, name: true, active: true, createdAt: true }
    });

    logAudit(req.admin?.email, 'CREATE_DRIVER', `Fahrer "${cleanName}" angelegt`);
    res.status(201).json({ ...driver, pin: generated ? cleanPin : undefined });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: `Fahrer "${req.body?.name}" existiert bereits / Driver already exists` });
    }
    console.error('Create driver error:', error);
    res.status(500).json({ error: 'Failed to create driver' });
  }
};

// PUT /api/settings/drivers/:id - Admin only. Renames and/or (de)activates
// a driver. Deactivating takes effect immediately, not just on next
// login — driverOrAdminAuthMiddleware re-checks `active` on every request.
const updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, active } = req.body;

    const existing = await prisma.driver.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const data = {};
    if (name !== undefined) {
      const cleanName = String(name || '').trim().slice(0, 60);
      if (!cleanName) {
        return res.status(400).json({ error: 'Fahrername ist erforderlich / Driver name is required' });
      }
      const nameLower = cleanName.toLowerCase();
      if (nameLower !== existing.nameLower) {
        // Friendly pre-check only — the nameLower unique constraint (P2002
        // below) is what actually prevents a race against a concurrent
        // create/rename.
        const duplicate = await prisma.driver.findUnique({ where: { nameLower } });
        if (duplicate) {
          return res.status(400).json({ error: `Fahrer "${cleanName}" existiert bereits / Driver already exists` });
        }
      }
      data.name = cleanName;
      data.nameLower = nameLower;
    }
    if (active !== undefined) data.active = Boolean(active);

    const driver = await prisma.driver.update({
      where: { id },
      data,
      select: { id: true, name: true, active: true, createdAt: true, updatedAt: true }
    });

    logAudit(req.admin?.email, 'UPDATE_DRIVER', `Fahrer "${existing.name}" aktualisiert (Aktiv: ${driver.active})`);
    res.json(driver);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: `Fahrer "${req.body?.name}" existiert bereits / Driver already exists` });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Driver not found' });
    }
    console.error('Update driver error:', error);
    res.status(500).json({ error: 'Failed to update driver' });
  }
};

// POST /api/settings/drivers/:id/reset-pin - Admin only. Generates a fresh
// PIN and returns it once (or accepts an admin-supplied one, same as create).
const resetDriverPin = async (req, res) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;

    const existing = await prisma.driver.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    let cleanPin = pin !== undefined && pin !== null && pin !== '' ? String(pin).trim() : null;
    let generated = false;
    if (cleanPin) {
      if (!/^\d{4,8}$/.test(cleanPin)) {
        return res.status(400).json({ error: 'PIN must be 4-8 digits' });
      }
    } else {
      cleanPin = generateDriverPin();
      generated = true;
    }

    const pinHash = await bcrypt.hash(cleanPin, 10);
    await prisma.driver.update({ where: { id }, data: { pinHash } });

    logAudit(req.admin?.email, 'RESET_DRIVER_PIN', `PIN für Fahrer "${existing.name}" zurückgesetzt`);
    res.json({ message: 'PIN reset', pin: generated ? cleanPin : undefined });
  } catch (error) {
    console.error('Reset driver PIN error:', error);
    res.status(500).json({ error: 'Failed to reset driver PIN' });
  }
};

// DELETE /api/settings/drivers/:id - Admin only. Requires the driver to
// already be deactivated first — a cheap guard against deleting someone
// who's currently logged in or actively assigned deliveries by mistake.
const deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.driver.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    if (existing.active) {
      return res.status(400).json({ error: 'Fahrer muss zuerst deaktiviert werden / Driver must be deactivated first' });
    }

    await prisma.driver.delete({ where: { id } });
    logAudit(req.admin?.email, 'DELETE_DRIVER', `Fahrer "${existing.name}" gelöscht`);
    res.json({ message: 'Driver deleted' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Driver not found' });
    }
    console.error('Delete driver error:', error);
    res.status(500).json({ error: 'Failed to delete driver' });
  }
};

// A pending request older than this is treated as expired — otherwise a
// driver who never got approved/rejected would sit in the admin's list
// forever, and a stale pollToken would stay valid indefinitely.
const DRIVER_LOGIN_REQUEST_TTL_MS = 5 * 60 * 1000;

// POST /api/settings/driver/login - Driver auth endpoint (step 1: name + own
// PIN check). Each driver now has their own account and PIN (see the Driver
// model) instead of one PIN shared by every courier — a driver must supply
// their exact registered name and its matching PIN. Knowing a valid PIN is
// still not enough to get a session on its own: this only creates a pending
// request; an admin must approve it from the dashboard (see
// approveDriverLoginRequest) before a JWT is ever issued.
const driverLogin = async (req, res) => {
  try {
    const { driverName, passcode } = req.body;
    const cleanName = String(driverName || '').trim().slice(0, 60);
    if (!cleanName) {
      return res.status(400).json({ error: 'Fahrername ist erforderlich / Driver name is required' });
    }
    if (!passcode) {
      return res.status(400).json({ error: 'Passcode is required' });
    }

    // Same generic error for "no such driver" and "wrong PIN" — avoids
    // letting a login attempt confirm which driver names are registered.
    const invalidCredentialsError = { error: 'Ungültiger Name oder PIN / Invalid name or PIN' };

    // findUnique on nameLower (not findFirst on a case-insensitive name
    // match) — a non-unique lookup here could silently resolve to the
    // wrong one of two same-named-different-case rows.
    const driver = await prisma.driver.findUnique({
      where: { nameLower: cleanName.toLowerCase() }
    });
    if (!driver || !driver.active) {
      return res.status(401).json(invalidCredentialsError);
    }

    const matches = await bcrypt.compare(String(passcode).trim(), driver.pinHash);
    if (!matches) {
      return res.status(401).json(invalidCredentialsError);
    }

    const pollToken = crypto.randomBytes(32).toString('hex');

    // Use the driver's own registered name (canonical casing), not
    // whatever casing was typed at login, so DriverSession/Order labels
    // stay consistent.
    const request = await prisma.driverLoginRequest.create({
      data: { driverName: driver.name, pollToken, status: 'pending', ipAddress: req.ip || null }
    });

    logAudit('DRIVER_AUTH', 'DRIVER_LOGIN_REQUESTED', `Fahrer "${driver.name}" hat einen Login angefragt (wartet auf Freigabe)`);

    res.json({
      pending: true,
      pollToken,
      requestId: request.id
    });
  } catch (error) {
    console.error('Driver login error:', error);
    res.status(500).json({ error: 'Driver login failed' });
  }
};

// GET /api/settings/driver/login-poll/:pollToken - Driver polls this while
// waiting for admin approval. Public (no auth — the driver has no session
// yet), but pollToken is an unguessable 32-byte random value only ever
// returned to the original requester, so this isn't a meaningful IDOR surface.
const pollDriverLoginRequest = async (req, res) => {
  try {
    const { pollToken } = req.params;
    const request = await prisma.driverLoginRequest.findUnique({ where: { pollToken } });

    if (!request) {
      return res.status(404).json({ status: 'not_found' });
    }

    if (request.status === 'pending' && Date.now() - request.createdAt.getTime() > DRIVER_LOGIN_REQUEST_TTL_MS) {
      await prisma.driverLoginRequest.update({ where: { id: request.id }, data: { status: 'expired', respondedAt: new Date() } });
      return res.json({ status: 'expired' });
    }

    if (request.status === 'pending') {
      return res.json({ status: 'pending' });
    }

    if (request.status === 'rejected') {
      return res.json({ status: 'rejected' });
    }

    if (request.status === 'approved') {
      // One-time delivery: issue the JWT now and immediately delete the row
      // so this pollToken can't be replayed to mint another session later.
      // jti ties this JWT to a DriverSession row — the JWT signature alone
      // can't be revoked once handed out, so driverOrAdminAuthMiddleware
      // checks that row on every request instead, which is what lets an
      // admin actually force this driver logged out before the 24h expiry.
      const jti = crypto.randomBytes(16).toString('hex');
      const expiresAt = new Date(Date.now() + DRIVER_SESSION_MAX_AGE_MS);
      const token = jwt.sign(
        { role: 'driver', name: request.driverName, id: 'driver-session', jti },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      await prisma.driverSession.create({
        data: { driverName: request.driverName, jti, expiresAt }
      });
      await prisma.driverLoginRequest.delete({ where: { id: request.id } }).catch(() => {});
      logAudit('DRIVER_AUTH', 'DRIVER_LOGIN', `Fahrer "${request.driverName}" wurde freigegeben und angemeldet`);

      // Deliver the JWT as an HttpOnly cookie rather than in the JSON body —
      // a driver_token cookie (distinct from the admin `token` cookie, so
      // the two sessions can coexist in one browser) means it's never
      // readable by JS, unlike the localStorage-based session this replaced.
      res.cookie('driver_token', token, {
        httpOnly: true,
        secure: SECURE_COOKIES,
        sameSite: 'lax',
        path: '/',
        maxAge: DRIVER_SESSION_MAX_AGE_MS
      });
      setCsrfCookie(res, generateCsrfToken(), DRIVER_SESSION_MAX_AGE_MS);

      return res.json({
        status: 'approved',
        driver: { role: 'driver', name: request.driverName }
      });
    }

    // 'expired' already persisted from a prior poll
    return res.json({ status: request.status });
  } catch (error) {
    console.error('Poll driver login request error:', error);
    res.status(500).json({ error: 'Failed to check login status' });
  }
};

// GET /api/settings/driver-login-requests - Admin only. Pending requests
// the dashboard shows for approve/reject; auto-expires stale ones first.
const listDriverLoginRequests = async (req, res) => {
  try {
    await prisma.driverLoginRequest.updateMany({
      where: { status: 'pending', createdAt: { lt: new Date(Date.now() - DRIVER_LOGIN_REQUEST_TTL_MS) } },
      data: { status: 'expired', respondedAt: new Date() }
    });
    // pollToken deliberately excluded — the admin never needs it, and it's
    // the one value that could let someone complete this specific driver's
    // login (defense in depth, not the primary protection: that's the fact
    // this endpoint requires an authenticated admin at all).
    const requests = await prisma.driverLoginRequest.findMany({
      where: { status: 'pending' },
      select: { id: true, driverName: true, ipAddress: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    });
    res.json(requests);
  } catch (error) {
    console.error('List driver login requests error:', error);
    res.status(500).json({ error: 'Failed to load driver login requests' });
  }
};

// POST /api/settings/driver-login-requests/:id/approve - Admin only
const approveDriverLoginRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await prisma.driverLoginRequest.findUnique({ where: { id } });
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ error: 'Request not found or already resolved' });
    }
    await prisma.driverLoginRequest.update({
      where: { id },
      data: { status: 'approved', respondedAt: new Date(), respondedBy: req.admin?.email || null }
    });
    logAudit(req.admin?.email, 'APPROVE_DRIVER_LOGIN', `Login von Fahrer "${request.driverName}" genehmigt`);
    res.json({ message: 'Approved' });
  } catch (error) {
    console.error('Approve driver login request error:', error);
    res.status(500).json({ error: 'Failed to approve request' });
  }
};

// POST /api/settings/driver-login-requests/:id/reject - Admin only
const rejectDriverLoginRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await prisma.driverLoginRequest.findUnique({ where: { id } });
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ error: 'Request not found or already resolved' });
    }
    await prisma.driverLoginRequest.update({
      where: { id },
      data: { status: 'rejected', respondedAt: new Date(), respondedBy: req.admin?.email || null }
    });
    logAudit(req.admin?.email, 'REJECT_DRIVER_LOGIN', `Login von Fahrer "${request.driverName}" abgelehnt`);
    res.json({ message: 'Rejected' });
  } catch (error) {
    console.error('Reject driver login request error:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
};

// GET /api/settings/driver-sessions - Admin only. Currently logged-in
// drivers, for the Dashboard's "log this driver out" control.
const listActiveDriverSessions = async (req, res) => {
  try {
    const sessions = await prisma.driverSession.findMany({
      where: { revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(sessions);
  } catch (error) {
    console.error('List active driver sessions error:', error);
    res.status(500).json({ error: 'Failed to load active driver sessions' });
  }
};

// POST /api/settings/driver-sessions/:id/logout - Admin only. Revokes the
// session row; driverOrAdminAuthMiddleware rejects that driver's very next
// request (their app already treats any 401/403 there as "logged out").
const logoutDriverSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await prisma.driverSession.findUnique({ where: { id } });
    if (!session || session.revokedAt) {
      return res.status(404).json({ error: 'Session not found or already ended' });
    }
    await prisma.driverSession.update({ where: { id }, data: { revokedAt: new Date() } });
    logAudit(req.admin?.email, 'LOGOUT_DRIVER_SESSION', `Fahrer "${session.driverName}" wurde vom Administrator abgemeldet`);
    res.json({ message: 'Driver logged out' });
  } catch (error) {
    console.error('Logout driver session error:', error);
    res.status(500).json({ error: 'Failed to log out driver' });
  }
};

// POST /api/settings/driver/logout - Driver's own logout (mirrors the admin
// and customer logout endpoints). Not behind driverOrAdminAuthMiddleware: an
// already-expired/invalid cookie must still be able to log out and clear
// itself, so the CSRF check happens here manually.
const driverLogout = async (req, res) => {
  const authHeader = req.headers.authorization;
  const usedCookieAuth = Boolean(req.cookies?.driver_token);
  const token = req.cookies?.driver_token || (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);

  if (!requireCsrfForCookieAuth(req, res, usedCookieAuth)) return;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.role === 'driver' && decoded.jti) {
        await prisma.driverSession.updateMany({
          where: { jti: decoded.jti, revokedAt: null },
          data: { revokedAt: new Date() }
        });
      }
    } catch (e) {
      // Token may already be expired or malformed; proceed with clearing the cookie
    }
  }

  res.clearCookie('driver_token', {
    httpOnly: true,
    secure: SECURE_COOKIES,
    sameSite: 'lax',
    path: '/'
  });
  clearCsrfCookieUnlessOtherSession(req, res, 'driver_token');
  res.json({ message: 'Logged out successfully' });
};

module.exports = {
  listDrivers,
  listActiveDriverNames,
  createDriver,
  updateDriver,
  resetDriverPin,
  deleteDriver,
  driverLogin,
  pollDriverLoginRequest,
  listDriverLoginRequests,
  approveDriverLoginRequest,
  rejectDriverLoginRequest,
  listActiveDriverSessions,
  logoutDriverSession,
  driverLogout
};
