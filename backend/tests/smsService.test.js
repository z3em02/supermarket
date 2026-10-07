const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const {
  sendSmsOtp,
  isSmsConfigured,
  smsTextFor,
  toSmsRecipient,
  SmsSendError
} = require('../utils/smsService');

const ENV_KEYS = ['SEVEN_API_KEY', 'SEVEN_SMS_FROM', 'NODE_ENV'];
let savedEnv;
let savedFetch;
let savedLog;

const configure = () => {
  process.env.SEVEN_API_KEY = 'test-key';
  process.env.SEVEN_SMS_FROM = 'Hajar';
};

// Stub fetch: answers each call from `responses` in order (seven.io returns the
// body as text — JSON or a bare status code), and records the requests.
const stubFetch = (responses) => {
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    const { status = 200, text = '{"success":"100"}' } = responses[calls.length - 1] || {};
    return { ok: status >= 200 && status < 300, status, text: async () => text };
  };
  return calls;
};

beforeEach(() => {
  savedEnv = {};
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  savedFetch = global.fetch;
  savedLog = console.log;
  console.log = () => {};
  for (const k of ENV_KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  global.fetch = savedFetch;
  console.log = savedLog;
});

test('toSmsRecipient strips non-digits (country code, no "+")', () => {
  assert.strictEqual(toSmsRecipient('+43 660 1234567'), '436601234567');
});

test('smsTextFor includes the code and falls back to German', () => {
  assert.match(smsTextFor('654321', 'de'), /654321/);
  assert.match(smsTextFor('654321', 'ar'), /654321/);
  // Unknown language -> German template.
  assert.strictEqual(smsTextFor('1', 'xx'), smsTextFor('1', 'de'));
});

test('not configured outside production logs and skips (no fetch)', async () => {
  process.env.NODE_ENV = 'test';
  let fetched = false;
  global.fetch = async () => { fetched = true; return {}; };
  const result = await sendSmsOtp('+436601234567', '123456', 'de');
  assert.deepStrictEqual(result, { skipped: true });
  assert.strictEqual(fetched, false);
  assert.strictEqual(isSmsConfigured(), false);
});

test('not configured in production throws', async () => {
  process.env.NODE_ENV = 'production';
  await assert.rejects(
    () => sendSmsOtp('+436601234567', '123456', 'de'),
    (err) => err instanceof SmsSendError
  );
});

test('configured: posts to seven.io with the API key and digits-only recipient', async () => {
  process.env.NODE_ENV = 'production';
  configure();
  const calls = stubFetch([{ status: 200, text: '{"success":"100","messages":[{"success":true}]}' }]);
  await sendSmsOtp('+43 660 1234567', '424242', 'de');
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].url, 'https://gateway.seven.io/api/sms');
  assert.strictEqual(calls[0].init.headers['X-Api-Key'], 'test-key');
  assert.strictEqual(calls[0].body.to, '436601234567');
  assert.strictEqual(calls[0].body.from, 'Hajar');
  assert.match(calls[0].body.text, /424242/);
});

test('seven.io auth failure (900) throws a config error', async () => {
  process.env.NODE_ENV = 'production';
  configure();
  stubFetch([{ status: 200, text: '{"success":"900"}' }]);
  await assert.rejects(
    () => sendSmsOtp('+436601234567', '123456', 'de'),
    (err) => err instanceof SmsSendError && err.isConfigError === true && String(err.sevenCode) === '900'
  );
});

test('per-recipient failure (messages[].success=false) throws', async () => {
  process.env.NODE_ENV = 'production';
  configure();
  stubFetch([{ status: 200, text: '{"success":"100","messages":[{"success":false,"error_text":"bad number"}]}' }]);
  await assert.rejects(
    () => sendSmsOtp('+436601234567', '123456', 'de'),
    (err) => err instanceof SmsSendError
  );
});

test('legacy bare-status response ("100") is treated as success', async () => {
  process.env.NODE_ENV = 'production';
  configure();
  const calls = stubFetch([{ status: 200, text: '100' }]);
  await sendSmsOtp('+436601234567', '123456', 'de');
  assert.strictEqual(calls.length, 1);
});
