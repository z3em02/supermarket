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
      // The unlock token expired or was never issued (e.g. stale tab) —
      // clear the stale unlock state and reload so SectionPasscodeGate
      // re-mounts and prompts for the PIN again.
      sessionStorage.removeItem(SECTION_UNLOCK_FLAG_KEY);
      sessionStorage.removeItem(SECTION_UNLOCK_TOKEN_KEY);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

export default adminAxios;
