const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'b2b-supermarket-secret-key-2024-change-in-production';

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role && decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin access required.' });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { authMiddleware };
