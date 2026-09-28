const { test } = require('node:test');
const assert = require('node:assert');
const { isPushServiceEndpoint } = require('../utils/pushService');

test('isPushServiceEndpoint accepts the browsers\' push services only', () => {
  for (const ok of [
    'https://fcm.googleapis.com/fcm/send/dXk3-abc:APA91bExample',
    'https://updates.push.services.mozilla.com/wpush/v2/gAAAAABexample',
    'https://wns2-par02p.notify.windows.com/w/?token=BQYAAAexample',
    'https://web.push.apple.com/QGuQyavXutnMH0example'
  ]) {
    assert.strictEqual(isPushServiceEndpoint(ok), true, ok);
  }

  for (const bad of [
    'http://fcm.googleapis.com/fcm/send/x', // not https
    'https://127.0.0.1/push',
    'https://169.254.169.254/latest/meta-data',
    'https://10.0.0.5:6379/',
    'https://fcm.googleapis.com.attacker.test/x', // lookalike host
    'https://xnotify.windows.com/w/', // suffix must start at a label boundary
    'https://fcm.googleapis.com:8443/fcm/send/x', // non-default port
    'https://user:pw@fcm.googleapis.com/fcm/send/x',
    'javascript:alert(1)',
    `https://fcm.googleapis.com/${'x'.repeat(3000)}`,
    '',
    null,
    undefined,
    { href: 'https://fcm.googleapis.com/' }
  ]) {
    assert.strictEqual(isPushServiceEndpoint(bad), false, JSON.stringify(bad)?.slice(0, 80));
  }
});
