import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import adminAxios, { ADMIN_AUTH_EXPIRED_EVENT } from '../utils/adminAxios';
import { getApiUrl } from '../utils/api';

const AuthContext = createContext(null);

// The admin session lives entirely in the HttpOnly `token` cookie now — it's
// never stored in localStorage (that's what let any XSS on this app read it
// straight out and impersonate the admin). Since JS can't read an HttpOnly
// cookie either, "am I logged in" is answered by asking the backend
// (GET /api/auth/me, which succeeds iff the cookie is present and valid),
// not by checking local state. `adminUser` in localStorage is kept purely
// as a non-sensitive cache (name/email only) so the UI doesn't flash a
// loading spinner on every reload — the /me check below is still the
// authority and overwrites it as soon as it resolves.
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('adminUser');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = getApiUrl();
    adminAxios.get(`${apiUrl}/api/auth/me`)
      .then((res) => {
        setUser(res.data);
        localStorage.setItem('adminUser', JSON.stringify(res.data));
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem('adminUser');
      })
      .finally(() => setLoading(false));
  }, []);

  // Any other adminAxios call (not just the /me probe above) can 401 once
  // the session dies mid-use — e.g. logged out elsewhere, or the token
  // expires while the admin is active. adminAxios dispatches this instead
  // of redirecting itself, so it doesn't affect public pages; clearing
  // `user` here is what lets ProtectedRoute notice and navigate to login,
  // but only for someone who's actually inside the admin section.
  useEffect(() => {
    const handleAuthExpired = () => setUser(null);
    window.addEventListener(ADMIN_AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(ADMIN_AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, []);

  // Step 1: password check. Never logs the admin in directly — always
  // returns a pending token that must be exchanged via verifyLoginCode.
  const requestLogin = async (email, password) => {
    try {
      const apiUrl = getApiUrl();
      const response = await axios.post(`${apiUrl}/api/auth/login`, { email, password });
      return { success: true, pendingToken: response.data.pendingToken, email: response.data.email };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  // Step 2: the emailed 2FA code + pending token exchange for a real
  // session. The response still includes the JWT for API compatibility, but
  // the browser already stored it via Set-Cookie — we deliberately don't
  // persist the value from the response body anywhere.
  const verifyLoginCode = async (pendingToken, code) => {
    try {
      const apiUrl = getApiUrl();
      const response = await axios.post(
        `${apiUrl}/api/auth/verify-2fa`,
        { pendingToken, code },
        { withCredentials: true }
      );
      setUser(response.data.admin);
      localStorage.setItem('adminUser', JSON.stringify(response.data.admin));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Verification failed'
      };
    }
  };

  const resendLoginCode = async (pendingToken) => {
    try {
      const apiUrl = getApiUrl();
      const response = await axios.post(`${apiUrl}/api/auth/resend-2fa`, { pendingToken });
      return { success: true, pendingToken: response.data.pendingToken };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to resend code'
      };
    }
  };

  const logout = async () => {
    localStorage.removeItem('adminUser');
    setUser(null);
    // Best-effort: revoke the session server-side (bumps tokenVersion, clears
    // the HttpOnly + CSRF cookies) so a stolen cookie can't outlive logout.
    // Local state is already cleared above regardless of this succeeding.
    try {
      const apiUrl = getApiUrl();
      await adminAxios.post(`${apiUrl}/api/auth/logout`, {});
    } catch (err) {
      // Ignore — the admin is logged out locally either way.
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, requestLogin, verifyLoginCode, resendLoginCode, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
