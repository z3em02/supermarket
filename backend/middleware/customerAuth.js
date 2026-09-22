const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../lib/config');

const customerAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. No token provided.' });
    }

    const token = authHeader.replace(/^Bearer\s+/, '').trim();
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'customer') {
      return res.status(403).json({ error: 'Access denied. Customer account required.' });
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
