const prisma = require('../lib/prisma');

const listAuditLog = async (req, res) => {
  try {
    const take = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const entries = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take
    });
    res.json(entries);
  } catch (error) {
    console.error('List audit log error:', error);
    res.status(500).json({ error: 'Failed to load audit log' });
  }
};

module.exports = { listAuditLog };
