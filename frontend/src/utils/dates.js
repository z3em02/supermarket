// "YYYY-MM-DD" for an <input type="date">, in the browser's local time — the
// calendar day the admin actually picked. Splitting the stored ISO string at
// "T" gives the UTC day instead, which is a day early for anything stored as
// local midnight (e.g. a coupon starting 00:00 in Vienna = 22:00Z the day before).
export const toDateInputValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
