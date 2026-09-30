// Proves a backup can really be restored and read, so the first real restore
// isn't also the first try (README §4.7, monthly):
//   1. creates a new, empty scratch database (supermarket_restore_test_<time>);
//   2. restores the backup into it and counts rows in the main tables;
//   3. runs scripts/checkEncryptionKey.js against it (the key opens the data);
//   4. drops the scratch database. It never drops any other database.
//
// Usage (from backend/):
//   npm run backup:restore-test                          # newest backup in BACKUP_DIR
//   npm run backup:restore-test -- path/to/backup.dump   # a specific file
//   npm run backup:restore-test -- --prompt              # also test a pasted key copy
// Env: RESTORE_TEST_URL: the Postgres server to create the scratch database
//      on (any database URL there; needs CREATEDB). Defaults to DIRECT_URL /
//      DATABASE_URL, i.e. next to the live database. BACKUP_DIR, PG_BIN_DIR
//      as for backupDatabase.js.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const {
  pgEnvFromUrl,
  schemaFromUrl,
  usesConnectionPooler,
  withDatabase,
  parseBackupDate,
  REQUIRED_TABLES
} = require('../utils/backup');
const { backupDir, databaseUrlForBackups, runPgTool, log } = require('../utils/backupTools');

const SCRATCH_NAME = /^supermarket_restore_test_\d+$/;

const newestBackup = (dir) => {
  if (!fs.existsSync(dir)) return null;
  const names = fs.readdirSync(dir).filter((name) => parseBackupDate(name)).sort();
  return names.length > 0 ? path.join(dir, names[names.length - 1]) : null;
};

const psql = (pgEnv, sql) => runPgTool('psql', ['--no-psqlrc', '-At', '-v', 'ON_ERROR_STOP=1', '-c', sql], pgEnv);

// stdio inherited so the key check's --prompt can read from this terminal.
const runKeyCheck = (databaseUrl, args) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [path.join(__dirname, 'checkEncryptionKey.js'), ...args], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl }
  });
  child.on('error', reject);
  child.on('close', (code) => resolve(code === 0));
});

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => !a.startsWith('--'));
  const file = fileArg ? path.resolve(fileArg) : newestBackup(backupDir());
  if (!file || !fs.existsSync(file)) {
    throw new Error(`No backup file found (looked in ${fileArg ? path.resolve(fileArg) : backupDir()}).`);
  }

  const serverUrl = process.env.RESTORE_TEST_URL || databaseUrlForBackups();
  if (usesConnectionPooler(serverUrl)) throw new Error('RESTORE_TEST_URL must be a direct connection, not the pooler.');
  const scratch = `supermarket_restore_test_${Date.now()}`;
  const serverEnv = pgEnvFromUrl(serverUrl);
  const scratchUrl = withDatabase(serverUrl, scratch);
  const scratchEnv = pgEnvFromUrl(scratchUrl);
  const schema = schemaFromUrl(serverUrl);

  log(`Restoring ${path.basename(file)} into a new database "${scratch}" on ${serverEnv.PGHOST} ...`);
  await psql(serverEnv, `CREATE DATABASE "${scratch}"`);
  let passed = false;
  try {
    // --clean --if-exists: the dump creates the schema, which a new database
    // already has; safe here because this database was created just above.
    await runPgTool('pg_restore', ['--no-owner', '--no-privileges', '--clean', '--if-exists', '--exit-on-error', `--dbname=${scratch}`, file], scratchEnv);
    const counts = await psql(scratchEnv, REQUIRED_TABLES
      .map((t) => `SELECT '${t}', count(*) FROM "${schema}"."${t}"`)
      .join(' UNION ALL '));
    log(`Restored. Rows: ${counts.trim().split(/\r?\n/).map((line) => line.replace('|', ' ')).join(', ')}`);

    log('Checking the encryption key against the restored data ...');
    passed = await runKeyCheck(scratchUrl, args.includes('--prompt') ? ['--prompt'] : []);
  } finally {
    if (SCRATCH_NAME.test(scratch)) {
      await psql(serverEnv, `DROP DATABASE IF EXISTS "${scratch}"`);
      log(`Dropped the scratch database "${scratch}".`);
    }
  }

  if (passed) {
    log(`RESTORE TEST PASSED: ${path.basename(file)} restores, and the key opens its encrypted data.`);
  } else {
    log('RESTORE TEST FAILED: the backup restored, but the key check failed (see above).');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  log(`RESTORE TEST FAILED: ${err.message || err}`);
  process.exitCode = 1;
});
