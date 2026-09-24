const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../lib/config');
const prisma = require('../lib/prisma');

const anyAuthMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization || req.header('Authorization');
  // #38 fix: support HttpOnly cookie or Authorization Bearer header
  const token = req.cookies?.customer_token || req.cookies?.token || (authHeader?.startsWith('Bearer ') ? authHeader.replace(/^Bearer\s+/, '').trim() : null);

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role === 'customer') {
      // Finding 1.2 fix: verify customer session is not revoked via tokenVersion
      const customer = await prisma.customer.findUnique({
        where: { id: decoded.customerId },
        select: { tokenVersion: true }
      });
      if (!customer || decoded.tokenVersion === undefined || customer.tokenVersion !== decoded.tokenVersion) {
        return res.status(401).json({ error: 'Session invalidated. Please log in again.' });
      }
      req.customer = decoded;
    } else if (decoded.role === 'admin') {
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.id },
        select: { tokenVersion: true }
      });
      if (!admin || decoded.tokenVersion === undefined || admin.tokenVersion !== decoded.tokenVersion) {
        return res.status(401).json({ error: 'Session invalidated. Please log in again.' });
      }
      req.admin = decoded;
    } else {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const optionalAuthMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization || req.header('Authorization');
  // Finding 1.7 fix: inspect HttpOnly cookies if Authorization header is absent
  const token = req.cookies?.customer_token || req.cookies?.token || (authHeader?.startsWith('Bearer ') ? authHeader.replace(/^Bearer\s+/, '').trim() : null);

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role === 'customer') {
      const customer = await prisma.customer.findUnique({
        where: { id: decoded.customerId },
        select: { tokenVersion: true }
      });
      if (customer && decoded.tokenVersion !== undefined && customer.tokenVersion === decoded.tokenVersion) {
        req.customer = decoded;
      }
    } else if (decoded.role === 'admin') {
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.id },
        select: { tokenVersion: true }
      });
      if (admin && decoded.tokenVersion !== undefined && admin.tokenVersion === decoded.tokenVersion) {
        req.admin = decoded;
      }
    }
  } catch (error) {
    // Token is invalid/expired, continue as unauthenticated guest
  }
  next();
};

module.exports = { anyAuthMiddleware, optionalAuthMiddleware };
