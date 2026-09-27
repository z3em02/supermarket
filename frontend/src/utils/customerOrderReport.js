// The customer-facing printable order report ("Bestellbericht") shown from
// the customer account page. Separate from the admin invoices in
// adminOrderReceipt.js on purpose: different audience, branding and fields.
import { escapeHtml } from './printDocument';
import { formatDeliverySlot } from './deliverySlot';

export const buildCustomerOrderReportHtml = (order, { language, storeName, customer }) => {
  const isArabic = language === 'ar';
  const dir = isArabic ? 'rtl' : 'ltr';
  const itemsSubtotal = Number(order.itemsSubtotal) || (order.orderItems || []).reduce(
    (sum, item) => sum + Number(item.subtotal ?? item.price * item.quantity), 0
  );
  const promotionDiscount = Number(order.promotionDiscount || 0);
  const couponDiscount = Number(order.couponDiscount || 0);
  const deliveryFeeCharged = Number(order.deliveryFee ?? Math.max(0, Number(order.totalAmount) - (itemsSubtotal - promotionDiscount - couponDiscount)));

  const itemsHtml = (order.orderItems || []).map((item, idx) => {
    const rawName = (isArabic ? item.product?.nameAr : item.product?.nameDe) || item.product?.name || item.productId;
    const name = escapeHtml(rawName);
    const sku = escapeHtml(item.product?.sku || '—');
    const subtotal = Number(item.subtotal || item.price * item.quantity);
    const unitPrice = item.quantity > 0 ? subtotal / item.quantity : 0;
    return `
      <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
        <td style="padding: 9px 12px; font-weight: 600;">
          ${name}
          ${sku !== '—' ? `<span style="display:block;font-size:10px;color:#94a3b8;font-family:monospace;">Art.-Nr. ${sku}</span>` : ''}
        </td>
        <td style="padding: 9px 8px; text-align: center; font-weight: 700;">${item.quantity}×</td>
        <td style="padding: 9px 8px; text-align: ${isArabic ? 'left' : 'right'}; font-family: monospace;">€${unitPrice.toFixed(2)}</td>
        <td style="padding: 9px 12px; text-align: ${isArabic ? 'left' : 'right'}; font-family: monospace; font-weight: 800;">€${subtotal.toFixed(2)}</td>
      </tr>`;
  }).join('');

  const statusMap = {
    pending:                   { de: 'Eingegangen', ar: 'قيد المراجعة' },
    accepted:                  { de: 'Bestätigt & In Vorbereitung', ar: 'تم تأكيد الطلب' },
    preparing:                 { de: 'In Vorbereitung', ar: 'جاري التجهيز' },
    out_for_delivery:          { de: 'Unterwegs zur Haustür', ar: 'في طريق التوصيل' },
    shipped:                   { de: 'Versendet', ar: 'تم الشحن' },
    delivered:                 { de: 'Zugestellt', ar: 'تم التوصيل' },
    declined:                  { de: 'Storniert', ar: 'ملغي' },
    cancelled:                 { de: 'Storniert', ar: 'ملغي' },
    pending_customer_approval: { de: 'Änderung offen', ar: 'بانتظار الموافقة' }
  };

  const statusText = (statusMap[order.status?.toLowerCase()] || {})[isArabic ? 'ar' : 'de'] || order.status;
  const orderNum = order.id.slice(0, 8).toUpperCase();
  const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString(isArabic ? 'ar-EG' : 'de-DE', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : '';

  const html = `<!DOCTYPE html>
<html lang="${language}" dir="${dir}">
<head>
<meta charset="UTF-8"/>
<title>Bestellbericht – #${orderNum}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: ${isArabic ? "'Noto Sans Arabic', Arial, sans-serif" : "Arial, sans-serif"}; font-size: 12px; color: #1e293b; background: #fff; direction: ${dir}; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 2px solid #16a34a; margin-bottom: 16px; }
  .brand { font-size: 20px; font-weight: 800; color: #166534; }
  .brand-sub { color: #64748b; font-size: 11px; margin-top: 3px; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; background: #dcfce7; color: #166534; border: 1px solid #86efac; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
  .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; }
  .meta-box h4 { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
  .meta-box p { font-size: 12px; line-height: 1.6; color: #1e293b; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; border-radius: 8px; overflow: hidden; }
  thead tr { background: #166534; color: #fff; }
  thead th { padding: 9px 12px; font-size: 11px; font-weight: 700; text-align: ${isArabic ? 'right' : 'left'}; }
  thead th.center { text-align: center; }
  thead th.end { text-align: ${isArabic ? 'left' : 'right'}; }
  .totals { display: flex; justify-content: flex-end; margin-top: 10px; }
  .totals-box { width: 260px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; font-size: 12px; }
  .totals-row { display: flex; justify-content: space-between; padding: 8px 12px; }
  .totals-row:not(:last-child) { border-bottom: 1px solid #f1f5f9; }
  .totals-row.total { background: #166534; color: #fff; font-weight: 800; font-size: 14px; }
  .footer-note { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8; }
  @media print {
    body { padding: 0; }
    @page { size: A4 portrait; margin: 12mm; }
  }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="brand">${escapeHtml(storeName)}</div>
    <div class="brand-sub">${isArabic ? 'خدمة التوصيل المنزلي السريع' : 'Lieferservice &amp; Hauszustellung'}</div>
    <div class="brand-sub" style="margin-top: 4px; font-weight: 700;">${isArabic ? 'تقرير الطلب الرسمي' : 'Offizieller Bestellbericht'} #${orderNum}</div>
  </div>
  <div style="text-align: ${isArabic ? 'left' : 'right'};">
    <div class="badge">${escapeHtml(statusText)}</div>
    <div style="color: #64748b; font-size: 11px; margin-top: 6px;">${orderDate}</div>
    <div style="color: #16a34a; font-weight: 700; font-size: 11px; margin-top: 2px;">${isArabic ? 'الدفع عند الاستلام' : 'Barzahlung bei Lieferung'}</div>
  </div>
</div>

<div class="meta">
  <div class="meta-box">
    <h4>${isArabic ? 'بيانات العميل' : 'Kunde'}</h4>
    <p><strong>${escapeHtml(order.customerName || order.customer?.name || customer?.name || '—')}</strong></p>
    ${(order.customerPhone || customer?.phone) ? `<p>Tel: ${escapeHtml(order.customerPhone || customer?.phone)}</p>` : ''}
    ${(order.customerEmail || customer?.email) ? `<p>E-Mail: ${escapeHtml(order.customerEmail || customer?.email)}</p>` : ''}
  </div>
  <div class="meta-box">
    <h4>${isArabic ? 'عنوان التسليم والتعليمات' : 'Lieferadresse &amp; Hinweise'}</h4>
    <p>${escapeHtml(order.deliveryAddress || '—')}</p>
    ${order.deliverySlot && formatDeliverySlot(order.deliverySlot, isArabic) ? `<p style="margin-top:4px;"><strong>${isArabic ? 'موعد التوصيل:' : 'Lieferzeitfenster:'}</strong> ${escapeHtml(formatDeliverySlot(order.deliverySlot, isArabic))}</p>` : ''}
    ${order.deliveryNotes ? `<p style="font-style:italic;color:#475569;margin-top:4px;"><strong>${isArabic ? 'ملاحظة:' : 'Hinweis:'}</strong> ${escapeHtml(order.deliveryNotes)}</p>` : ''}
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>${isArabic ? 'المنتج' : 'Artikel'}</th>
      <th class="center">${isArabic ? 'الكمية' : 'Menge'}</th>
      <th class="end">${isArabic ? 'سعر الوحدة' : 'Einzelpreis'}</th>
      <th class="end">${isArabic ? 'الإجمالي' : 'Gesamt'}</th>
    </tr>
  </thead>
  <tbody>
    ${itemsHtml}
  </tbody>
</table>

<div class="totals">
  <div class="totals-box">
    ${itemsSubtotal > 0 && (promotionDiscount > 0 || couponDiscount > 0) ? `
    <div class="totals-row">
      <span>${isArabic ? 'المجموع الفرعي:' : 'Zwischensumme:'}</span>
      <span style="font-family: monospace;">€${itemsSubtotal.toFixed(2)}</span>
    </div>` : ''}
    ${promotionDiscount > 0 ? `
    <div class="totals-row" style="color:#e11d48">
      <span>${isArabic ? 'خصم العروض:' : 'Aktionsrabatt:'}</span>
      <span style="font-family: monospace;">-€${promotionDiscount.toFixed(2)}</span>
    </div>` : ''}
    ${couponDiscount > 0 ? `
    <div class="totals-row" style="color:#7c3aed">
      <span>${isArabic ? 'كوبون الخصم:' : 'Gutschein:'} ${order.couponCode ? `(${escapeHtml(order.couponCode)})` : ''}</span>
      <span style="font-family: monospace;">-€${couponDiscount.toFixed(2)}</span>
    </div>` : ''}
    <div class="totals-row">
      <span>${isArabic ? 'رسوم التوصيل:' : 'Liefergebühr:'}</span>
      <strong style="color:#16a34a;">${deliveryFeeCharged > 0 ? `€${deliveryFeeCharged.toFixed(2)}` : (isArabic ? 'مجاناً (0.00 €)' : 'Kostenlos (0,00 €)')}</strong>
    </div>
    <div class="totals-row total">
      <span>${isArabic ? 'المجموع عند الاستلام:' : 'Gesamtbetrag:'}</span>
      <span>€${Number(order.totalAmount).toFixed(2)}</span>
    </div>
  </div>
</div>

<div class="footer-note">
  ${isArabic 
    ? `تم إصدار هذا التقرير تلقائياً من ${escapeHtml(storeName)} كإيصال رسمي للطلب والتوصيل.`
    : `Dieser Beleg wurde automatisch von ${escapeHtml(storeName)} als offizieller Bestell- &amp; Lieferschein erstellt.`}
</div>
</body>
</html>`;

  return html;
};
