// Database backup, meant to run nightly from cron (README §4.7):
//   1. pg_dump of the app's schema (custom format, compressed) into BACKUP_DIR;
//   2. checks the file with pg_restore --list before giving it its real name;
//   3. deletes old backups (all of the last BACKUP_KEEP_DAYS days, plus the
//      newest of each of the last BACKUP_KEEP_MONTHS months);
//   4. if BACKUP_COPY_COMMAND is set, runs it to copy the file off the server.
//
// Usage (from backend/):  npm run backup
// Env: DIRECT_URL (or DATABASE_URL), BACKUP_DIR (default: <repo>/backups),
//      BACKUP_KEEP_DAYS (14), BACKUP_KEEP_MONTHS (3), BACKUP_COPY_COMMAND,
//      PG_BIN_DIR (folder with pg_dump/pg_restore if not on PATH).
//
// A backup only helps together with the ENCRYPTION_KEY: customer contact
// data and order snapshots in it are encrypted. Keep the key somewhere else.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const {
  pgEnvFromUrl,
  schemaFromUrl,
  backupFileName,
  selectBackupsToDelete,
  missingTablesInToc
} = require('../utils/backup');
const { backupDir, databaseUrlForBackups, runPgTool, log } = require('../utils/backupTools');

const intFromEnv = (name, fallback) => {
  const value = Number.parseInt(process.env[name], 10);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
};

// The copy command gets the file as $BACKUP_FILE (%BACKUP_FILE% on Windows),
// e.g. rclone copy "$BACKUP_FILE" offsite:hajar-backups
const runCopyCommand = (command, file) => new Promise((resolve, reject) => {
  const child = spawn(command, { shell: true, stdio: 'inherit', env: { ...process.env, BACKUP_FILE: file } });
  child.on('error', reject);
  child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`BACKUP_COPY_COMMAND failed (exit code ${code}).`))));
});

async function main() {
  const databaseUrl = databaseUrlForBackups();
  const pgEnv = pgEnvFromUrl(databaseUrl);
  const schema = schemaFromUrl(databaseUrl);
  const dir = backupDir();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });

  const file = path.join(dir, backupFileName(new Date()));
  const partial = `${file}.partial`;
  const started = Date.now();
  log(`Backing up database "${pgEnv.PGDATABASE}" on ${pgEnv.PGHOST} (schema ${schema}) ...`);
  try {
    await runPgTool('pg_dump', ['--format=custom', '--no-owner', '--no-privileges', `--schema=${schema}`, `--file=${partial}`], pgEnv);
    fs.chmodSync(partial, 0o600); // customer names and order data: owner only
    // Only a complete, readable dump with the app's tables gets the real name.
    const toc = await runPgTool('pg_restore', ['--list', partial], {});
    const missing = missingTablesInToc(toc, schema);
    if (missing.length > 0) throw new Error(`The dump has no data for table(s): ${missing.join(', ')}.`);
    fs.renameSync(partial, file);
  } catch (err) {
    fs.rmSync(partial, { force: true });
    throw err;
  }
  const sizeMb = (fs.statSync(file).size / 1024 / 1024).toFixed(2);
  log(`Wrote ${file} (${sizeMb} MB in ${((Date.now() - started) / 1000).toFixed(1)} s); pg_restore can read it.`);

  const toDelete = selectBackupsToDelete(fs.readdirSync(dir), {
    keepDays: intFromEnv('BACKUP_KEEP_DAYS', 14),
    keepMonths: intFromEnv('BACKUP_KEEP_MONTHS', 3)
  });
  for (const name of toDelete) fs.rmSync(path.join(dir, name));
  if (toDelete.length > 0) log(`Deleted ${toDelete.length} old backup(s): ${toDelete.join(', ')}`);

  if (process.env.BACKUP_COPY_COMMAND) {
    log('Copying the backup off the server (BACKUP_COPY_COMMAND) ...');
    await runCopyCommand(process.env.BACKUP_COPY_COMMAND, file);
    log('Copied.');
  } else {
    log('WARNING: BACKUP_COPY_COMMAND is not set, so this backup exists only on this server.');
  }
}

main().catch((err) => {
  log(`BACKUP FAILED: ${err.message || err}`);
  process.exitCode = 1;
});
