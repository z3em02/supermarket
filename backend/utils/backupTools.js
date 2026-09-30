// Side-effecting helpers shared by scripts/backupDatabase.js and
// scripts/restoreTest.js (the pure ones are in utils/backup.js).
const path = require('path');
const { spawn } = require('child_process');
const { usesConnectionPooler } = require('./backup');

// Where backups are written: BACKUP_DIR, or backups/ at the repo root
// (gitignored). On a server, point BACKUP_DIR outside the web root.
const backupDir = () =>
  path.resolve(process.env.BACKUP_DIR || path.join(__dirname, '..', '..', 'backups'));

// Backups connect with DIRECT_URL (Supabase's pooler can't run pg_dump), or
// DATABASE_URL on a self-hosted Postgres where the two are the same.
const databaseUrlForBackups = () => {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('Set DIRECT_URL (or DATABASE_URL) in backend/.env.');
  if (usesConnectionPooler(url)) {
    throw new Error("That URL goes through the connection pooler (port 6543 / pgbouncer=true), which can't run pg_dump. Set DIRECT_URL to the direct connection (port 5432).");
  }
  return url;
};

// PG_BIN_DIR: the folder with pg_dump/pg_restore/psql when they aren't on
// PATH (e.g. C:\Program Files\PostgreSQL\17\bin on Windows).
const pgBin = (name) => (process.env.PG_BIN_DIR ? path.join(process.env.PG_BIN_DIR, name) : name);

// Runs a PostgreSQL client tool with the connection passed as libpq env vars
// (pgEnvFromUrl). Resolves with its stdout, rejects with its stderr.
const runPgTool = (name, args, pgEnv) => new Promise((resolve, reject) => {
  const child = spawn(pgBin(name), args, { env: { ...process.env, ...pgEnv }, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (d) => { stdout += d; });
  child.stderr.on('data', (d) => { stderr += d; });
  child.on('error', (err) => reject(err.code === 'ENOENT'
    ? new Error(`${name} not found. Install the PostgreSQL client tools (same major version as the server or newer), or set PG_BIN_DIR.`)
    : err));
  child.on('close', (code) => (code === 0
    ? resolve(stdout)
    : reject(new Error(`${name} failed (exit code ${code}): ${stderr.trim()}`))));
});

const log = (message) => console.log(`[${new Date().toISOString()}] ${message}`);

module.exports = { backupDir, databaseUrlForBackups, runPgTool, log };
