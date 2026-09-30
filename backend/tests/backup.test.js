const { test } = require('node:test');
const assert = require('node:assert');
const {
  pgEnvFromUrl,
  schemaFromUrl,
  usesConnectionPooler,
  withDatabase,
  backupFileName,
  parseBackupDate,
  selectBackupsToDelete,
  missingTablesInToc,
  REQUIRED_TABLES
} = require('../utils/backup');

test('pgEnvFromUrl splits a URL into libpq variables, decoding user and password', () => {
  assert.deepStrictEqual(
    pgEnvFromUrl('postgresql://app%40shop:p%40ss%2Fw%3Ard@db.example.com:5433/super_market?sslmode=require&schema=public'),
    { PGHOST: 'db.example.com', PGPORT: '5433', PGDATABASE: 'super_market', PGUSER: 'app@shop', PGPASSWORD: 'p@ss/w:rd', PGSSLMODE: 'require' }
  );
  assert.deepStrictEqual(pgEnvFromUrl('postgres://localhost/shop'), { PGHOST: 'localhost', PGPORT: '5432', PGDATABASE: 'shop' });
  assert.strictEqual(pgEnvFromUrl('postgresql://u:p@[::1]:5432/shop').PGHOST, '::1');
});

test('pgEnvFromUrl rejects anything that is not a usable postgres URL', () => {
  assert.throws(() => pgEnvFromUrl('not a url'), /not a valid URL/);
  assert.throws(() => pgEnvFromUrl('mysql://u:p@host/db'), /postgresql:\/\//);
  assert.throws(() => pgEnvFromUrl('postgresql://u:p@host'), /database name/);
});

test('schemaFromUrl uses ?schema= and defaults to public', () => {
  assert.strictEqual(schemaFromUrl('postgresql://h/db'), 'public');
  assert.strictEqual(schemaFromUrl('postgresql://h/db?schema=shop'), 'shop');
});

test('usesConnectionPooler spots the Supabase transaction pooler', () => {
  assert.strictEqual(usesConnectionPooler('postgresql://u:p@aws-0.pooler.supabase.com:6543/postgres'), true);
  assert.strictEqual(usesConnectionPooler('postgresql://u:p@host:5432/postgres?pgbouncer=true'), true);
  assert.strictEqual(usesConnectionPooler('postgresql://u:p@db.x.supabase.co:5432/postgres'), false);
});

test('withDatabase keeps server, credentials and options but swaps the database', () => {
  const url = withDatabase('postgresql://u:p%40ss@host:5432/live?sslmode=require&pgbouncer=true', 'supermarket_restore_test_1');
  const env = pgEnvFromUrl(url);
  assert.strictEqual(env.PGDATABASE, 'supermarket_restore_test_1');
  assert.strictEqual(env.PGPASSWORD, 'p@ss');
  assert.strictEqual(env.PGSSLMODE, 'require');
  assert.strictEqual(usesConnectionPooler(url), false);
});

test('backup file names round-trip and sort by time', () => {
  const date = new Date('2026-09-30T02:15:07.123Z');
  const name = backupFileName(date);
  assert.strictEqual(name, 'supermarket-2026-09-30T02-15-07Z.dump');
  assert.ok(!name.includes(':'));
  assert.strictEqual(parseBackupDate(name).toISOString(), '2026-09-30T02:15:07.000Z');
  assert.ok(backupFileName(new Date('2026-10-01T00:00:00Z')) > name);
  for (const other of ['notes.txt', 'supermarket-2026-09-30T02-15-07Z.dump.partial', 'supermarket-2026-13-40T99-00-00Z.dump']) {
    assert.strictEqual(parseBackupDate(other), null, other);
  }
});

test('retention keeps the last N days plus the newest backup of each recent month', () => {
  const now = new Date('2026-09-30T03:00:00Z');
  const daily = [];
  // One backup a day at 02:00 from 2026-05-01 to 2026-09-30.
  for (let d = new Date('2026-05-01T02:00:00Z'); d <= now; d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
    daily.push(backupFileName(d));
  }
  const files = [...daily, 'README.txt', 'supermarket-2026-09-29T02-00-00Z.dump.partial'];
  const deleted = new Set(selectBackupsToDelete(files, { now, keepDays: 14, keepMonths: 3 }));
  const kept = daily.filter((n) => !deleted.has(n));

  // 14 days back from 2026-09-30 03:00 -> 2026-09-16 02:00 is just outside, 09-17..09-30 inside.
  const lastTwoWeeks = daily.filter((n) => parseBackupDate(n) >= new Date('2026-09-17T00:00:00Z'));
  assert.deepStrictEqual(lastTwoWeeks.filter((n) => deleted.has(n)), []);
  // Month-end backups of July and August (September's newest is today's).
  assert.ok(kept.includes('supermarket-2026-07-31T02-00-00Z.dump'));
  assert.ok(kept.includes('supermarket-2026-08-31T02-00-00Z.dump'));
  // June is older than 3 months: nothing kept.
  assert.ok(!kept.some((n) => n.startsWith('supermarket-2026-06-')));
  assert.strictEqual(kept.length, lastTwoWeeks.length + 2);
  // Other files are never selected.
  assert.ok(!deleted.has('README.txt'));
  assert.ok(!deleted.has('supermarket-2026-09-29T02-00-00Z.dump.partial'));
});

test('retention always keeps the newest backup, even when it is old', () => {
  const now = new Date('2027-06-01T00:00:00Z');
  const files = ['supermarket-2026-01-01T02-00-00Z.dump', 'supermarket-2026-01-02T02-00-00Z.dump'];
  assert.deepStrictEqual(selectBackupsToDelete(files, { now }), ['supermarket-2026-01-01T02-00-00Z.dump']);
  assert.deepStrictEqual(selectBackupsToDelete([], { now }), []);
});

test('missingTablesInToc reads pg_restore --list output', () => {
  const toc = [
    ';',
    '; Archive created at 2026-09-30 10:36:24',
    '5; 2615 35415 SCHEMA - public postgres',
    ...REQUIRED_TABLES.map((t, i) => `50${i}; 0 3540${i} TABLE DATA public ${t} postgres`),
    '5099; 1259 35500 TABLE public Driver postgres'
  ].join('\r\n');
  assert.deepStrictEqual(missingTablesInToc(toc), []);
  const withoutOrders = toc.split('\r\n').filter((l) => !/ TABLE DATA public Order /.test(l)).join('\n');
  assert.deepStrictEqual(missingTablesInToc(withoutOrders), ['Order']);
  assert.deepStrictEqual(missingTablesInToc(toc, 'shop'), REQUIRED_TABLES); // wrong schema
});
