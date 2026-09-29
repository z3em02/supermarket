require('dotenv').config();
const { PrismaClient, Prisma } = require('@prisma/client');

// Money columns are stored as DECIMAL(10,2) so amounts are exact to the cent
// in the database (sums, reports, accounting). Prisma returns those as
// Prisma.Decimal objects, which JSON-serialize as strings and don't work
// with + / * — so every query result is converted back to plain numbers
// here, keeping controllers and the frontend unchanged. Arithmetic on those
// numbers must round through utils/money.js (roundMoney), never toFixed.
const decimalsToNumbers = (value) => {
  if (value === null || typeof value !== 'object') return value;
  if (Prisma.Decimal.isDecimal(value)) return value.toNumber();
  if (Array.isArray(value)) return value.map(decimalsToNumbers);
  if (value instanceof Date || Buffer.isBuffer(value)) return value;
  const out = {};
  for (const key of Object.keys(value)) out[key] = decimalsToNumbers(value[key]);
  return out;
};

// SQL query logging is opt-in (PRISMA_LOG_QUERIES=true): printing every
// query in development buried the server's own log lines.
const basePrisma = new PrismaClient({
  log: process.env.PRISMA_LOG_QUERIES === 'true'
    ? ['query', 'error', 'warn']
    : ['error', 'warn']
});

const prisma = basePrisma.$extends({
  name: 'decimalsToNumbers',
  query: {
    async $allOperations({ args, query }) {
      return decimalsToNumbers(await query(args));
    }
  }
});

module.exports = prisma;
module.exports.decimalsToNumbers = decimalsToNumbers;
