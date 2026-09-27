const { Prisma } = require('@prisma/client');

// Rounds a euro amount to cents, half-up, the way a customer would expect
// (2.005 € * 3 = 6.015 € -> 6.02 €). Plain toFixed(2) / Math.round(x * 100)
// get this wrong because 6.015 is stored as 6.01499999... in binary
// floating point. toPrecision(15) first drops that representation noise,
// then decimal.js (shipped with Prisma) does the actual rounding.
const roundMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return new Prisma.Decimal(n.toPrecision(15))
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
    .toNumber();
};

module.exports = { roundMoney };
