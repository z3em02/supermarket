const { escapeHtml, isEmailConfigured, getTransporter, getStoreSettings, emailWrapper, publicOrigin } = require('./core');

/**
 * Send 6-Digit Verification Code to Customer Email
 */
const sendCustomerVerificationEmail = async (customerEmail, customerName, verificationCode, lang = 'de') => {
  customerName = escapeHtml(customerName);
  if (!isEmailConfigured()) {
    // Only echo the actual code to console outside production — gating this
    // on the placeholder-string heuristic in isEmailConfigured() alone means
    // a production deploy that simply forgets to set EMAIL_* (rather than
    // leaving the literal placeholder text) would still print a real,
    // usable OTP straight into server/PM2 logs.
    if (process.env.NODE_ENV === 'production') {
      console.warn(`[Email not sent - SMTP not configured] Customer OTP delivery failed for ${customerEmail}. Set EMAIL_* env vars.`);
    } else {
      console.log(`[Email skipped - SMTP not configured] Customer OTP '${verificationCode}' (${lang}) -> ${customerEmail}`);
    }
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

    const resetUrl = `${publicOrigin()}/reset-password?token=${resetToken}`;

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
  sendCustomerVerificationEmail,
  sendPasswordResetEmail,
  sendAdminLoginOtpEmail
};
