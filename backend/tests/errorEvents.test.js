const { test } = require('node:test');
const assert = require('node:assert');
const { scrubErrorEvent, scrubText } = require('../utils/errorEvents');

test('scrubText masks email addresses and phone numbers', () => {
  assert.strictEqual(
    scrubText("Can't send mail - all recipients were rejected: 550 <kunde.name+shop@example.co.at>"),
    "Can't send mail - all recipients were rejected: 550 <[email]>"
  );
  for (const phone of ['+43 660 1234567', '+436601234567', '0660/1234567', '0043-660-123 4567']) {
    assert.strictEqual(scrubText(`WhatsApp send failed for ${phone}`), 'WhatsApp send failed for [phone]', phone);
  }
});

test('scrubText leaves order ids, amounts, dates and codes alone', () => {
  for (const text of [
    'Order 3f2a9c10-0660-4123-8a4b-000012345678 not found',
    'Insufficient stock for "Milch 1L" (need 12, have 3)',
    'Total 1234.50 does not match 1234.55',
    'Invalid date 2026-09-30',
    'HTTP 503 from https://photon.komoot.io/api'
  ]) {
    assert.strictEqual(scrubText(text), text);
  }
});

test('scrubText drops the data Prisma prints between the first and last line', () => {
  const prismaMessage = [
    'Invalid `prisma.order.create()` invocation in',
    '/var/www/supermarket/backend/controllers/orderController.js:420:35',
    '{',
    '  data: { customerName: "Maria Huber", notes: "Bitte 2x klingeln", totalAmount: 42.1 }',
    '}',
    'Argument `totalAmount` is missing.'
  ].join('\n');
  const scrubbed = scrubText(prismaMessage);
  assert.strictEqual(scrubbed, 'Invalid `prisma.order.create()` invocation in\n…\nArgument `totalAmount` is missing.');
  assert.ok(!scrubbed.includes('Maria'));
  assert.ok(scrubText('x'.repeat(2000)).length <= 501);
});

test('scrubErrorEvent keeps method + path, the stack and the request id; drops the rest', () => {
  const event = {
    request: {
      method: 'GET',
      url: 'https://shop.example/api/orders?page=1&search=Maria%20Huber#x',
      query_string: 'page=1&search=Maria%20Huber',
      headers: { cookie: 'token=abc', 'user-agent': 'Mozilla', 'x-forwarded-for': '203.0.113.9' },
      cookies: { token: 'abc' },
      data: '{"deliveryAddress":"Favoritenstraße 12"}'
    },
    user: { ip_address: '203.0.113.9' },
    breadcrumbs: [{ category: 'console', message: 'OTP for kunde@example.at: 123456' }],
    tags: { request_id: 'cf63fff8-f1e3-464f-9f09-8c9be4a958d3' },
    exception: {
      values: [{
        type: 'Error',
        value: 'Mail to kunde@example.at failed',
        stacktrace: { frames: [{ filename: 'orderController.js', lineno: 420, vars: { customer: { email: 'kunde@example.at' } } }] }
      }]
    },
    extra: { arguments: ['Create order error:', { message: 'Mail to kunde@example.at failed' }] }
  };
  const out = scrubErrorEvent(event);
  assert.deepStrictEqual(out.request, { method: 'GET', url: 'https://shop.example/api/orders' });
  assert.strictEqual(out.user, undefined);
  assert.strictEqual(out.breadcrumbs, undefined);
  assert.strictEqual(out.tags.request_id, 'cf63fff8-f1e3-464f-9f09-8c9be4a958d3');
  assert.strictEqual(out.exception.values[0].value, 'Mail to [email] failed');
  assert.deepStrictEqual(out.exception.values[0].stacktrace.frames[0], { filename: 'orderController.js', lineno: 420 });
  assert.deepStrictEqual(out.extra, { log: 'Create order error:' });
  assert.ok(!JSON.stringify(out).includes('kunde@example.at'));
  assert.ok(!JSON.stringify(out).includes('Maria'));
});

test('scrubErrorEvent handles message events and events without a request', () => {
  const out = scrubErrorEvent({ message: 'Health check: database not reachable (call +43 1 234 5678)', extra: {} });
  assert.strictEqual(out.message, 'Health check: database not reachable (call [phone])');
  assert.deepStrictEqual(out.extra, {});
  assert.deepStrictEqual(scrubErrorEvent({ logentry: { formatted: 'PII decrypt failed for x@y.at' } }).logentry, { message: 'PII decrypt failed for [email]' });
});
