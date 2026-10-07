// Sends phone-verification codes as SMS through seven.io (https://seven.io).
//
// Mirrors the contract of utils/whatsappService.js so the customer-auth
// controller can send an OTP without caring which channel delivers it:
//   sendSmsOtp(e164Phone, code, preferredLanguage)
// - throws SmsSendError when seven.io rejects the message (so the controller
//   can clear the unsent code and tell the customer to retry);
// - in production, missing config throws (the customer can't verify otherwise);
// - outside production, missing config just logs the code (like emailService
//   without SMTP), so the flow is testable before an account exists.
//
// Config (backend/.env):
//   SEVEN_API_KEY   — API key from seven.io -> Developer -> API key (required)
//   SEVEN_SMS_FROM  — sender shown to the customer; alphanumeric (max 11 chars,
//                     e.g. "Hajar") or a number. Optional; seven.io uses the
//                     account default if unset.
// seven.io bills per SMS part; the German/English texts fit one GSM part (160
// chars), the Arabic one fits one UCS-2 part (70 chars).

const SEVEN_SMS_URL = 'https://gateway.seven.io/api/sms';

const isProduction = () => process.env.NODE_ENV === 'production';

const isSmsConfigured = () => Boolean(process.env.SEVEN_API_KEY);

// Kept short on purpose so each is a single SMS part (GSM 160 / UCS-2 70).
const SMS_MESSAGES = {
  de: (code) => `Ihr Hajar Supermarkt Code: ${code} (10 Min gueltig). Nicht weitergeben.`,
  ar: (code) => `رمز Hajar Supermarkt: ${code} صالح 10 دقائق. لا تشاركه.`,
  en: (code) => `Your Hajar Supermarkt code: ${code} (valid 10 min). Do not share.`
};

const smsTextFor = (code, preferredLanguage) =>
  (SMS_MESSAGES[preferredLanguage] || SMS_MESSAGES.de)(code);

// seven.io wants the recipient as country code + number, digits only (no "+").
const toSmsRecipient = (e164Phone) => String(e164Phone || '').replace(/\D/g, '');

// seven.io status codes that mean "fix your config", not "retry later".
const CONFIG_ERROR_CODES = new Set(['900', '902', '903', '201']);

class SmsSendError extends Error {
  constructor(message, { status, sevenCode } = {}) {
    super(message);
    this.name = 'SmsSendError';
    this.status = status;
    this.sevenCode = sevenCode;
    this.isConfigError = sevenCode ? CONFIG_ERROR_CODES.has(String(sevenCode)) : false;
  }
}

const postSms = async (to, text) => {
  const payload = { to, text, from: process.env.SEVEN_SMS_FROM || undefined };

  let res;
  try {
    res = await fetch(SEVEN_SMS_URL, {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.SEVEN_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });
  } catch (err) {
    throw new SmsSendError(`SMS request failed: ${err.message}`);
  }

  // seven.io returns JSON when asked; older responses are a bare status code
  // ("100") as text. Handle both so a gateway change doesn't break sending.
  const raw = await res.text();
  let body;
  try {
    const parsed = JSON.parse(raw);
    // A bare status code ("100") parses as a number, not the usual object.
    body = parsed && typeof parsed === 'object' ? parsed : { success: String(parsed) };
  } catch {
    body = { success: raw.trim().split(/\s+/)[0] };
  }

  const code = String(body.success ?? '');
  if (!res.ok || code !== '100') {
    throw new SmsSendError(
      `seven.io error (status ${code || res.status})`,
      { status: res.status, sevenCode: code || res.status }
    );
  }
  // Per-message failure (e.g. bad single recipient) still comes back as 100.
  const msg = Array.isArray(body.messages) ? body.messages[0] : null;
  if (msg && msg.success === false) {
    throw new SmsSendError(`seven.io rejected the recipient: ${msg.error_text || msg.error || 'unknown'}`);
  }
  return body;
};

const sendSmsOtp = async (e164Phone, code, preferredLanguage) => {
  if (!isSmsConfigured()) {
    if (isProduction()) {
      throw new SmsSendError('SMS is not configured (SEVEN_API_KEY missing)');
    }
    console.log(`[sms] Not configured — would send code ${code} to ${e164Phone}`);
    return { skipped: true };
  }
  return postSms(toSmsRecipient(e164Phone), smsTextFor(code, preferredLanguage));
};

module.exports = {
  sendSmsOtp,
  isSmsConfigured,
  smsTextFor,
  toSmsRecipient,
  SmsSendError
};
