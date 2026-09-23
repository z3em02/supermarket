const path = require('path');
const fs = require('fs');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  || path.join(__dirname, '..', 'firebase-service-account.json');

let firebaseAuth = null;
let initError = null;

// Lazily initializes firebase-admin on first use, mirroring how emailService
// checks SMTP config on demand rather than failing at server boot if phone
// verification hasn't been configured yet.
const getFirebaseAuth = () => {
  if (firebaseAuth) return firebaseAuth;
  if (initError) throw initError;

  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    initError = new Error(
      `Firebase service account file not found at ${SERVICE_ACCOUNT_PATH}. Set FIREBASE_SERVICE_ACCOUNT_PATH or place the downloaded key there to enable phone verification.`
    );
    throw initError;
  }

  const app = getApps().length
    ? getApps()[0]
    : initializeApp({ credential: cert(require(SERVICE_ACCOUNT_PATH)) });
  firebaseAuth = getAuth(app);
  return firebaseAuth;
};

const isFirebaseConfigured = () => {
  try {
    getFirebaseAuth();
    return true;
  } catch {
    return false;
  }
};

// Verifies a Firebase Phone Auth ID token and returns its decoded claims
// (includes phone_number). Throws if the token is invalid, expired, or
// Firebase isn't configured — callers should catch and return a 400/503.
const verifyFirebaseIdToken = async (idToken) => {
  const auth = getFirebaseAuth();
  return auth.verifyIdToken(idToken);
};

module.exports = { verifyFirebaseIdToken, isFirebaseConfigured };
