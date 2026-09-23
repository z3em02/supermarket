const path = require('path');
const fs = require('fs');

const SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  || path.join(__dirname, '..', 'firebase-service-account.json');

let adminApp = null;
let initError = null;

// Lazily initializes firebase-admin on first use, mirroring how emailService
// checks SMTP config on demand rather than failing at server boot if phone
// verification hasn't been configured yet.
const getFirebaseAdmin = () => {
  if (adminApp) return adminApp;
  if (initError) throw initError;

  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    initError = new Error(
      `Firebase service account file not found at ${SERVICE_ACCOUNT_PATH}. Set FIREBASE_SERVICE_ACCOUNT_PATH or place the downloaded key there to enable phone verification.`
    );
    throw initError;
  }

  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    const serviceAccount = require(SERVICE_ACCOUNT_PATH);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  adminApp = admin;
  return adminApp;
};

const isFirebaseConfigured = () => {
  try {
    getFirebaseAdmin();
    return true;
  } catch {
    return false;
  }
};

// Verifies a Firebase Phone Auth ID token and returns its decoded claims
// (includes phone_number). Throws if the token is invalid, expired, or
// Firebase isn't configured — callers should catch and return a 400/503.
const verifyFirebaseIdToken = async (idToken) => {
  const admin = getFirebaseAdmin();
  return admin.auth().verifyIdToken(idToken);
};

module.exports = { verifyFirebaseIdToken, isFirebaseConfigured };
