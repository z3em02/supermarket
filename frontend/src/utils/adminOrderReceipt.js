// Printable admin invoices for an order: a full A4 page and a compact
// 80mm thermal-printer receipt. Used by pages/Orders.jsx.
import { escapeHtml } from './printDocument';

export const buildA4ReceiptHtml = (order, language) => {
  const isAr = language === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const total = Number(order.totalAmount);

  const itemsHtml = (order.orderItems || []).map((item) => {
    const rawName = (isAr ? item.product?.nameAr : item.product?.nameDe) || item.product?.name || item.productId;
    const name = escapeHtml(rawName);
    const sku = escapeHtml(item.product?.sku || '—');
    const subtotal = Number(item.subtotal);
    const unitPrice = item.quantity > 0 ? subtotal / item.quantity : 0;
    return `
      <tr>
        <td style="padding:8px 10px;font-weight:600">${name}</td>
        <td style="padding:8px 10px;text-align:center">${sku}</td>
        <td style="padding:8px 10px;text-align:right">€${unitPrice.toFixed(2)}</td>
        <td style="padding:8px 10px;text-align:center;font-weight:700">${item.quantity}</td>
        <td style="padding:8px 10px;text-align:right;font-weight:700">€${subtotal.toFixed(2)}</td>
      </tr>`;
  }).join('');

  const labelProduct   = isAr ? 'المنتج'            : 'Artikel';
  const labelSku       = isAr ? 'الرقم'             : 'Art-Nr.';
  const labelUnit      = isAr ? 'سعر الوحدة'        : 'Einzelpreis';
  const labelQty       = isAr ? 'الكمية'            : 'Menge';
  const labelSubtotal  = isAr ? 'المجموع'           : 'Betrag';
  const labelGross     = isAr ? 'المجموع الكلي'     : 'Gesamtbetrag';
  const labelSubtotalGross = isAr ? 'المجموع الفرعي' : 'Zwischensumme';
  const labelCoupon    = isAr ? 'كوبون الخصم'       : 'Gutschein';
  const labelPromo     = isAr ? 'خصم العروض'        : 'Aktionsrabatt';
  const labelDeliveryFee = isAr ? 'رسوم التوصيل'    : 'Liefergebühr';
  const labelBilledTo  = isAr ? 'فاتورة إلى'       : 'Rechnungsempfänger';
  const labelDelivery  = isAr ? 'عنوان التسليم'    : 'Lieferadresse';
  const labelInvoice   = isAr ? 'فاتورة'            : 'Rechnung';
  const labelOrder     = isAr ? 'رقم الطلب'        : 'Bestellnummer';
  const labelDate      = isAr ? 'التاريخ'           : 'Datum';
  const labelNotes     = isAr ? 'ملاحظات'           : 'Hinweise';
  const labelAdminNote = isAr ? 'ملاحظة داخلية'    : 'Interne Notiz';

  const html = `<!DOCTYPE html>
<html lang="${language}" dir="${dir}">
<head>
<meta charset="UTF-8"/>
<title>${labelInvoice} – INV-${order.id.slice(0,8).toUpperCase()}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:${isAr ? "'Noto Sans Arabic', Arial, sans-serif" : "Arial, sans-serif"};font-size:12px;color:#111;background:#fff;direction:${dir};padding:32px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:2px solid #2563eb;margin-bottom:18px}
  .brand{font-size:20px;font-weight:800;color:#1e3a8a;letter-spacing:-0.5px}
  .brand-sub{color:#6b7280;font-size:11px;margin-top:3px}
  .badge{display:inline-block;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;text-transform:uppercase}
  .meta{margin-bottom:18px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .meta-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px}
  .meta-box h4{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:6px}
  .meta-box p{font-size:12px;color:#111;line-height:1.6}
  .meta-box p strong{font-weight:700}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  thead tr{background:#1e3a8a;color:#fff}
  thead th{padding:9px 10px;font-size:11px;font-weight:700;text-align:start}
  thead th:not(:first-child){text-align:center}
  thead th:last-child,thead th:nth-child(3){text-align:end}
  tbody tr{border-bottom:1px solid #e2e8f0}
  tbody tr:nth-child(even){background:#f8fafc}
  .totals{display:flex;justify-content:flex-end;margin-bottom:16px}
  .totals-box{width:240px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
  .totals-row{display:flex;justify-content:space-between;padding:7px 12px;font-size:12px}
  .totals-row:not(:last-child){border-bottom:1px solid #f1f5f9}
  .totals-row.total{background:#1e3a8a;color:#fff;font-weight:800;font-size:13px}
  .notes-box{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;font-size:11px;color:#78350f;margin-bottom:12px}
  .footer{text-align:center;color:#94a3b8;font-size:10px;border-top:1px solid #e2e8f0;padding-top:14px;margin-top:8px}
  @media print{body{padding:0 16px}@page{margin:16mm}}
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="brand">Supermarkt Lieferservice</div>
    <div class="brand-sub">Hauszustellung &amp; Frische Produkte</div>
    <div class="brand-sub" style="margin-top:4px">${labelInvoice} Ref: INV-${order.id.slice(0,8).toUpperCase()}</div>
  </div>
  <div style="text-align:${isAr?'left':'right'}">
    <div class="badge">${escapeHtml(order.status || '—')}</div>
    <div style="color:#6b7280;font-size:11px;margin-top:6px">${labelDate}: ${new Date(order.createdAt).toLocaleDateString(isAr?'ar-DE':'de-DE',{year:'numeric',month:'long',day:'numeric'})}</div>
    <div style="color:#6b7280;font-size:11px">${labelOrder}: #${order.id.slice(0,8).toUpperCase()}</div>
  </div>
</div>

<div class="meta">
  <div class="meta-box">
    <h4>${labelBilledTo}</h4>
    <p><strong>${escapeHtml(order.customer?.name || order.customerName || '—')}</strong></p>
    ${(order.customer?.phone || order.customerPhone) ? `<p>${escapeHtml(order.customer?.phone || order.customerPhone)}</p>` : ''}
  </div>
  <div class="meta-box">
    <h4>${labelDelivery}</h4>
    <p>${escapeHtml(order.deliveryAddress || order.customer?.address || '—')}</p>
    ${order.notes ? `<p style="font-size:11px;color:#6b7280;margin-top:4px;"><strong>Hinweis:</strong> ${escapeHtml(order.notes)}</p>` : ''}
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="text-align:${isAr?'right':'left'}">${labelProduct}</th>
      <th style="text-align:center">${labelSku}</th>
      <th style="text-align:${isAr?'left':'right'}">${labelUnit}</th>
      <th style="text-align:center">${labelQty}</th>
      <th style="text-align:${isAr?'left':'right'}">${labelSubtotal}</th>
    </tr>
  </thead>
  <tbody>${itemsHtml}</tbody>
</table>

<div class="totals">
  <div class="totals-box">
    ${Number(order.itemsSubtotal) > 0 && (Number(order.couponDiscount) > 0 || Number(order.promotionDiscount) > 0) ? `
    <div class="totals-row"><span>${labelSubtotalGross}</span><span>€${Number(order.itemsSubtotal).toFixed(2)}</span></div>
    ` : ''}
    ${Number(order.promotionDiscount) > 0 ? `
    <div class="totals-row" style="color:#e11d48"><span>${labelPromo}</span><span>-€${Number(order.promotionDiscount).toFixed(2)}</span></div>
    ` : ''}
    ${Number(order.couponDiscount) > 0 ? `
    <div class="totals-row" style="color:#7c3aed"><span>${labelCoupon}${order.couponCode ? ` (${escapeHtml(order.couponCode)})` : ''}</span><span>-€${Number(order.couponDiscount).toFixed(2)}</span></div>
    ` : ''}
    ${Number(order.deliveryFee) > 0 ? `
    <div class="totals-row"><span>${labelDeliveryFee}</span><span>€${Number(order.deliveryFee).toFixed(2)}</span></div>
    ` : ''}
    <div class="totals-row total"><span>${labelGross}</span><span>€${total.toFixed(2)}</span></div>
  </div>
</div>

${order.notes ? `<div class="notes-box"><strong>${labelNotes}:</strong> ${escapeHtml(order.notes)}</div>` : ''}
${order.adminNotes ? `<div class="notes-box" style="background:#faf5ff;border-color:#c4b5fd;color:#4c1d95"><strong>${labelAdminNote}:</strong> ${escapeHtml(order.adminNotes)}</div>` : ''}

<div class="footer">Supermarkt Lieferservice &bull; INV-${order.id.slice(0,8).toUpperCase()} &bull; ${new Date(order.createdAt).toLocaleDateString()}</div>
</body>
</html>`;

  return html;
};

