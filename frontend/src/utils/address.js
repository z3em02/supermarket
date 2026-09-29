// Mirrors backend utils/validation.js isCompleteDeliveryAddress: a street/place
// name (3+ letters) and a 4-5 digit postal code. The server enforces it too;
// this just tells the customer before they press "Bestellen".
export const isCompleteDeliveryAddress = (address) => {
  const a = String(address || '').trim();
  return a.length >= 8 && /\p{L}{3,}/u.test(a) && /(^|\D)\d{4,5}(\D|$)/.test(a);
};
