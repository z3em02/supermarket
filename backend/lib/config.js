const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error(
    'FATAL: JWT_SECRET is missing or too short. Set a random secret of at least 32 characters ' +
    'in your .env file (e.g. via: openssl rand -base64 48).'
  );
  process.exit(1);
}

module.exports = { JWT_SECRET };
