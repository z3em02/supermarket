// Sends phone-verification codes through Meta's WhatsApp Cloud API.
//
// WhatsApp only lets a business start a conversation with a pre-approved
// message template, so the code goes out as an "Authentication" template
// (created in WhatsApp Manager with a "Copy code" button). The template's
// body has a single {{1}} parameter for the code, and the copy-code button
// needs the same code as its URL-button parameter.
//
// Outside production the code is sent as a plain text message instead, so
// development works before the template is approved. Meta only delivers
// free text inside the 24-hour window after the recipient last messaged the
// business number, so write to the number from your test phone first. Real
// customers haven't done that, which is why production always uses the
// template (and requires WHATSAPP_OTP_TEMPLATE).
//
// Config (backend/.env): WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN,
// WHATSAPP_OTP_TEMPLATE (production), optionally
// WHATSAPP_TEMPLATE_DEFAULT_LANGUAGE and WHATSAPP_GRAPH_API_VERSION.
// See README §4.4.

const GRAPH_BASE_URL = 'https://graph.facebook.com';
const DEFAULT_GRAPH_API_VERSION = 'v23.0';
// Meta error code for "template does not exist in this language"
const TEMPLATE_LANGUAGE_MISSING = 132001;

const isProduction = () => process.env.NODE_ENV === 'production';

const isWhatsAppConfigured = () =>
  Boolean(
    process.env.WHATSAPP_PHONE_NUMBER_ID &&
    process.env.WHATSAPP_ACCESS_TOKEN &&
    (process.env.WHATSAPP_OTP_TEMPLATE || !isProduction())
  );

const PLAIN_TEXT_MESSAGES = {
  de: (code) => `${code} ist Ihr Bestätigungscode für Hajar Supermarkt. Er ist 10 Minuten gültig. Geben Sie ihn an niemanden weiter.`,
  ar: (code) => `${code} هو رمز التحقق الخاص بك لدى Hajar Supermarkt. صالح لمدة 10 دقائق. لا تشاركه مع أي شخص.`,
  en: (code) => `${code} is your Hajar Supermarkt verification code. It is valid for 10 minutes. Do not share it with anyone.`
};

const buildOtpTextPayload = (e164Phone, code, preferredLanguage) => ({
  messaging_product: 'whatsapp',
  recipient_type: 'individual',
  to: toWhatsAppRecipient(e164Phone),
  type: 'text',
  text: { body: (PLAIN_TEXT_MESSAGES[preferredLanguage] || PLAIN_TEXT_MESSAGES.de)(code) }
});

const defaultTemplateLanguage = () => process.env.WHATSAPP_TEMPLATE_DEFAULT_LANGUAGE || 'de';

// The customer's preferredLanguage ('de' | 'ar' | 'en') is already a valid
// WhatsApp template language code; anything else falls back to the default.
const templateLanguageFor = (preferredLanguage) =>
  ['de', 'ar', 'en'].includes(preferredLanguage) ? preferredLanguage : defaultTemplateLanguage();

// WhatsApp wants the recipient as digits only (country code, no "+").
const toWhatsAppRecipient = (e164Phone) => String(e164Phone || '').replace(/\D/g, '');

const buildOtpTemplatePayload = (e164Phone, code, languageCode) => ({
  messaging_product: 'whatsapp',
  recipient_type: 'individual',
  to: toWhatsAppRecipient(e164Phone),
  type: 'template',
  template: {
    name: process.env.WHATSAPP_OTP_TEMPLATE,
    language: { code: languageCode },
    components: [
      { type: 'body', parameters: [{ type: 'text', text: code }] },
      { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] }
    ]
  }
});

class WhatsAppSendError extends Error {
  constructor(message, { status, metaCode } = {}) {
    super(message);
    this.name = 'WhatsAppSendError';
    this.status = status;
    this.metaCode = metaCode;
  }
}

const postMessage = async (payload) => {
  const version = process.env.WHATSAPP_GRAPH_API_VERSION || DEFAULT_GRAPH_API_VERSION;
  const url = `${GRAPH_BASE_URL}/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });
  } catch (err) {
    throw new WhatsAppSendError(`WhatsApp request failed: ${err.message}`);
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const metaError = body.error || {};
    throw new WhatsAppSendError(
      `WhatsApp API error ${res.status}: ${metaError.message || 'unknown error'}`,
      { status: res.status, metaCode: metaError.code }
    );
  }
  return body;
};

// Sends the verification code to phone (E.164). If WhatsApp isn't configured,
// development just logs the code (like emailService does without SMTP);
// production throws, since the customer would otherwise wait for a message
// that never comes. Throws WhatsAppSendError when Meta rejects the message.
const sendWhatsAppOtp = async (e164Phone, code, preferredLanguage) => {
  if (!isWhatsAppConfigured()) {
    if (isProduction()) {
      throw new WhatsAppSendError('WhatsApp is not configured (WHATSAPP_* env vars missing)');
    }
    console.log(`[whatsapp] Not configured — would send code ${code} to ${e164Phone}`);
    return { skipped: true };
  }

  if (!isProduction()) {
    return postMessage(buildOtpTextPayload(e164Phone, code, preferredLanguage));
  }

  const languageCode = templateLanguageFor(preferredLanguage);
  try {
    return await postMessage(buildOtpTemplatePayload(e164Phone, code, languageCode));
  } catch (err) {
    // The template may not have been translated into every language yet —
    // fall back to the default language rather than failing verification.
    const fallback = defaultTemplateLanguage();
    if (err.metaCode === TEMPLATE_LANGUAGE_MISSING && languageCode !== fallback) {
      return postMessage(buildOtpTemplatePayload(e164Phone, code, fallback));
    }
    throw err;
  }
};

module.exports = {
  sendWhatsAppOtp,
  isWhatsAppConfigured,
  buildOtpTemplatePayload,
  buildOtpTextPayload,
  templateLanguageFor,
  toWhatsAppRecipient,
  WhatsAppSendError
};
