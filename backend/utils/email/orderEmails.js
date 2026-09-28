const { formatDeliverySlot } = require('../deliverySlot');
const { escapeHtml, isEmailConfigured, getTransporter, getStoreSettings, publicOrigin, computeDeliveryFeeCharged, emailWrapper } = require('./core');

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

    const portalUrl = `${publicOrigin()}/account`;

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

module.exports = {
  sendOrderStatusEmail,
  sendOrderModificationEmail,
  sendCustomerOrderConfirmationEmail
};
