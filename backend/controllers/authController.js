const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { JWT_SECRET } = require('../lib/config');

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

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

const createAdmin = async (req, res) => {
  try {
    const existing = await prisma.admin.count();
    if (existing > 0) {
      return res.status(403).json({ error: 'An admin account already exists' });
    }

    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const admin = await prisma.admin.create({
      data: { email, password: hashed, name }
    });

    res.status(201).json({
      id: admin.id,
      email: admin.email,
      name: admin.name
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Could not create admin' });
  }
};

module.exports = { login, createAdmin };
