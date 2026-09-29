// Shared email plumbing: SMTP transport, store branding, the HTML layout
// and URL/escaping helpers.

const nodemailer = require('nodemailer');
const prisma = require('../../lib/prisma');

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

// Emails are read outside the site, so every link and image needs an absolute
// URL on the public site. FRONTEND_URL may list several origins for CORS
// (server.js splits it on commas); the first one is the canonical site.
const publicOrigin = () =>
  (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/+$/, '');

// e.g. the cached logo "/api/uploads/logo-….png" -> "https://shop.example/api/uploads/logo-….png"
const absoluteUrl = (url) => (typeof url === 'string' && url.startsWith('/') ? `${publicOrigin()}${url}` : url);

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

let cachedTransporter = null;

const getTransporter = () => {
  if (!isEmailConfigured()) return null;
  if (!cachedTransporter) {
    const port = Number(process.env.EMAIL_PORT) || 587;
    // #36 & #44 fix: requireTLS prevents STRIPTLS downgrade; pool: true reuses SMTP connections
    cachedTransporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      pool: true,
      maxConnections: 3,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
  return cachedTransporter;
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
  // Store-settings text is admin-controlled but still interpolated into HTML
  // below, so escape it the same way customer-supplied values are — an admin
  // must not be able to inject markup into every customer's inbox.
  const localizedStoreName = escapeHtml(settings
    ? (isAr ? settings.storeNameAr : settings.storeNameDe) || settings.storeName
    : 'Hajar Supermarkt');
  const safePhone = escapeHtml(settings?.phone);
  const safeEmail = escapeHtml(settings?.email);
  const safeAddress = escapeHtml(settings?.address);
  const brandSub = isAr ? 'منصة تجارة وتوزيع الجملة B2B' : 'B2B Großhandel Distributionszentrum';
  const footerNotice = isAr 
    ? `هذه رسالة تلقائية من ${localizedStoreName} &bull; جميع الحقوق محفوظة © ${new Date().getFullYear()}`
    : `Automatische Benachrichtigung von ${localizedStoreName} &bull; Alle Rechte vorbehalten © ${new Date().getFullYear()}`;

  const contactHtml = settings?.phone || settings?.email || settings?.address ? `
    <div style="margin-top: 14px; font-size: 11px; color: #64748b; line-height: 1.8;">
      ${settings.phone ? `<span class="contact-pill" style="display: inline-block; margin: 2px 6px;">📞 <a href="tel:${encodeURIComponent(settings.phone)}" style="color: #64748b; text-decoration: none;">${safePhone}</a></span>` : ''}
      ${settings.email ? `<span class="contact-pill" style="display: inline-block; margin: 2px 6px;">✉️ <a href="mailto:${encodeURIComponent(settings.email)}" style="color: #64748b; text-decoration: none;">${safeEmail}</a></span>` : ''}
      ${settings.address ? `<div style="margin-top: 4px; color: #94a3b8;">📍 ${safeAddress}</div>` : ''}
    </div>
  ` : '';

  const logoHtml = settings?.logoUrl ? `
    <div style="text-align: center; margin-bottom: 14px;">
      <img src="${absoluteUrl(settings.logoUrl)}" alt="${localizedStoreName}" style="max-height: 48px; max-width: 180px; object-fit: contain; background: #ffffff; padding: 6px 12px; border-radius: 12px; display: inline-block;" />
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

module.exports = {
  escapeHtml,
  publicOrigin,
  absoluteUrl,
  isEmailConfigured,
  getStoreSettings,
  computeDeliveryFeeCharged,
  getTransporter,
  emailWrapper
};
