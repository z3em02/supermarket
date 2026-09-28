// Phone/address are PII shown to whoever is at the admin screen (incl. a
// delivery person prepping an order) — masked by default, click to reveal.
export const maskPhone = (phone) => {
  if (!phone) return '—';
  const digits = phone.replace(/\s+/g, '');
  const visible = digits.slice(-3);
  return `${'•'.repeat(Math.max(digits.length - 3, 4))}${visible}`;
};

export const maskAddress = (address) => {
  if (!address) return '';
  return '•'.repeat(Math.min(Math.max(address.length, 10), 28));
};
