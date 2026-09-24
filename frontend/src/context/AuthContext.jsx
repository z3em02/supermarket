import { createContext, useContext, useState } from 'react';
import axios from 'axios';
import { getApiUrl } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('adminUser');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        console.error('Failed to parse adminUser from localStorage', e);
      }
    }
    return localStorage.getItem('token') ? { email: 'admin@supermarket.com', name: 'Admin' } : null;
  });
  const [loading] = useState(false);

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

  // Step 2: the emailed 2FA code + pending token exchange for a real session.
  const verifyLoginCode = async (pendingToken, code) => {
    try {
      const apiUrl = getApiUrl();
      const response = await axios.post(`${apiUrl}/api/auth/verify-2fa`, { pendingToken, code });
      const { token: receivedToken, admin } = response.data;
      localStorage.setItem('token', receivedToken);
      localStorage.setItem('adminUser', JSON.stringify(admin));
      setToken(receivedToken);
      setUser(admin);
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

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('adminUser');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, requestLogin, verifyLoginCode, resendLoginCode, logout }}>
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
