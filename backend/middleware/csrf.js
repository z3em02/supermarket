const crypto = require('crypto');

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const generateCsrfToken = () => crypto.randomBytes(32).toString('hex');

// Deliberately NOT httpOnly — the frontend must be able to read this value
// with JS to echo it back as a header. That's what makes the pattern work:
// a cross-site attacker can make the browser auto-send the session cookie,
// but same-origin policy stops them reading this cookie to produce a
// matching X-CSRF-Token header.
const setCsrfCookie = (res, token, maxAgeMs) => {
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs
  });
};

const clearCsrfCookie = (res) => {
  res.clearCookie(CSRF_COOKIE, { path: '/' });
};

// Only relevant when this request's authentication came from a cookie, not
// a Bearer header — header-based auth is already immune to CSRF (a
// cross-site page can't attach a custom Authorization header to a request
// it forges), so this never adds friction to the app's normal header-auth
// flow. It only stops the specific attack the HttpOnly session cookie made
// newly possible: a forged cross-site request that rides on the
// auto-attached cookie alone. Returns false (and has already sent the 403)
// if the check fails — callers must stop processing when it returns false.
const requireCsrfForCookieAuth = (req, res, usedCookieAuth) => {
  if (!usedCookieAuth) return true;
  if (!MUTATING_METHODS.has(req.method)) return true;

  const headerToken = req.headers[CSRF_HEADER];
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    res.status(403).json({ error: 'Invalid or missing CSRF token' });
    return false;
  }
  return true;
};

module.exports = { generateCsrfToken, setCsrfCookie, clearCsrfCookie, requireCsrfForCookieAuth, CSRF_COOKIE, CSRF_HEADER };
