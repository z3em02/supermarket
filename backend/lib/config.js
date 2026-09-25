const JWT_SECRET = process.env.JWT_SECRET;
const SECTION_UNLOCK_SECRET = process.env.SECTION_UNLOCK_SECRET;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error(
    'FATAL: JWT_SECRET is missing or too short. Set a random secret of at least 64 characters ' +
    'in your .env file (e.g. via: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))").'
  );
  process.exit(1);
}

if (!SECTION_UNLOCK_SECRET || SECTION_UNLOCK_SECRET.length < 32) {
  console.error(
    'FATAL: SECTION_UNLOCK_SECRET is missing or too short. It must differ from JWT_SECRET. ' +
    'Set a random 64-char hex value in your .env file.'
  );
  process.exit(1);
}

if (JWT_SECRET === SECTION_UNLOCK_SECRET) {
  console.error('FATAL: SECTION_UNLOCK_SECRET must be different from JWT_SECRET.');
  process.exit(1);
}

// Finding 2.2 fix: Validate ENCRYPTION_KEY at startup
if (process.env.NODE_ENV === 'production' && (!ENCRYPTION_KEY || !/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY))) {
  console.error(
    'FATAL: ENCRYPTION_KEY is required and must be a 64-character hex string (32 bytes) in production. ' +
    'Set it in your .env file via: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
  process.exit(1);
} else if (ENCRYPTION_KEY && !/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY)) {
  console.error('FATAL: If provided, ENCRYPTION_KEY must be a valid 64-character hex string (32 bytes).');
  process.exit(1);
}

// Cookie security: force `secure` flag whenever explicitly requested (e.g. for
// staging/preview deployments that serve over HTTPS but don't set NODE_ENV=production),
// or when running in production mode.
const SECURE_COOKIES = process.env.FORCE_SECURE_COOKIES === 'true' || process.env.NODE_ENV === 'production';

module.exports = { JWT_SECRET, SECTION_UNLOCK_SECRET, ENCRYPTION_KEY, SECURE_COOKIES };
