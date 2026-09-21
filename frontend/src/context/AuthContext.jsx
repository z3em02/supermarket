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

  const login = async (email, password) => {
    try {
      const apiUrl = getApiUrl();
      const response = await axios.post(`${apiUrl}/api/auth/login`, {
        email,
        password
      });
      
      const { token: receivedToken, admin } = response.data;
      localStorage.setItem('token', receivedToken);
      localStorage.setItem('adminUser', JSON.stringify(admin));
      setToken(receivedToken);
      setUser(admin);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
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
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
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