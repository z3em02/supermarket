const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../lib/config');
const prisma = require('../lib/prisma');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  // #38 fix: support HttpOnly cookie or Authorization Bearer header
  const token = req.cookies?.token || (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

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

module.exports = { authMiddleware };
