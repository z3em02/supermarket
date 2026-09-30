// Checks that an encryption key really opens the encrypted customer data:
// by default the ENCRYPTION_KEY from .env, or with --prompt a key you paste
// (e.g. the copy in your password manager). Prints the key's fingerprint and
// how many sampled encrypted values decrypt with it. Never prints a key or any
// customer data. README §4.7.
//
// Usage (from backend/):
//   npm run key:check                 # the ENCRYPTION_KEY in .env
//   npm run key:check -- --prompt     # paste a key to test (input hidden)
//
// Exits 0 only if every sampled value decrypts. scripts/restoreTest.js runs
// this against a restored backup (DATABASE_URL pointed at the scratch copy).
require('dotenv').config();

const SAMPLE_PER_COLUMN = 500;
const ENCRYPTED_PREFIX = 'enc:v1:';
// Order snapshot columns written with encrypt() (see withDecryptedCustomer in
// controllers/orderShared.js); Customer's come from CUSTOMER_PII_FIELDS.
const ORDER_SNAPSHOT_FIELDS = ['customerName', 'customerPhone', 'customerEmail', 'deliveryAddress', 'deliveryNotes'];

// Reads one line without echoing it (pasted keys shouldn't land in the
// terminal's scrollback). Falls back to a plain line read when piped.
const promptHidden = (question) => new Promise((resolve, reject) => {
  const { stdin, stdout } = process;
  stdout.write(question);
  if (!stdin.isTTY) {
    let data = '';
    stdin.setEncoding('utf8');
    stdin.on('data', (chunk) => { data += chunk; });
    stdin.on('end', () => { stdout.write('\n'); resolve(data.split(/\r?\n/)[0]); });
    return;
  }
  let value = '';
  const finish = (err) => {
    stdin.setRawMode(false);
    stdin.pause();
    stdin.removeListener('data', onData);
    stdout.write('\n');
    if (err) reject(err); else resolve(value);
  };
  const onData = (chunk) => {
    for (const ch of chunk) {
      if (ch === '\r' || ch === '\n') return finish();
      if (ch === '\u0003') return finish(new Error('Cancelled.')); // Ctrl+C
      if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
      else value += ch;
    }
  };
  stdin.setRawMode(true);
  stdin.setEncoding('utf8');
  stdin.on('data', onData);
  stdin.resume();
});

async function main() {
  if (process.argv.includes('--prompt')) {
    process.env.ENCRYPTION_KEY = (await promptHidden('Paste the encryption key to test (input hidden): ')).trim();
  }
  if (!/^[0-9a-fA-F]{64}$/.test(process.env.ENCRYPTION_KEY || '')) {
    console.error('FAIL: the key is missing or not 64 hex characters.');
    process.exitCode = 1;
    return;
  }

  // piiCrypto reads the key when first loaded, so only after it's settled above.
  const { canDecrypt, keyFingerprint, CUSTOMER_PII_FIELDS } = require('../utils/piiCrypto');
  const prisma = require('../lib/prisma');

  try {
    console.log(`Key fingerprint: ${keyFingerprint()}`);
    const columns = [
      ...CUSTOMER_PII_FIELDS.map((field) => ['customer', 'Customer', field]),
      ...ORDER_SNAPSHOT_FIELDS.map((field) => ['order', 'Order', field])
    ];
    let checked = 0;
    let failed = 0;
    for (const [model, label, field] of columns) {
      const rows = await prisma[model].findMany({
        where: { [field]: { startsWith: ENCRYPTED_PREFIX } },
        select: { [field]: true },
        orderBy: { createdAt: 'desc' },
        take: SAMPLE_PER_COLUMN
      });
      if (rows.length === 0) continue;
      const ok = rows.filter((row) => canDecrypt(row[field])).length;
      checked += rows.length;
      failed += rows.length - ok;
      console.log(`  ${label}.${field}: ${ok}/${rows.length} decrypt${ok === rows.length ? '' : '  <-- FAILED'}`);
    }

    if (checked === 0) {
      console.log('WARNING: no encrypted values found, so nothing could be checked.');
    } else if (failed > 0) {
      console.error(`FAIL: ${failed} of ${checked} sampled values do NOT decrypt with this key.`);
      process.exitCode = 1;
    } else {
      console.log(`OK: all ${checked} sampled encrypted values decrypt with this key.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Key check failed:', err.message || err);
  process.exitCode = 1;
});
