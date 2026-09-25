const prisma = require('../lib/prisma');

const listAuditLog = async (req, res) => {
  try {
    const take = Math.min(parseInt(req.query.limit, 10) || 150, 500);
    const { action, search } = req.query;

    const where = {};
    if (action && action !== 'all') {
      where.action = action;
    }
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { adminEmail: { contains: q, mode: 'insensitive' } },
        { action: { contains: q, mode: 'insensitive' } },
        { detail: { contains: q, mode: 'insensitive' } }
      ];
    }

    const entries = await prisma.auditLog.findMany({
      where,
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
