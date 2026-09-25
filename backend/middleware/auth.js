const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../lib/config');
const prisma = require('../lib/prisma');
const { requireCsrfForCookieAuth } = require('./csrf');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  // #38 fix: support HttpOnly cookie or Authorization Bearer header
  const usedCookieAuth = Boolean(req.cookies?.token) && !authHeader?.startsWith('Bearer ');
  const token = req.cookies?.token || (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // #4 fix: cookie-authenticated mutating requests must also carry a
  // matching CSRF header — a forged cross-site request can ride on the
  // auto-sent cookie but can't read it to produce this header.
  if (!requireCsrfForCookieAuth(req, res, usedCookieAuth)) return;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin access required.' });
    }

    // Verify admin exists and tokenVersion matches (revocation check)
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, tokenVersion: true }
    });

    if (!admin || decoded.tokenVersion === undefined || admin.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ error: 'Session invalidated or expired. Please sign in again.' });
    }

    req.admin = { ...decoded, name: admin.name };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const driverOrAdminAuthMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const usedCookieAuth = Boolean(req.cookies?.token) && !authHeader?.startsWith('Bearer ');
  const token = req.cookies?.token || (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!requireCsrfForCookieAuth(req, res, usedCookieAuth)) return;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role === 'admin') {
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, name: true, tokenVersion: true }
      });
      if (!admin || decoded.tokenVersion === undefined || admin.tokenVersion !== decoded.tokenVersion) {
        return res.status(401).json({ error: 'Session invalidated or expired. Please sign in again.' });
      }
      req.admin = { ...decoded, name: admin.name };
      return next();
    }

    if (decoded.role === 'driver') {
      // The JWT signature alone can't be revoked once handed out — check
      // the DriverSession row it was minted with instead, so an admin's
      // "log this driver out" action from the dashboard actually takes
      // effect immediately rather than waiting for the 24h JWT to expire.
      const session = decoded.jti
        ? await prisma.driverSession.findUnique({ where: { jti: decoded.jti } })
        : null;
      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        return res.status(401).json({ error: 'Session invalidated or expired. Please sign in again.' });
      }
      req.driver = {
        name: decoded.name || 'Fahrer',
        role: 'driver',
        sessionId: session.id
      };
      return next();
    }

    return res.status(403).json({ error: 'Access denied' });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { authMiddleware, driverOrAdminAuthMiddleware };
