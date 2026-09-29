const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const {
  sendWhatsAppOtp,
  buildOtpTemplatePayload,
  templateLanguageFor,
  toWhatsAppRecipient,
  WhatsAppSendError
} = require('../utils/whatsappService');

const ENV_KEYS = [
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_OTP_TEMPLATE',
  'WHATSAPP_TEMPLATE_DEFAULT_LANGUAGE',
  'WHATSAPP_GRAPH_API_VERSION',
  'NODE_ENV'
];
let savedEnv;
let savedFetch;
let savedLog;

const configure = () => {
  process.env.WHATSAPP_PHONE_NUMBER_ID = '123456789';
  process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
  process.env.WHATSAPP_OTP_TEMPLATE = 'hajar_otp';
};

// Replaces fetch with a stub that answers each call from `responses` in order
// and records the requests it received.
const stubFetch = (responses) => {
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    const { status = 200, body = {} } = responses[calls.length - 1] || {};
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
  return calls;
};

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  ENV_KEYS.forEach((k) => delete process.env[k]);
  savedFetch = global.fetch;
  savedLog = console.log;
  console.log = () => {};
});

afterEach(() => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  global.fetch = savedFetch;
  console.log = savedLog;
});

test('recipient is the E.164 number without "+"', () => {
  assert.strictEqual(toWhatsAppRecipient('+436601234567'), '436601234567');
});

test('template language follows the customer, falling back to the default', () => {
  assert.strictEqual(templateLanguageFor('ar'), 'ar');
  assert.strictEqual(templateLanguageFor('de'), 'de');
  assert.strictEqual(templateLanguageFor('fr'), 'de');
  process.env.WHATSAPP_TEMPLATE_DEFAULT_LANGUAGE = 'en';
  assert.strictEqual(templateLanguageFor(undefined), 'en');
});

test('payload is an authentication template with the code in body and copy-code button', () => {
  configure();
  const payload = buildOtpTemplatePayload('+436601234567', '123456', 'ar');
  assert.strictEqual(payload.messaging_product, 'whatsapp');
  assert.strictEqual(payload.to, '436601234567');
  assert.strictEqual(payload.template.name, 'hajar_otp');
  assert.deepStrictEqual(payload.template.language, { code: 'ar' });
  assert.deepStrictEqual(payload.template.components, [
    { type: 'body', parameters: [{ type: 'text', text: '123456' }] },
    { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: '123456' }] }
  ]);
});

test('not configured: skipped in development, error in production', async () => {
  const calls = stubFetch([]);
  assert.deepStrictEqual(await sendWhatsAppOtp('+436601234567', '123456', 'de'), { skipped: true });
  assert.strictEqual(calls.length, 0);

  process.env.NODE_ENV = 'production';
  await assert.rejects(sendWhatsAppOtp('+436601234567', '123456', 'de'), WhatsAppSendError);
});

test('production sends the template to the phone number ID endpoint with the bearer token', async () => {
  configure();
  process.env.NODE_ENV = 'production';
  const calls = stubFetch([{ body: { messages: [{ id: 'wamid.1' }] } }]);
  await sendWhatsAppOtp('+436601234567', '654321', 'de');
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].url, 'https://graph.facebook.com/v23.0/123456789/messages');
  assert.strictEqual(calls[0].init.headers.Authorization, 'Bearer test-token');
  assert.strictEqual(calls[0].body.template.language.code, 'de');
});

test('outside production the code goes out as plain text in the customer language', async () => {
  configure(); // template name set, still plain text in development
  const calls = stubFetch([{ body: { messages: [{ id: 'wamid.3' }] } }]);
  await sendWhatsAppOtp('+436601234567', '246810', 'ar');
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].body.type, 'text');
  assert.strictEqual(calls[0].body.to, '436601234567');
  assert.match(calls[0].body.text.body, /^246810 هو رمز التحقق/);
});

test('production: a missing template name counts as not configured', async () => {
  configure();
  delete process.env.WHATSAPP_OTP_TEMPLATE;
  process.env.NODE_ENV = 'production';
  const calls = stubFetch([]);
  await assert.rejects(sendWhatsAppOtp('+436601234567', '123456', 'de'), WhatsAppSendError);
  assert.strictEqual(calls.length, 0);
});

test('retries in the default language when the template language is missing', async () => {
  configure();
  process.env.NODE_ENV = 'production';
  const calls = stubFetch([
    { status: 404, body: { error: { code: 132001, message: 'Template name does not exist in the translation' } } },
    { body: { messages: [{ id: 'wamid.2' }] } }
  ]);
  await sendWhatsAppOtp('+436601234567', '654321', 'ar');
  assert.deepStrictEqual(calls.map((c) => c.body.template.language.code), ['ar', 'de']);
});

test('other Meta errors are thrown with their code', async () => {
  configure();
  stubFetch([{ status: 400, body: { error: { code: 131026, message: 'Message undeliverable' } } }]);
  await assert.rejects(
    sendWhatsAppOtp('+436601234567', '654321', 'de'),
    (err) => err instanceof WhatsAppSendError && err.metaCode === 131026 && err.status === 400
  );
});
