const prisma = require('./prisma');

// Fire-and-forget audit entry for admin access to customer data. Never
// blocks or fails the request it's called from.
const logAudit = (adminEmail, action, detail) => {
  prisma.auditLog
    .create({ data: { adminEmail: adminEmail || 'unknown', action, detail } })
    .catch((err) => console.error('Audit log write failed:', err));
};

module.exports = { logAudit };
