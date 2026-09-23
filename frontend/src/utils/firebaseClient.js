import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const isFirebasePhoneAuthConfigured = () => Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app = null;
const getFirebaseApp = () => {
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
};

let recaptchaVerifier = null;

// An invisible reCAPTCHA bound to a DOM node (must already be mounted).
// Reused across calls in the same page session; cleared via resetRecaptcha()
// when the verification modal closes so a stale widget doesn't linger.
const getRecaptchaVerifier = (containerId) => {
  const auth = getAuth(getFirebaseApp());
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
  }
  return recaptchaVerifier;
};

export const resetRecaptcha = () => {
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear(); } catch { /* already torn down */ }
    recaptchaVerifier = null;
  }
};

// Triggers Firebase to text a code to phoneNumber (must be E.164, e.g.
// "+436601234567"). Returns a confirmationResult to pass into
// confirmPhoneVerificationCode along with the code the customer enters.
export const sendPhoneVerificationCode = async (phoneNumber, containerId) => {
  const auth = getAuth(getFirebaseApp());
  const verifier = getRecaptchaVerifier(containerId);
  return signInWithPhoneNumber(auth, phoneNumber, verifier);
};

// Confirms the SMS code with Firebase and returns a Firebase ID token proving
// possession of the phone number, for the backend to verify. Firebase Auth is
// only used transiently here — the app's own customer JWT stays the real
// session, so we sign back out of Firebase immediately after.
export const confirmPhoneVerificationCode = async (confirmationResult, code) => {
  const result = await confirmationResult.confirm(code);
  const idToken = await result.user.getIdToken();
  try {
    await signOut(getAuth(getFirebaseApp()));
  } catch { /* non-fatal */ }
  return idToken;
};
