const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../lib/config');

const anyAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.replace(/^Bearer\s+/, '').trim();

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role === 'customer') {
      req.customer = decoded;
    } else {
      req.admin = decoded;
    }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const optionalAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.replace(/^Bearer\s+/, '').trim();

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role === 'customer') {
      req.customer = decoded;
    } else {
      req.admin = decoded;
    }
  } catch (error) {
    // Token is invalid/expired, continue as unauthenticated guest
  }
  next();
};

module.exports = { anyAuthMiddleware, optionalAuthMiddleware };
