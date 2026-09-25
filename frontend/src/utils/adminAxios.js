import axios from 'axios';
import { getCsrfToken } from './csrf';

// Fired on any 401 from this instance so AuthContext can clear its `user`
// state. AuthContext listens and ProtectedRoute (already watching `user`)
// then does a normal in-app React Router redirect — no hard page reload,
// and nothing happens outside the admin section since ProtectedRoute only
// wraps admin routes.
export const ADMIN_AUTH_EXPIRED_EVENT = 'admin-auth-expired';

// Shared axios instance for authenticated admin API calls. Login itself uses
// plain axios (see AuthContext.jsx) since a 401 there means "wrong password",
// not "session expired", and must not trigger a redirect.
//
// localStorage migration: the admin session lives entirely in the HttpOnly
// `token` cookie now — there is nothing for this file to read from
// localStorage or attach as an Authorization header. `withCredentials` is
// what makes the browser actually send that cookie (and receive new ones)
// on cross-origin requests; same-origin production deploys don't strictly
// need it but it's harmless there.
const adminAxios = axios.create({ withCredentials: true });

const SECTION_UNLOCK_TOKEN_KEY = 'admin_section_unlock_token';
const SECTION_UNLOCK_FLAG_KEY = 'admin_section_unlocked';
const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

adminAxios.interceptors.request.use((config) => {
  // Attaches the section-PIN unlock token (see SectionPasscodeGate.jsx) to
  // every request. Harmless on routes that don't require it — the backend
  // only checks this header on the Settings/Buchhaltung/Kunden/Aktionen APIs.
  const unlockToken = sessionStorage.getItem(SECTION_UNLOCK_TOKEN_KEY);
  if (unlockToken) {
    config.headers['X-Section-Unlock'] = unlockToken;
  }

  // Cookie-based auth needs the matching CSRF header on any request that
  // changes state — see backend/middleware/csrf.js. Reading it fresh per
  // request instead of caching, since it's reissued on every login/password
  // change.
  const method = (config.method || 'get').toLowerCase();
  if (MUTATING_METHODS.has(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }

  return config;
});

adminAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminUser');
      // No hard redirect here — AuthContext's silent /api/auth/me
      // session-check on mount fires on every page (it wraps the whole
      // app), including public customer pages, so a blanket
      // window.location redirect on 401 would bounce ordinary visitors
      // into the admin login. Just notify AuthContext; it clears `user`,
      // and ProtectedRoute (which only wraps admin routes) reacts with a
      // normal in-app redirect if the visitor is actually there.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(ADMIN_AUTH_EXPIRED_EVENT));
      }
    } else if (error.response?.data?.code === 'SECTION_LOCKED') {
      // The unlock token expired, was never issued, or this call came from
      // a page that isn't behind SectionPasscodeGate at all (e.g. Dashboard
      // calling a gated endpoint) — clear the stale unlock state but do NOT
      // reload here. A reload would re-fire the same request and loop
      // forever on any page that keeps calling a gated endpoint without a
      // valid token. SectionPasscodeGate re-checks status on its own next
      // mount/navigation instead.
      sessionStorage.removeItem(SECTION_UNLOCK_FLAG_KEY);
      sessionStorage.removeItem(SECTION_UNLOCK_TOKEN_KEY);
    }
    return Promise.reject(error);
  }
);

export default adminAxios;
