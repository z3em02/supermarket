const { test } = require('node:test');
const assert = require('node:assert');
const { publicOrigin, absoluteUrl } = require('../utils/emailService');

test('email links and images use the first FRONTEND_URL origin, absolute', () => {
  const saved = process.env.FRONTEND_URL;
  try {
    process.env.FRONTEND_URL = 'https://shop.example/, https://www.shop.example';
    assert.strictEqual(publicOrigin(), 'https://shop.example');
    assert.strictEqual(absoluteUrl('/api/uploads/logo-abc.png'), 'https://shop.example/api/uploads/logo-abc.png');
    assert.strictEqual(absoluteUrl('https://cdn.example/logo.png'), 'https://cdn.example/logo.png');
    assert.strictEqual(absoluteUrl(''), '');
    assert.strictEqual(absoluteUrl(null), null);
  } finally {
    if (saved === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = saved;
  }
});