// Compact single-column layout for an 80mm thermal receipt printer —
// no multi-column table, no color, dashed-line separators, monospace.
export const buildThermalReceiptHtml = (order, language) => {
  const isAr = language === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const total = Number(order.totalAmount);

  const labelGross     = isAr ? 'المجموع الكلي'     : 'Gesamtbetrag';
  const labelSubtotalGross = isAr ? 'المجموع الفرعي' : 'Zwischensumme';
  const labelCoupon    = isAr ? 'كوبون الخصم'       : 'Gutschein';
  const labelPromo     = isAr ? 'خصم العروض'        : 'Aktionsrabatt';
  const labelDeliveryFee = isAr ? 'رسوم التوصيل'    : 'Liefergebühr';
  const labelDelivery  = isAr ? 'عنوان التسليم'    : 'Lieferadresse';
  const labelInvoice   = isAr ? 'فاتورة'            : 'Rechnung';
  const labelOrder     = isAr ? 'رقم الطلب'        : 'Bestellnummer';
  const labelDate      = isAr ? 'التاريخ'           : 'Datum';
  const labelNotes     = isAr ? 'ملاحظات'           : 'Hinweise';
  const thanks         = isAr ? 'شكراً لتسوقكم معنا!' : 'Danke für Ihren Einkauf!';

  const itemsHtml = (order.orderItems || []).map((item) => {
    const rawName = (isAr ? item.product?.nameAr : item.product?.nameDe) || item.product?.name || item.productId;
    const name = escapeHtml(rawName);
    const subtotal = Number(item.subtotal);
    const unitPrice = item.quantity > 0 ? subtotal / item.quantity : 0;
    return `
      <div class="item">
        <div class="item-name">${name}</div>
        <div class="item-line"><span>${item.quantity} x €${unitPrice.toFixed(2)}</span><span>€${subtotal.toFixed(2)}</span></div>
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="${language}" dir="${dir}">
<head>
<meta charset="UTF-8"/>
<title>${labelInvoice} – INV-${order.id.slice(0,8).toUpperCase()}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Courier New',${isAr ? "'Noto Sans Arabic'," : ''}monospace;font-size:12px;color:#000;background:#fff;direction:${dir};width:76mm;padding:2mm}
  .center{text-align:center}
  .brand{font-size:15px;font-weight:800}
  .sub{font-size:10px;margin-top:2px}
  .dashed{border-top:1px dashed #000;margin:6px 0}
  .row{display:flex;justify-content:space-between;font-size:11px;padding:1px 0}
  .item{margin:4px 0}
  .item-name{font-weight:700;font-size:11px}
  .item-line{display:flex;justify-content:space-between;font-size:11px}
  .totals-row{display:flex;justify-content:space-between;font-size:11px;padding:1px 0}
  .totals-row.total{font-weight:800;font-size:13px;border-top:1px dashed #000;margin-top:4px;padding-top:4px}
  .notes{font-size:10px;margin-top:6px}
  .footer{text-align:center;font-size:10px;margin-top:10px}
  @media print{body{width:auto}@page{size:80mm auto;margin:2mm}}
</style>
</head>
<body>
<div class="center">
  <div class="brand">Supermarkt Lieferservice</div>
  <div class="sub">${labelInvoice} INV-${order.id.slice(0,8).toUpperCase()}</div>
  <div class="sub">${labelDate}: ${new Date(order.createdAt).toLocaleDateString(isAr?'ar-DE':'de-DE')}</div>
  <div class="sub">${labelOrder}: #${order.id.slice(0,8).toUpperCase()}</div>
</div>

<div class="dashed"></div>

<div>${escapeHtml(order.customer?.name || order.customerName || '—')}</div>
${(order.customer?.phone || order.customerPhone) ? `<div class="sub">${escapeHtml(order.customer?.phone || order.customerPhone)}</div>` : ''}
<div class="sub" style="margin-top:4px">${labelDelivery}: ${escapeHtml(order.deliveryAddress || order.customer?.address || '—')}</div>

<div class="dashed"></div>

${itemsHtml}

<div class="dashed"></div>

${Number(order.itemsSubtotal) > 0 && (Number(order.couponDiscount) > 0 || Number(order.promotionDiscount) > 0) ? `
<div class="totals-row"><span>${labelSubtotalGross}</span><span>€${Number(order.itemsSubtotal).toFixed(2)}</span></div>
` : ''}
${Number(order.promotionDiscount) > 0 ? `
<div class="totals-row"><span>${labelPromo}</span><span>-€${Number(order.promotionDiscount).toFixed(2)}</span></div>
` : ''}
${Number(order.couponDiscount) > 0 ? `
<div class="totals-row"><span>${labelCoupon}${order.couponCode ? ` (${escapeHtml(order.couponCode)})` : ''}</span><span>-€${Number(order.couponDiscount).toFixed(2)}</span></div>
` : ''}
${Number(order.deliveryFee) > 0 ? `
<div class="totals-row"><span>${labelDeliveryFee}</span><span>€${Number(order.deliveryFee).toFixed(2)}</span></div>
` : ''}
<div class="totals-row total"><span>${labelGross}</span><span>€${total.toFixed(2)}</span></div>

${order.notes ? `<div class="notes"><strong>${labelNotes}:</strong> ${escapeHtml(order.notes)}</div>` : ''}

<div class="footer">${thanks}</div>
</body>
</html>`;

  return html;
};
