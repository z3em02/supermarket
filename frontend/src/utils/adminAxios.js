import axios from 'axios';

// Shared axios instance for authenticated admin API calls. Login itself uses
// plain axios (see AuthContext.jsx) since a 401 there means "wrong password",
// not "session expired", and must not trigger a redirect.
const adminAxios = axios.create();

const SECTION_UNLOCK_TOKEN_KEY = 'admin_section_unlock_token';
const SECTION_UNLOCK_FLAG_KEY = 'admin_section_unlocked';

// Attaches the section-PIN unlock token (see SectionPasscodeGate.jsx) to
// every request. Harmless on routes that don't require it — the backend
// only checks this header on the Settings/Buchhaltung/Kunden/Aktionen APIs.
adminAxios.interceptors.request.use((config) => {
  const unlockToken = sessionStorage.getItem(SECTION_UNLOCK_TOKEN_KEY);
  if (unlockToken) {
    config.headers['X-Section-Unlock'] = unlockToken;
  }
  return config;
});

adminAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('adminUser');
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/secret/admin/login')) {
        window.location.href = '/secret/admin/login';
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
