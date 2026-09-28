// Splits an order's adminNotes into the free-text notes and the customer's
// accept/decline response line, which the backend writes in German or Arabic.
export const parseOrderNotes = (adminNotes, language) => {
  if (!adminNotes) return { customNotes: '', customerResponse: null };
  const isAr = language === 'ar';
  const lines = String(adminNotes).split('\n').map((l) => l.trim()).filter(Boolean);
  let customerResponse = null;
  const otherLines = [];

  for (const line of lines) {
    // Check for acceptance in either German or Arabic
    const acceptMatch = line.match(/\[(?:Kunde hat Änderung akzeptiert am|وافق العميل على التعديل بتاريخ|وافق العميل على التعديل في)\s*(.*?)\]/i);
    if (acceptMatch) {
      customerResponse = {
        type: 'accepted',
        date: acceptMatch[1],
        label: isAr
          ? `وافق العميل على التعديل (${acceptMatch[1]})`
          : `Kunde hat Änderung akzeptiert (${acceptMatch[1]})`
      };
      continue;
    }

    // Check for decline in either German or Arabic
    const declineMatch = line.match(/\[(?:Kunde hat Änderung abgelehnt und Bestellung storniert am|رفض العميل التعديل وتم إلغاء الطلب بتاريخ|رفض العميل التعديل وتم إلغاء الطلب في)\s*(.*?)\]/i);
    if (declineMatch) {
      customerResponse = {
        type: 'declined',
        date: declineMatch[1],
        label: isAr
          ? `رفض العميل التعديل وتم إلغاء الطلب (${declineMatch[1]})`
          : `Kunde hat Änderung abgelehnt & storniert (${declineMatch[1]})`
      };
      continue;
    }

    otherLines.push(line);
  }

  return {
    customNotes: otherLines.join('\n'),
    customerResponse
  };
};
