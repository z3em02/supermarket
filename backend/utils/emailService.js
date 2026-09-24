const nodemailer = require('nodemailer');
const prisma = require('../lib/prisma');
const { formatDeliverySlot } = require('./deliverySlot');

// Customer-supplied strings (name, delivery address/notes) are interpolated
// directly into HTML emails below; escape them so a malicious value can't
// break the email markup or inject content.
const escapeHtml = (value) => {
  if (value == null) return value;
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const isEmailConfigured = () =>
  Boolean(
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASSWORD &&
    !process.env.EMAIL_PASSWORD.includes('your-app') &&
    !process.env.EMAIL_USER.includes('your-email')
  );

const getStoreSettings = async () => {
  try {
    const s = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    if (s) return s;
  } catch {}
  return {
    storeName: 'Hajar Supermarkt',
    storeNameDe: 'Hajar Supermarkt',
    storeNameAr: 'سوبرماركت هاجر',
    logoUrl: '',
    phone: '+49 123 4567890',
    email: 'info@hajar-supermarkt.de',
    address: 'Musterstraße 123, 10115 Berlin'
  };
};


// Delivery fee is folded into order.totalAmount at creation time; derive the
// charged fee back out for display by subtracting the items' own subtotal.
const computeDeliveryFeeCharged = (order) => {
  if (typeof order?.deliveryFee === 'number') {
    return order.deliveryFee;
  }
  const itemsSubtotal = (order?.orderItems || []).reduce(
    (sum, item) => sum + Number(item.subtotal ?? item.price * item.quantity), 0
  );
  const fee = Number(order?.totalAmount || 0) - itemsSubtotal;
  return fee > 0.001 ? fee : 0;
};

const getTransporter = () => {
  if (!isEmailConfigured()) return null;
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

/**
 * Mobile-First Responsive Email Wrapper
 * Optimized for smartphones (iOS, Android, Gmail app, Apple Mail, Outlook)
 * Tailored to single chosen language (German OR Arabic)
 */
const emailWrapper = ({ lang = 'de', title, subtitle, contentHtml, settings }) => {
  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const fontFamily = isAr 
    ? "'Segoe UI', Tahoma, 'Noto Sans Arabic', Arial, sans-serif" 
    : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const align = isAr ? 'right' : 'left';
  const localizedStoreName = settings 
    ? (isAr ? settings.storeNameAr : settings.storeNameDe) || settings.storeName 
    : 'Hajar Supermarkt';
  const brandSub = isAr ? 'منصة تجارة وتوزيع الجملة B2B' : 'B2B Großhandel Distributionszentrum';
  const footerNotice = isAr 
    ? `هذه رسالة تلقائية من ${localizedStoreName} &bull; جميع الحقوق محفوظة © ${new Date().getFullYear()}`
    : `Automatische Benachrichtigung von ${localizedStoreName} &bull; Alle Rechte vorbehalten © ${new Date().getFullYear()}`;

  const contactHtml = settings?.phone || settings?.email || settings?.address ? `
    <div style="margin-top: 14px; font-size: 11px; color: #64748b; line-height: 1.8;">
      ${settings.phone ? `<span class="contact-pill" style="display: inline-block; margin: 2px 6px;">📞 <a href="tel:${settings.phone}" style="color: #64748b; text-decoration: none;">${settings.phone}</a></span>` : ''}
      ${settings.email ? `<span class="contact-pill" style="display: inline-block; margin: 2px 6px;">✉️ <a href="mailto:${settings.email}" style="color: #64748b; text-decoration: none;">${settings.email}</a></span>` : ''}
      ${settings.address ? `<div style="margin-top: 4px; color: #94a3b8;">📍 ${settings.address}</div>` : ''}
    </div>
  ` : '';

  const logoHtml = settings?.logoUrl ? `
    <div style="text-align: center; margin-bottom: 14px;">
      <img src="${settings.logoUrl}" alt="${localizedStoreName}" style="max-height: 48px; max-width: 180px; object-fit: contain; background: #ffffff; padding: 6px 12px; border-radius: 12px; display: inline-block;" />
    </div>
  ` : `
    <div class="logo-badge" style="display: inline-block; background: rgba(255, 255, 255, 0.18); border-radius: 10px; padding: 6px 14px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 12px;">${localizedStoreName}</div>
  `;

  return `
<!DOCTYPE html>
<html lang="${lang}" dir="${dir}" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${title}</title>
  <style>
    /* Global Reset */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; min-width: 100% !important; background-color: #f1f5f9; font-family: ${fontFamily}; direction: ${dir}; text-align: ${align}; }
    
    /* Responsive button */
    .btn-primary {
      display: inline-block;
      background: #16a34a;
      color: #ffffff !important;
      text-decoration: none;
      padding: 15px 32px;
      border-radius: 12px;
      font-weight: 800;
      font-size: 15px;
      text-align: center;
      box-shadow: 0 4px 14px rgba(22, 163, 74, 0.35);
      transition: background 0.2s ease;
      min-height: 48px;
      box-sizing: border-box;
      line-height: 20px;
    }
    .btn-blue {
      display: inline-block;
      background: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      padding: 15px 32px;
      border-radius: 12px;
      font-weight: 800;
      font-size: 15px;
      text-align: center;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
      transition: background 0.2s ease;
      min-height: 48px;
      box-sizing: border-box;
      line-height: 20px;
    }

    /* Mobile phone specific optimizations */
    @media only screen and (max-width: 600px) {
      .outer-wrapper { padding: 0 !important; }
      .container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; margin: 0 !important; }
      .header { padding: 24px 16px !important; }
      .header h1 { font-size: 20px !important; line-height: 1.3 !important; }
      .header p { font-size: 12px !important; }
      .body { padding: 22px 16px !important; font-size: 14px !important; }
      
      /* Verification Code Box on Phones */
      .code-box { padding: 16px 10px !important; margin: 18px 0 !important; }
      .code-digits { font-size: 28px !important; letter-spacing: 5px !important; line-height: 1.2 !important; }
      .code-label { font-size: 11px !important; }

      /* Credentials Box on Phones */
      .cred-card { padding: 16px 14px !important; margin: 18px 0 !important; }
      .cred-row { display: block !important; width: 100% !important; margin-bottom: 10px !important; }
      .cred-key { display: block !important; width: 100% !important; font-size: 12px !important; margin-bottom: 2px !important; }
      .cred-val { display: block !important; width: 100% !important; font-size: 14px !important; word-break: break-all !important; }

      /* Buttons on Phones: Full Width, Big Touch Target */
      .btn-primary, .btn-blue {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        padding: 16px 14px !important;
        font-size: 16px !important;
        box-sizing: border-box !important;
        text-align: center !important;
        border-radius: 12px !important;
      }

      /* Order table on Phones */
      .order-table { font-size: 11px !important; }
      .order-table th, .order-table td { padding: 8px 6px !important; }

      .footer { padding: 20px 14px !important; }
      .contact-pill { display: block !important; margin: 4px 0 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: ${fontFamily}; direction: ${dir}; text-align: ${align};">
  <div class="outer-wrapper" style="width: 100%; min-height: 100%; background-color: #f1f5f9; padding: 24px 0; -webkit-text-size-adjust: 100%;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding: 0 8px;">
          <!-- Main Email Container -->
          <div class="container" style="max-width: 600px; width: 100%; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 6px 28px rgba(15, 23, 42, 0.09); border: 1px solid #e2e8f0; text-align: ${align};">
            
            <!-- Email Header -->
            <div class="header" style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
              ${logoHtml}
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.4px; color: #ffffff; line-height: 1.35;">${title}</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.92; color: #dbeafe;">${subtitle || brandSub}</p>
            </div>

            <!-- Email Body Content -->
            <div class="body" style="padding: 32px 24px; direction: ${dir}; text-align: ${align}; line-height: 1.65; color: #334155;">
              ${contentHtml}
            </div>

            <!-- Email Footer -->
            <div class="footer" style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 20px; text-align: center; font-size: 12px; color: #94a3b8;">
              <p style="margin: 0; font-size: 11px; line-height: 1.5;">${footerNotice}</p>
              ${contactHtml}
            </div>

          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
  `;
};

/**
 * Send Order Status Update Email to Customer
 * Includes direct link to customer account for checking order details
 * Sent in the customer's chosen language ('de' or 'ar')
 */
const sendOrderStatusEmail = async (customerEmail, customerName, orderDetails, status, notes, lang = 'de') => {
  customerName = escapeHtml(customerName);
  if (!isEmailConfigured()) {
    console.log(`[Email skipped - SMTP not configured] Order #${orderDetails.id} status '${status}' (${lang}) -> ${customerEmail}`);
    return;
  }

  try {
    const transporter = getTransporter();
    if (!transporter) return;

    const settings = await getStoreSettings();
    const isAr = lang === 'ar';
    const storeName = (isAr ? settings.storeNameAr : settings.storeNameDe) || settings.storeName || 'Hajar Supermarkt';

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const portalUrl = `${frontendUrl}/account`;

    const statusMap = {
      pending:                   { de: 'Eingegangen (Wartet auf Prüfung)', ar: 'تم استلام الطلب (قيد المراجعة)' },
      accepted:                  { de: 'Bestätigt & In Vorbereitung', ar: 'تم تأكيد الطلب وجاري التحضير' },
      preparing:                 { de: 'Wird vorbereitet / Kommissionierung', ar: 'جاري التجهيز والفرز' },
      out_for_delivery:          { de: 'Unterwegs zur Haustür (In Zustellung)', ar: 'في طريق التوصيل إلى منزلك' },
      shipped:                   { de: 'Versendet / Unterwegs', ar: 'تم الشحن وهو في الطريق' },
      delivered:                 { de: 'Erfolgreich zugestellt', ar: 'تم التوصيل بنجاح' },
      declined:                  { de: 'Storniert / Abgelehnt', ar: 'تم إلغاء الطلب' },
      cancelled:                 { de: 'Storniert / Abgelehnt', ar: 'تم إلغاء الطلب' },
      pending_customer_approval: { de: 'Änderung erfordert Ihre Bestätigung', ar: 'تعديل الطلب يتطلب موافقتك' }
    };

    const statusInfo = statusMap[status?.toLowerCase()] || { de: status, ar: status };
    const orderNumber = (orderDetails.id || '').slice(0, 8).toUpperCase();
    const orderDate = orderDetails.createdAt ? new Date(orderDetails.createdAt).toLocaleString(isAr ? 'ar-EG' : 'de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '';

    const isPendingApproval = status?.toLowerCase() === 'pending_customer_approval';
    const title = isPendingApproval 
      ? (isAr ? 'تعديل في طلبك يتطلب موافقتك' : 'Wichtig: Bestelländerung prüfen')
      : (isAr ? `تحديث الطلب #${orderNumber}: ${statusInfo.ar}` : `Bestellbericht #${orderNumber}: ${statusInfo.de}`);
    
    const subtitle = isAr ? `تقرير الطلب الرسمي - ${storeName}` : `Offizieller Bestellbericht - ${storeName}`;
    const subject = isPendingApproval
      ? (isAr ? `⚠️ تعديل في طلبك #${orderNumber} يتطلب موافقتك - ${storeName}` : `⚠️ Wichtig: Änderung an Ihrer Bestellung #${orderNumber} bestätigen - ${storeName}`)
      : (isAr ? `تقرير الطلب #${orderNumber}: ${statusInfo.ar} - ${storeName}` : `Bestellbericht #${orderNumber}: ${statusInfo.de} - ${storeName}`);

    const itemsRows = (orderDetails.orderItems || []).map((item, idx) => {
      const prodName = isAr 
        ? (item.product?.nameAr || item.product?.nameDe || item.product?.name || item.productId)
        : (item.product?.nameDe || item.product?.name || item.productId);
      const sku = item.product?.sku ? `<span style="font-size: 11px; color: #94a3b8; display: block; font-family: monospace;">Art.-Nr. ${item.product.sku}</span>` : '';

      return `
        <tr style="border-bottom: 1px solid #f1f5f9; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 12px 10px; font-size: 13px; color: #1e293b;">
            <div style="font-weight: 700;">${prodName}</div>
            ${sku}
          </td>
          <td style="padding: 12px 8px; text-align: center; font-size: 13px; font-weight: 700; color: #0f172a;">${item.quantity}x</td>
          <td style="padding: 12px 8px; text-align: right; font-family: monospace; font-size: 13px; color: #475569;">€${Number(item.price).toFixed(2)}</td>
          <td style="padding: 12px 10px; text-align: right; font-family: monospace; font-weight: 800; font-size: 13px; color: #0f172a;">€${Number(item.subtotal || item.price * item.quantity).toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const deliveryFeeCharged = computeDeliveryFeeCharged(orderDetails);

    // Escaped copies for HTML interpolation — orderDetails/notes are not mutated
    // in place since the same object is serialized back as the API response
    // after this email is sent.
    const safeNotes = escapeHtml(notes);
    const safeDeliveryAddress = escapeHtml(orderDetails.deliveryAddress);
    const safeDeliveryNotes = escapeHtml(orderDetails.deliveryNotes);
    const safeModificationReason = escapeHtml(orderDetails.modificationReason);

    // Highlight block if modification requires approval
    const modificationAlertHtml = isPendingApproval ? `
      <div style="background-color: #fffbeb; border: 2px solid #f59e0b; border-radius: 14px; padding: 18px; margin: 18px 0; direction: ${isAr ? 'rtl' : 'ltr'}; text-align: ${isAr ? 'right' : 'left'};">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="font-size: 20px;">⚠️</span>
          <strong style="color: #b45309; font-size: 15px;">
            ${isAr ? 'تم تعديل هذا الطلب من قبل المتجر' : 'Bestelländerung durch Supermarkt'}
          </strong>
        </div>
        <p style="margin: 0 0 10px 0; color: #78350f; font-size: 13px; line-height: 1.6;">
          ${isAr 
            ? 'نعتذر، بعض المنتجات المطلوبة غير متوفرة حالياً في المخزن وتم تعديل الطلب. يرجى مراجعة التعديلات والموافقة عليها للمتابعة:'
            : 'Aufgrund mangelnder Verfügbarkeit einzelner Artikel im Lager wurde Ihre Bestellung angepasst. Bitte bestätigen Sie die Änderung, damit wir Ihre Lieferung sofort fertigstellen können:'}
        </p>
        ${orderDetails.modificationReason ? `
          <div style="background: #ffffff; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #92400e; border: 1px dashed #f59e0b; margin-bottom: 12px;">
            <strong>${isAr ? 'ملاحظة المتجر / سبب التعديل:' : 'Begründung des Supermarkts:'}</strong> ${safeModificationReason}
          </div>
        ` : ''}
        ${orderDetails.originalTotalAmount ? `
          <div style="font-size: 13px; color: #78350f; margin-bottom: 14px;">
            <span>${isAr ? 'المبلغ الأصلي:' : 'Vorheriger Betrag:'} <del>€${Number(orderDetails.originalTotalAmount).toFixed(2)}</del></span>
            &nbsp;➔&nbsp;
            <strong style="color: #15803d; font-size: 15px;">${isAr ? 'المبلغ الجديد بعد التعديل:' : 'Neuer Gesamtbetrag:'} €${Number(orderDetails.totalAmount).toFixed(2)}</strong>
          </div>
        ` : ''}
        <div style="text-align: center; margin-top: 14px;">
          <a href="${portalUrl}" class="btn-primary" style="background: #16a34a; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block;">
            ${isAr ? '✅ مراجعة وقبول التعديل في حسابي' : '✅ Änderung im Kundenkonto annehmen'}
          </a>
        </div>
      </div>
    ` : '';

    const contentHtml = isAr ? `
      <p style="font-size: 16px; color: #0f172a; margin-top: 0;">مرحباً <strong>${customerName}</strong>،</p>
      <p style="color: #475569; line-height: 1.8; font-size: 14px;">
        نوافيكم بهذا التقرير الرسمي لطلب التوصيل رقم <strong>#${orderNumber}</strong>:
        <span style="display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 8px; font-weight: bold; font-size: 13px;">${statusInfo.ar}</span>
      </p>

      ${modificationAlertHtml}

      ${notes && !isPendingApproval ? `<p style="background: #f8fafc; border-right: 3px solid #2563eb; padding: 10px 14px; font-size: 13px; color: #475569; margin: 16px 0;"><strong>ملاحظات المتجر:</strong> ${safeNotes}</p>` : ''}

      <!-- Order Summary Card -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; margin: 18px 0; font-size: 13px; line-height: 1.8;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: #64748b; width: 35%;">رقم الطلب:</td>
            <td style="font-weight: 800; font-family: monospace; color: #0f172a;">#${orderNumber}</td>
          </tr>
          ${orderDate ? `<tr><td style="color: #64748b;">تاريخ ووقت الطلب:</td><td style="color: #334155;">${orderDate}</td></tr>` : ''}
          <tr>
            <td style="color: #64748b;">طريقة الدفع:</td>
            <td style="font-weight: 700; color: #16a34a;">الدفع عند الاستلام (نقداً أو بالبطاقة عند الباب)</td>
          </tr>
          ${orderDetails.deliveryAddress ? `<tr><td style="color: #64748b; vertical-align: top;">عنوان التوصيل:</td><td style="font-weight: 600; color: #1e293b;">${safeDeliveryAddress}</td></tr>` : ''}
          ${formatDeliverySlot(orderDetails.deliverySlot, 'ar') ? `<tr><td style="color: #64748b;">موعد التوصيل:</td><td style="font-weight: 600; color: #1e293b;">${formatDeliverySlot(orderDetails.deliverySlot, 'ar')}</td></tr>` : ''}
          ${orderDetails.deliveryNotes ? `<tr><td style="color: #64748b;">ملاحظات السائق:</td><td style="font-style: italic; color: #475569;">${safeDeliveryNotes}</td></tr>` : ''}
        </table>
      </div>

      <!-- Items Table (Bestellbericht) -->
      <div style="border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; margin-top: 20px;">
        <div style="background: #1e3a8a; color: #ffffff; padding: 10px 14px; font-weight: 800; font-size: 13px;">
          📋 تفاصيل المنتجات في الطلب (تقرير المنتجات)
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; direction: rtl; text-align: right;">
          <thead>
            <tr style="background: #f1f5f9; color: #475569; font-size: 12px; border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 10px 10px;">المنتج</th>
              <th style="padding: 10px 8px; text-align: center;">الكمية</th>
              <th style="padding: 10px 8px; text-align: right;">السعر</th>
              <th style="padding: 10px 10px; text-align: right;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
          <tfoot>
            <tr style="background: #ffffff; border-top: 1px solid #e2e8f0;">
              <td colspan="3" style="padding: 10px 10px; text-align: left; color: #64748b; font-size: 12px;">رسوم التوصيل المنزلي:</td>
              <td style="padding: 10px 10px; text-align: right; font-weight: 700; color: #16a34a; font-size: 13px;">${deliveryFeeCharged > 0 ? `€${deliveryFeeCharged.toFixed(2)}` : 'مجاناً (0.00 €)'}</td>
            </tr>
            <tr style="background: #f8fafc; border-top: 2px solid #e2e8f0;">
              <td colspan="3" style="padding: 14px 10px; text-align: left; font-weight: 800; font-size: 15px; color: #0f172a;">المبلغ المطلوب عند الاستلام:</td>
              <td style="padding: 14px 10px; text-align: right; font-weight: 900; font-size: 18px; font-family: monospace; color: #1e3a8a;">€${Number(orderDetails.totalAmount).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style="text-align: center; margin: 26px 0 10px 0;">
        <a href="${portalUrl}" class="btn-blue" style="background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 15px 32px; border-radius: 12px; font-weight: 800; font-size: 15px; display: inline-block;">
          📦 فتح حسابي ومتابعة الطلب &larr;
        </a>
      </div>
    ` : `
      <p style="font-size: 16px; color: #0f172a; margin-top: 0;">Hallo <strong>${customerName}</strong>,</p>
      <p style="color: #475569; line-height: 1.8; font-size: 14px;">
        hier ist Ihr offizieller Status- & Bestellbericht zu Ihrer Bestellung <strong>#${orderNumber}</strong>:
        <span style="display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 8px; font-weight: bold; font-size: 13px;">${statusInfo.de}</span>
      </p>

      ${modificationAlertHtml}

      ${notes && !isPendingApproval ? `<p style="background: #f8fafc; border-left: 3px solid #2563eb; padding: 10px 14px; font-size: 13px; color: #475569; margin: 16px 0;"><strong>Hinweis der Filiale:</strong> ${safeNotes}</p>` : ''}

      <!-- Order Summary Card -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; margin: 18px 0; font-size: 13px; line-height: 1.8;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: #64748b; width: 35%;">Bestellnummer:</td>
            <td style="font-weight: 800; font-family: monospace; color: #0f172a;">#${orderNumber}</td>
          </tr>
          ${orderDate ? `<tr><td style="color: #64748b;">Bestelldatum:</td><td style="color: #334155;">${orderDate}</td></tr>` : ''}
          <tr>
            <td style="color: #64748b;">Zahlungsart:</td>
            <td style="font-weight: 700; color: #16a34a;">Barzahlung / Kartenzahlung an der Haustür (Lieferung)</td>
          </tr>
          ${orderDetails.deliveryAddress ? `<tr><td style="color: #64748b; vertical-align: top;">Lieferadresse:</td><td style="font-weight: 600; color: #1e293b;">${safeDeliveryAddress}</td></tr>` : ''}
          ${formatDeliverySlot(orderDetails.deliverySlot, 'de') ? `<tr><td style="color: #64748b;">Lieferzeitfenster:</td><td style="font-weight: 600; color: #1e293b;">${formatDeliverySlot(orderDetails.deliverySlot, 'de')}</td></tr>` : ''}
          ${orderDetails.deliveryNotes ? `<tr><td style="color: #64748b;">Hinweis für Fahrer:</td><td style="font-style: italic; color: #475569;">${safeDeliveryNotes}</td></tr>` : ''}
        </table>
      </div>

      <!-- Items Table (Bestellbericht) -->
      <div style="border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; margin-top: 20px;">
        <div style="background: #1e3a8a; color: #ffffff; padding: 10px 14px; font-weight: 800; font-size: 13px;">
          📋 Bestellte Artikel (Bestellbericht & Lieferschein)
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #f1f5f9; color: #475569; font-size: 12px; border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 10px 10px; text-align: left;">Artikel</th>
              <th style="padding: 10px 8px; text-align: center;">Menge</th>
              <th style="padding: 10px 8px; text-align: right;">Einzelpreis</th>
              <th style="padding: 10px 10px; text-align: right;">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
          <tfoot>
            <tr style="background: #ffffff; border-top: 1px solid #e2e8f0;">
              <td colspan="3" style="padding: 10px 10px; text-align: right; color: #64748b; font-size: 12px;">Lieferkosten:</td>
              <td style="padding: 10px 10px; text-align: right; font-weight: 700; color: #16a34a; font-size: 13px;">${deliveryFeeCharged > 0 ? `€${deliveryFeeCharged.toFixed(2)}` : 'Kostenlos (0,00 €)'}</td>
            </tr>
            <tr style="background: #f8fafc; border-top: 2px solid #e2e8f0;">
              <td colspan="3" style="padding: 14px 10px; text-align: right; font-weight: 800; font-size: 15px; color: #0f172a;">Gesamtbetrag bei Lieferung:</td>
              <td style="padding: 14px 10px; text-align: right; font-weight: 900; font-size: 18px; font-family: monospace; color: #1e3a8a;">€${Number(orderDetails.totalAmount).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style="text-align: center; margin: 26px 0 10px 0;">
        <a href="${portalUrl}" class="btn-blue" style="background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 15px 32px; border-radius: 12px; font-weight: 800; font-size: 15px; display: inline-block;">
          📦 Bestellung im Kundenkonto ansehen &rarr;
        </a>
      </div>
    `;

    const html = emailWrapper({ lang, title, subtitle, contentHtml, settings });

    await transporter.sendMail({
      from: `"${storeName}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@supermarket-b2b.com'}>`,
      to: customerEmail,
      subject,
      html
    });
    console.log(`Order status/report email (${lang}) sent to ${customerEmail} for order ${orderDetails.id}`);
  } catch (error) {
    console.error('Error sending order status email:', error.message || error);
  }
};

/**
 * Send Order Modification Email specifically notifying customer of edits due to stock issues
 */
const sendOrderModificationEmail = async (customerEmail, customerName, orderDetails, reason, lang = 'de') => {
  return sendOrderStatusEmail(customerEmail, customerName, orderDetails, 'pending_customer_approval', reason, lang);
};

/**
 * Send 6-Digit Verification Code to Customer Email
 */
const sendCustomerVerificationEmail = async (customerEmail, customerName, verificationCode, lang = 'de') => {
  customerName = escapeHtml(customerName);
  if (!isEmailConfigured()) {
    console.log(`[Email skipped - SMTP not configured] Customer OTP '${verificationCode}' (${lang}) -> ${customerEmail}`);
    return;
  }

  try {
    const transporter = getTransporter();
    if (!transporter) return;

    const settings = await getStoreSettings();
    const isAr = lang === 'ar';
    const storeName = (isAr ? settings.storeNameAr : settings.storeNameDe) || settings.storeName || 'Hajar Supermarkt';

    const title = isAr ? 'تأكيد البريد الإلكتروني للطلب المنزلي' : 'Bestätigung Ihrer E-Mail-Adresse';
    const subtitle = isAr ? 'رمز التحقق الخاص بحسابك' : 'Verifizierungscode für Ihr Lieferkonto';
    const subject = isAr 
      ? `رمز التحقق الخاص بك: ${verificationCode} - ${storeName}`
      : `Ihr Verifizierungscode: ${verificationCode} - ${storeName}`;

    const contentHtml = isAr ? `
      <p style="font-size: 16px; color: #0f172a; margin-top: 0;">مرحباً <strong>${customerName}</strong>،</p>
      <p style="color: #475569; line-height: 1.8; font-size: 14px;">
        شكراً لانضمامك إلى خدمة التوصيل المنزلي من <strong>${storeName}</strong>.
        لتأكيد بريدك الإلكتروني وإتمام تسجيل حسابك، يُرجى إدخال رمز التحقق المكون من 6 أرقام:
      </p>

      <div class="code-box" style="background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 14px; padding: 22px; text-align: center; margin: 24px 0;">
        <div class="code-digits" style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #15803d; line-height: 1.2;">${verificationCode}</div>
        <div class="code-label" style="font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px;">رمز التحقق السريع</div>
      </div>

      <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
        هذا الرمز صالح لمدة 15 دقيقة. إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة بأمان.
      </p>
    ` : `
      <p style="font-size: 16px; color: #0f172a; margin-top: 0;">Hallo <strong>${customerName}</strong>,</p>
      <p style="color: #475569; line-height: 1.8; font-size: 14px;">
        vielen Dank für Ihre Registrierung bei unserem Lieferservice <strong>${storeName}</strong>.
        Bitte geben Sie den folgenden 6-stelligen Code ein, um Ihre E-Mail-Adresse zu bestätigen:
      </p>

      <div class="code-box" style="background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 14px; padding: 22px; text-align: center; margin: 24px 0;">
        <div class="code-digits" style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #15803d; line-height: 1.2;">${verificationCode}</div>
        <div class="code-label" style="font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px;">6-stelliger Bestätigungscode</div>
      </div>

      <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
        Der Code ist für 15 Minuten gültig. Falls Sie diese Registrierung nicht angefordert haben, können Sie diese E-Mail ignorieren.
      </p>
    `;

    const html = emailWrapper({ lang, title, subtitle, contentHtml, settings });

    await transporter.sendMail({
      from: `"${storeName}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@supermarket-b2b.com'}>`,
      to: customerEmail,
      subject,
      html
    });
    console.log(`Customer OTP email (${lang}) sent to ${customerEmail}`);
  } catch (error) {
    console.error('Error sending customer verification email:', error.message || error);
  }
};

/**
 * Send Password Reset Link to Customer Email
 */
const sendPasswordResetEmail = async (customerEmail, customerName, resetToken, lang = 'de') => {
  customerName = escapeHtml(customerName);
  if (!isEmailConfigured()) {
    console.log(`[Email skipped - SMTP not configured] Password reset link -> ${customerEmail}`);
    return;
  }

  try {
    const transporter = getTransporter();
    if (!transporter) return;

    const settings = await getStoreSettings();
    const isAr = lang === 'ar';
    const storeName = (isAr ? settings.storeNameAr : settings.storeNameDe) || settings.storeName || 'Hajar Supermarkt';

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const title = isAr ? 'إعادة تعيين كلمة المرور' : 'Passwort zurücksetzen';
    const subtitle = isAr ? 'طلب إعادة تعيين كلمة المرور' : 'Anfrage zum Zurücksetzen des Passworts';
    const subject = isAr
      ? `إعادة تعيين كلمة المرور - ${storeName}`
      : `Passwort zurücksetzen - ${storeName}`;

    const contentHtml = isAr ? `
      <p style="font-size: 16px; color: #0f172a; margin-top: 0;">مرحباً <strong>${customerName}</strong>،</p>
      <p style="color: #475569; line-height: 1.8; font-size: 14px;">
        تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في <strong>${storeName}</strong>. اضغط على الزر أدناه لتعيين كلمة مرور جديدة:
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${resetUrl}" class="btn-primary" style="background: #16a34a; color: #ffffff !important; text-decoration: none; padding: 15px 32px; border-radius: 12px; font-weight: 800; font-size: 15px; display: inline-block;">
          🔑 إعادة تعيين كلمة المرور
        </a>
      </div>
      <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
        هذا الرابط صالح لمدة 60 دقيقة فقط. إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان ولن يتغير شيء في حسابك.
      </p>
    ` : `
      <p style="font-size: 16px; color: #0f172a; margin-top: 0;">Hallo <strong>${customerName}</strong>,</p>
      <p style="color: #475569; line-height: 1.8; font-size: 14px;">
        wir haben eine Anfrage zum Zurücksetzen des Passworts für Ihr Konto bei <strong>${storeName}</strong> erhalten. Klicken Sie auf die Schaltfläche unten, um ein neues Passwort festzulegen:
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${resetUrl}" class="btn-primary" style="background: #16a34a; color: #ffffff !important; text-decoration: none; padding: 15px 32px; border-radius: 12px; font-weight: 800; font-size: 15px; display: inline-block;">
          🔑 Passwort zurücksetzen
        </a>
      </div>
      <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
        Dieser Link ist 60 Minuten gültig. Falls Sie kein neues Passwort angefordert haben, können Sie diese E-Mail ignorieren – es ändert sich nichts an Ihrem Konto.
      </p>
    `;

    const html = emailWrapper({ lang, title, subtitle, contentHtml, settings });

    await transporter.sendMail({
      from: `"${storeName}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@supermarket-b2b.com'}>`,
      to: customerEmail,
      subject,
      html
    });
    console.log(`Password reset email (${lang}) sent to ${customerEmail}`);
  } catch (error) {
    console.error('Error sending password reset email:', error.message || error);
  }
};

/**
 * Send Customer Order Confirmation (Cash on Delivery)
 */
const sendCustomerOrderConfirmationEmail = async (customerEmail, customerName, order, lang = 'de') => {
  customerName = escapeHtml(customerName);
  if (!isEmailConfigured()) {
    console.log(`[Email skipped - SMTP not configured] Customer order confirmation -> ${customerEmail}`);
    return;
  }

  try {
    const transporter = getTransporter();
    if (!transporter) return;

    const settings = await getStoreSettings();
    const isAr = lang === 'ar';
    const storeName = (isAr ? settings.storeNameAr : settings.storeNameDe) || settings.storeName || 'Hajar Supermarkt';

    const title = isAr ? 'تم استلام طلب التوصيل المنزلي بنجاح!' : 'Bestellung erfolgreich eingegangen!';
    const subtitle = isAr ? `طلب رقم #${order.id.slice(0, 8).toUpperCase()}` : `Bestellnummer #${order.id.slice(0, 8).toUpperCase()}`;
    const subject = isAr 
      ? `تأكيد طلب التوصيل #${order.id.slice(0, 8).toUpperCase()} - ${storeName}`
      : `Bestellbestätigung #${order.id.slice(0, 8).toUpperCase()} - ${storeName}`;

    const itemsRows = (order.orderItems || []).map(item => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 8px; font-weight: 500;">${item.product?.name || 'Produkt'}</td>
        <td style="padding: 10px 8px; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px 8px; text-align: right;">€${Number(item.price).toFixed(2)}</td>
        <td style="padding: 10px 8px; text-align: right; font-weight: 700;">€${Number(item.subtotal || item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    const deliveryFeeCharged = computeDeliveryFeeCharged(order);
    const safeDeliveryAddress = escapeHtml(order.deliveryAddress);
    const safeDeliveryNotes = escapeHtml(order.deliveryNotes);

    const contentHtml = isAr ? `
      <p style="font-size: 16px; color: #0f172a; margin-top: 0;">مرحباً <strong>${customerName}</strong>،</p>
      <p style="color: #475569; line-height: 1.8; font-size: 14px;">
        يسعدنا إبلاغك بأنه تم استلام طلبك بنجاح وجارٍ تحضيره للتوصيل إلى منزلك.
      </p>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin: 18px 0; font-size: 13px;">
        <div><strong>عنوان التوصيل:</strong> ${safeDeliveryAddress || 'عنوان العميل'}</div>
        ${formatDeliverySlot(order.deliverySlot, 'ar') ? `<div style="margin-top: 6px;"><strong>موعد التوصيل:</strong> ${formatDeliverySlot(order.deliverySlot, 'ar')}</div>` : ''}
        ${order.deliveryNotes ? `<div style="margin-top: 6px;"><strong>ملاحظات السائق:</strong> ${safeDeliveryNotes}</div>` : ''}
        <div style="margin-top: 6px; color: #16a34a; font-weight: bold;">طريقة الدفع: الدفع عند الاستلام (نقداً أو بالبطاقة عند الباب)</div>
      </div>

      <div style="overflow-x: auto; margin-top: 16px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <table style="width: 100%; border-collapse: collapse; direction: rtl; font-size: 13px;">
          <thead>
            <tr style="background: #15803d; color: #ffffff; font-size: 12px;">
              <th style="padding: 8px; text-align: right;">المنتج</th>
              <th style="padding: 8px; text-align: center;">الكمية</th>
              <th style="padding: 8px; text-align: right;">السعر</th>
              <th style="padding: 8px; text-align: right;">المجموع</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
            <tr style="background: #ffffff;">
              <td colspan="3" style="padding: 8px; text-align: left; color: #64748b;">رسوم التوصيل:</td>
              <td style="padding: 8px; text-align: right; font-weight: 700; color: #16a34a;">${deliveryFeeCharged > 0 ? `€${deliveryFeeCharged.toFixed(2)}` : 'مجاناً (0.00 €)'}</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td colspan="3" style="padding: 10px 8px; text-align: left; font-weight: bold;">الإجمالي المطلوب عند الاستلام:</td>
              <td style="padding: 10px 8px; text-align: right; font-weight: 800; font-size: 16px; color: #15803d;">€${Number(order.totalAmount).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    ` : `
      <p style="font-size: 16px; color: #0f172a; margin-top: 0;">Hallo <strong>${customerName}</strong>,</p>
      <p style="color: #475569; line-height: 1.8; font-size: 14px;">
        vielen Dank für Ihre Bestellung! Wir bereiten Ihre Lieferung für die Zustellung zu Ihnen nach Hause vor.
      </p>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin: 18px 0; font-size: 13px;">
        <div><strong>Lieferadresse:</strong> ${safeDeliveryAddress || 'Ihre hinterlegte Adresse'}</div>
        ${formatDeliverySlot(order.deliverySlot, 'de') ? `<div style="margin-top: 6px;"><strong>Lieferzeitfenster:</strong> ${formatDeliverySlot(order.deliverySlot, 'de')}</div>` : ''}
        ${order.deliveryNotes ? `<div style="margin-top: 6px;"><strong>Lieferhinweis für den Fahrer:</strong> ${safeDeliveryNotes}</div>` : ''}
        <div style="margin-top: 6px; color: #16a34a; font-weight: bold;">Zahlungsart: Barzahlung / Kartenzahlung an der Haustür (Lieferung)</div>
      </div>

      <div style="overflow-x: auto; margin-top: 16px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #15803d; color: #ffffff; font-size: 12px;">
              <th style="padding: 8px; text-align: left;">Artikel</th>
              <th style="padding: 8px; text-align: center;">Menge</th>
              <th style="padding: 8px; text-align: right;">Preis</th>
              <th style="padding: 8px; text-align: right;">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
            <tr style="background: #ffffff;">
              <td colspan="3" style="padding: 8px; text-align: right; color: #64748b;">Lieferkosten:</td>
              <td style="padding: 8px; text-align: right; font-weight: 700; color: #16a34a;">${deliveryFeeCharged > 0 ? `€${deliveryFeeCharged.toFixed(2)}` : 'Kostenlos (0,00 €)'}</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td colspan="3" style="padding: 10px 8px; text-align: right; font-weight: bold;">Gesamtbetrag bei Lieferung:</td>
              <td style="padding: 10px 8px; text-align: right; font-weight: 800; font-size: 16px; color: #15803d;">€${Number(order.totalAmount).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    const html = emailWrapper({ lang, title, subtitle, contentHtml, settings });

    await transporter.sendMail({
      from: `"${storeName}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@supermarket-b2b.com'}>`,
      to: customerEmail,
      subject,
      html
    });
    console.log(`Customer order confirmation sent to ${customerEmail}`);
  } catch (error) {
    console.error('Error sending customer order email:', error.message || error);
  }
};

/**
 * Send Admin Login 2FA Code
 *
 * Always logs the code to the server console too (not just when SMTP is
 * unconfigured, unlike the customer-facing sends above) — this is the sole
 * admin account's login path, so a silent email-delivery failure must not
 * be able to lock them out entirely.
 */
const sendAdminLoginOtpEmail = async (adminEmail, adminName, code) => {
  console.log(`[Admin login 2FA] code for ${adminEmail}: ${code} (valid 10 minutes)`);

  if (!isEmailConfigured()) return;

  try {
    const transporter = getTransporter();
    if (!transporter) return;

    const settings = await getStoreSettings();
    const storeName = settings.storeNameDe || settings.storeName || 'Hajar Supermarkt';
    const safeName = escapeHtml(adminName || 'Admin');

    const title = 'Admin-Anmeldecode';
    const subtitle = 'Zwei-Faktor-Bestätigung für Ihr Admin-Konto';
    const subject = `Ihr Admin-Anmeldecode: ${code} - ${storeName}`;

    const contentHtml = `
      <p style="font-size: 16px; color: #0f172a; margin-top: 0;">Hallo <strong>${safeName}</strong>,</p>
      <p style="color: #475569; line-height: 1.8; font-size: 14px;">
        Jemand versucht sich gerade mit Ihrem Admin-Konto bei <strong>${storeName}</strong> anzumelden.
        Geben Sie den folgenden Code ein, um die Anmeldung abzuschließen:
      </p>

      <div class="code-box" style="background: #eff6ff; border: 2px dashed #2563eb; border-radius: 14px; padding: 22px; text-align: center; margin: 24px 0;">
        <div class="code-digits" style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; line-height: 1.2;">${code}</div>
        <div class="code-label" style="font-size: 12px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px;">Anmeldecode</div>
      </div>

      <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
        Der Code ist für 10 Minuten gültig. Falls Sie diese Anmeldung nicht angefordert haben, ändern Sie umgehend Ihr Admin-Passwort.
      </p>
    `;

    const html = emailWrapper({ lang: 'de', title, subtitle, contentHtml, settings });

    await transporter.sendMail({
      from: `"${storeName}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@supermarket-b2b.com'}>`,
      to: adminEmail,
      subject,
      html
    });
    console.log(`Admin login 2FA email sent to ${adminEmail}`);
  } catch (error) {
    console.error('Error sending admin login 2FA email:', error.message || error);
  }
};

module.exports = {
  sendOrderStatusEmail,
  sendOrderModificationEmail,
  sendCustomerVerificationEmail,
  sendCustomerOrderConfirmationEmail,
  sendPasswordResetEmail,
  sendAdminLoginOtpEmail
};