const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../lib/config');
const prisma = require('../lib/prisma');

const customerAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.header('Authorization');
    // #38 fix: support HttpOnly cookie or Authorization Bearer header
    const token = req.cookies?.customer_token || (authHeader?.startsWith('Bearer ') ? authHeader.replace(/^Bearer\s+/, '').trim() : null);

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. No token provided.' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'customer') {
      return res.status(403).json({ error: 'Access denied. Customer account required.' });
    }

    // #23 fix: verify tokenVersion against DB to enforce revocation on password
    // change/logout. A token missing the claim is rejected (fail-closed), same
    // as authMiddleware — otherwise a pre-migration token could bypass
    // revocation on these routes forever.
    const customer = await prisma.customer.findUnique({
      where: { id: decoded.customerId },
      select: { tokenVersion: true }
    });
    if (!customer || decoded.tokenVersion === undefined || customer.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ error: 'Session invalidated. Please log in again.' });
    }

    req.customer = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired customer session' });
  }
};

module.exports = {
  customerAuthMiddleware
};
