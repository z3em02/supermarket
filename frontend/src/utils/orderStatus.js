const STATUS_LABELS = {
  pending: { de: 'Ausstehend', ar: 'قيد الانتظار' },
  pending_customer_approval: { de: 'Wartet auf Kunde', ar: 'بانتظار موافقة العميل' },
  accepted: { de: 'Angenommen', ar: 'مقبول' },
  confirmed: { de: 'Angenommen', ar: 'مقبول' },
  preparing: { de: 'Wird vorbereitet', ar: 'جارٍ التجهيز' },
  shipped: { de: 'Versandt', ar: 'تم الشحن' },
  out_for_delivery: { de: 'In Zustellung', ar: 'جاري التوصيل للمنزل' },
  delivered: { de: 'Geliefert', ar: 'تم التوصيل' },
  declined: { de: 'Abgelehnt', ar: 'مرفوض' },
  rejected: { de: 'Abgelehnt', ar: 'مرفوض' },
  decline: { de: 'Abgelehnt', ar: 'مرفوض' },
  canceled: { de: 'Storniert', ar: 'ملغي' },
  cancelled: { de: 'Storniert', ar: 'ملغي' },
  completed: { de: 'Abgeschlossen', ar: 'مكتمل' }
};

export const getOrderStatusLabel = (status, language) => {
  const key = (status || '').toLowerCase();
  const entry = STATUS_LABELS[key];
  if (!entry) return status || '';
  return language === 'ar' ? entry.ar : entry.de;
};
