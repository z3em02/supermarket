// Pure helpers for the admin Orders list search and the stale-edit check.
// Kept out of the controllers so they're unit-tested (tests/orderSearch.test.js).

const normalize = (value) => (value == null ? '' : String(value)).toLowerCase();

// Does an order (with customer PII already decrypted) match the search text?
// Covers order number, driver, customer name (snapshot + account), phone and
// address — the fields an admin actually types into the search box.
const orderMatchesSearch = (order, query) => {
  const q = normalize(query).trim();
  if (!q) return true;
  const fields = [
    order.id,
    order.assignedDriverName,
    order.customerName,
    order.customer?.name,
    order.customerPhone,
    order.deliveryAddress
  ];
  // Phone numbers are typed with or without spaces/dashes: also compare digits only.
  const qDigits = q.replace(/\D/g, '');
  return fields.some((f) => {
    const v = normalize(f);
    if (v.includes(q)) return true;
    return qDigits.length >= 3 && q.replace(/[\s\-/+()]/g, '') === qDigits && v.replace(/\D/g, '').includes(qDigits);
  });
};

// The client sends the updatedAt of the order it's looking at; if the order
// changed since, its edit would overwrite someone else's change -> 409.
// Absent/invalid expected value = no check (older clients, list quick actions).
const isStaleOrderVersion = (currentUpdatedAt, expectedUpdatedAt) => {
  if (expectedUpdatedAt === undefined || expectedUpdatedAt === null || expectedUpdatedAt === '') return false;
  const expected = new Date(expectedUpdatedAt);
  if (Number.isNaN(expected.getTime())) return false;
  return new Date(currentUpdatedAt).getTime() !== expected.getTime();
};

const STALE_ORDER_MESSAGE = 'Diese Bestellung wurde inzwischen geändert. Bitte neu laden und erneut versuchen. / This order was changed in the meantime. Please reload and try again.';

module.exports = { orderMatchesSearch, isStaleOrderVersion, STALE_ORDER_MESSAGE };
