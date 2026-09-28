// Customer password reset by emailed link.

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { sendPasswordResetEmail } = require('../utils/emailService');
const { isStrongPassword, STRONG_PASSWORD_HINT } = require('../utils/validation');
const { decrypt, hashLookup } = require('../utils/piiCrypto');

// Reset tokens are hashed before storage so a leaked DB row can't be used to reset a password
const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Request Password Reset
 * Always responds with the same message regardless of whether the account
 * exists, to avoid leaking which emails are registered.
 */
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const customer = await prisma.customer.findUnique({
      where: { emailHash: hashLookup(email) }
    });

    if (customer) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          resetToken: hashResetToken(rawToken),
          resetTokenExpiry: expiry
        }
      });

      try {
        await sendPasswordResetEmail(decrypt(customer.email), customer.name, rawToken, customer.preferredLanguage);
      } catch (err) {
        console.error('Failed to send password reset email:', err.message);
      }
    }

    res.json({ message: 'If an account with this email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

/**
 * Reset Password using a token from the reset email
 */
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ error: STRONG_PASSWORD_HINT });
    }

    const customer = await prisma.customer.findFirst({
      where: {
        resetToken: hashResetToken(token),
        resetTokenExpiry: { gt: new Date() }
      }
    });

    if (!customer) {
      return res.status(400).json({ error: 'This password reset link is invalid or has expired. Please request a new one.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        tokenVersion: { increment: 1 }
      }
    });

    res.json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

module.exports = {
  requestPasswordReset,
  resetPassword
};
