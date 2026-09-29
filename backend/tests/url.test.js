const { test } = require('node:test');
const assert = require('node:assert');
const { isPrivateOrLocalHost, isPrivateIPv4Parts } = require('../utils/url');

test('blocks loopback, private, link-local and CGNAT IPv4', () => {
  for (const host of [
    '127.0.0.1', '127.5.5.5', '10.0.0.1', '10.255.255.255',
    '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254',
    '0.0.0.0', '100.64.0.1', '100.127.255.255'
  ]) {
    assert.strictEqual(isPrivateOrLocalHost(host), true, `${host} should be blocked`);
  }
});

test('allows normal public IPv4 and hostnames', () => {
  for (const host of ['8.8.8.8', '1.1.1.1', '172.15.0.1', '172.32.0.1', '100.63.255.255', '100.128.0.1', 'example.com', 'maps.google.com']) {
    assert.strictEqual(isPrivateOrLocalHost(host), false, `${host} should be allowed`);
  }
});

test('blocks localhost and internal TLDs', () => {
  for (const host of ['localhost', 'LOCALHOST', 'foo.local', 'svc.internal', '::1']) {
    assert.strictEqual(isPrivateOrLocalHost(host), true, `${host} should be blocked`);
  }
});

test('blocks IPv6 loopback, ULA, link-local and IPv4-mapped metadata', () => {
  for (const host of [
    '::1', '[::1]', 'fc00::1', 'fd12:3456::1', 'fe80::1',
    '::ffff:169.254.169.254', '::ffff:a9fe:a9fe', '::ffff:127.0.0.1'
  ]) {
    assert.strictEqual(isPrivateOrLocalHost(host), true, `${host} should be blocked`);
  }
});

test('blocks unparseable hosts (fail closed) and allows public IPv6', () => {
  assert.strictEqual(isPrivateOrLocalHost('not:valid:ipv6:::x'), true);
  assert.strictEqual(isPrivateOrLocalHost('2001:4860:4860::8888'), false); // Google public DNS
});

test('isPrivateIPv4Parts treats malformed octets as unsafe', () => {
  assert.strictEqual(isPrivateIPv4Parts([999, 1, 1, 1]), true);
  assert.strictEqual(isPrivateIPv4Parts([8, 8, 8]), true); // wrong length
  assert.strictEqual(isPrivateIPv4Parts([8, 8, 8, 8]), false);
});
