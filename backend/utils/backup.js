// Pure helpers for the backup scripts (scripts/backupDatabase.js,
// scripts/restoreTest.js). Kept out of the scripts so they're unit-tested
// (tests/backup.test.js). README §4.7 describes the backup setup.

const DAY_MS = 24 * 60 * 60 * 1000;

const parseDatabaseUrl = (databaseUrl) => {
  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error('The database URL is not a valid URL.');
  }
  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    throw new Error('The database URL must start with postgresql://');
  }
  if (!url.hostname || url.pathname.length < 2) {
    throw new Error('The database URL needs a host and a database name.');
  }
  return url;
};

// libpq environment variables for a postgresql:// URL. The backup tools get
// the password through PGPASSWORD rather than on the command line, where any
// local user could read it with `ps`.
const pgEnvFromUrl = (databaseUrl) => {
  const url = parseDatabaseUrl(databaseUrl);
  const env = {
    PGHOST: url.hostname.replace(/^\[|\]$/g, ''), // IPv6 literals come bracketed
    PGPORT: url.port || '5432',
    PGDATABASE: decodeURIComponent(url.pathname.slice(1))
  };
  if (url.username) env.PGUSER = decodeURIComponent(url.username);
  if (url.password) env.PGPASSWORD = decodeURIComponent(url.password);
  const sslmode = url.searchParams.get('sslmode');
  if (sslmode) env.PGSSLMODE = sslmode;
  return env;
};

// The Postgres schema Prisma uses (?schema=..., default public). Dumping just
// that schema keeps hosted databases' own schemas (Supabase: auth, storage, …)
// out of the backup, so it restores into a plain empty database.
const schemaFromUrl = (databaseUrl) =>
  parseDatabaseUrl(databaseUrl).searchParams.get('schema') || 'public';

// Supabase's transaction pooler (port 6543 / ?pgbouncer=true) can't run
// pg_dump; backups need the direct connection (DIRECT_URL, port 5432).
const usesConnectionPooler = (databaseUrl) => {
  const url = parseDatabaseUrl(databaseUrl);
  return url.port === '6543' || url.searchParams.get('pgbouncer') === 'true';
};

// The same server and credentials, another database (the restore test's
// scratch database).
const withDatabase = (databaseUrl, databaseName) => {
  const url = parseDatabaseUrl(databaseUrl);
  url.pathname = `/${encodeURIComponent(databaseName)}`;
  url.searchParams.delete('pgbouncer');
  return url.toString();
};

// supermarket-2026-09-30T02-15-00Z.dump — UTC, sorts by time, and no ':' so
// the name is valid on Windows too.
const backupFileName = (date) =>
  `supermarket-${date.toISOString().slice(0, 19).replace(/:/g, '-')}Z.dump`;

const BACKUP_NAME = /^supermarket-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})Z\.dump$/;

const parseBackupDate = (fileName) => {
  const m = BACKUP_NAME.exec(fileName);
  if (!m) return null;
  const date = new Date(`${m[1]}T${m[2]}:${m[3]}:${m[4]}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Which backup files to delete. Keeps everything from the last `keepDays`
// days, the newest backup of each of the last `keepMonths` calendar months
// (this one included, UTC), and always the newest backup of all. Files that
// don't look like our backups are never selected.
const selectBackupsToDelete = (fileNames, { now = new Date(), keepDays = 14, keepMonths = 3 } = {}) => {
  const backups = fileNames
    .map((name) => ({ name, date: parseBackupDate(name) }))
    .filter((b) => b.date)
    .sort((a, b) => b.date - a.date); // newest first
  if (backups.length === 0) return [];

  const keep = new Set([backups[0].name]);
  const dayCutoff = now.getTime() - keepDays * DAY_MS;
  const monthIndex = (d) => d.getUTCFullYear() * 12 + d.getUTCMonth();
  const oldestMonth = monthIndex(now) - (keepMonths - 1);
  const monthsKept = new Set();
  for (const b of backups) {
    if (b.date.getTime() >= dayCutoff) keep.add(b.name);
    const month = monthIndex(b.date);
    if (month >= oldestMonth && !monthsKept.has(month)) {
      monthsKept.add(month); // newest first, so this is the month's newest
      keep.add(b.name);
    }
  }
  return backups.filter((b) => !keep.has(b.name)).map((b) => b.name);
};

// Tables a backup must contain data for, checked against `pg_restore --list`
// output (lines like "3471; 0 16420 TABLE DATA public Order postgres").
const REQUIRED_TABLES = ['Order', 'OrderItem', 'Customer', 'Product', 'Accounting', 'StoreSettings'];

const missingTablesInToc = (tocText, schema = 'public', tables = REQUIRED_TABLES) => {
  const present = new Set();
  for (const line of String(tocText).split(/\r?\n/)) {
    const m = /\bTABLE DATA (\S+) "?([^"\s]+)"? /.exec(line);
    if (m && m[1] === schema) present.add(m[2]);
  }
  return tables.filter((t) => !present.has(t));
};

module.exports = {
  pgEnvFromUrl,
  schemaFromUrl,
  usesConnectionPooler,
  withDatabase,
  backupFileName,
  parseBackupDate,
  selectBackupsToDelete,
  missingTablesInToc,
  REQUIRED_TABLES
};
