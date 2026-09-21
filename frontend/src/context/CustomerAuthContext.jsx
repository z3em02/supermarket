import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl } from '../utils/api';

const CustomerAuthContext = createContext(null);

export const CustomerAuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(() => {
    try {
      const saved = localStorage.getItem('customer_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('customer_token') || null);
  const [loading, setLoading] = useState(true);

  // Configure axios authorization header if token exists
  useEffect(() => {
    if (token) {
      localStorage.setItem('customer_token', token);
    } else {
      localStorage.removeItem('customer_token');
      localStorage.removeItem('customer_user');
    }
  }, [token]);

  const refreshProfile = async () => {
    if (!token) {
      setLoading(false);
      return null;
    }
    try {
      const apiUrl = getApiUrl();
      const res = await axios.get(`${apiUrl}/api/customer/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomer(res.data);
      localStorage.setItem('customer_user', JSON.stringify(res.data));
      return res.data;
    } catch (err) {
      console.warn('Customer session expired or invalid:', err.response?.data?.error || err.message);
      logout();
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      refreshProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const register = async (formData) => {
    const apiUrl = getApiUrl();
    const res = await axios.post(`${apiUrl}/api/customer/register`, formData);
    if (res.data.token) {
      setToken(res.data.token);
      setCustomer(res.data.customer);
      localStorage.setItem('customer_token', res.data.token);
      localStorage.setItem('customer_user', JSON.stringify(res.data.customer));
    }
    return res.data;
  };

  const login = async (identifier, password) => {
    const apiUrl = getApiUrl();
    const res = await axios.post(`${apiUrl}/api/customer/login`, { identifier, password });
    if (res.data.token) {
      setToken(res.data.token);
      setCustomer(res.data.customer);
      localStorage.setItem('customer_token', res.data.token);
      localStorage.setItem('customer_user', JSON.stringify(res.data.customer));
    }
    return res.data;
  };

  const verifyEmail = async (code) => {
    const apiUrl = getApiUrl();
    const res = await axios.post(`${apiUrl}/api/customer/verify-email`, {
      code,
      customerId: customer?.id
    }, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (res.data.emailVerified) {
      setCustomer(prev => prev ? { ...prev, emailVerified: true } : prev);
      localStorage.setItem('customer_user', JSON.stringify({ ...customer, emailVerified: true }));
    }
    return res.data;
  };

  const verifyPhone = async (code) => {
    const apiUrl = getApiUrl();
    const res = await axios.post(`${apiUrl}/api/customer/verify-phone`, {
      code,
      customerId: customer?.id
    }, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (res.data.phoneVerified) {
      setCustomer(prev => prev ? { ...prev, phoneVerified: true } : prev);
      localStorage.setItem('customer_user', JSON.stringify({ ...customer, phoneVerified: true }));
    }
    return res.data;
  };

  const resendOtp = async (type) => {
    const apiUrl = getApiUrl();
    const res = await axios.post(`${apiUrl}/api/customer/resend-otp`, {
      type,
      customerId: customer?.id,
      email: customer?.email,
      phone: customer?.phone
    }, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    return res.data;
  };

  const updateProfile = async (updateData) => {
    const apiUrl = getApiUrl();
    const res = await axios.put(`${apiUrl}/api/customer/profile`, updateData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.data.customer) {
      setCustomer(res.data.customer);
      localStorage.setItem('customer_user', JSON.stringify(res.data.customer));
    }
    return res.data;
  };

  const logout = () => {
    setToken(null);
    setCustomer(null);
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_user');
  };

  const isVerified = Boolean(customer?.emailVerified && customer?.phoneVerified);

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        token,
        loading,
        isAuthenticated: Boolean(token && customer),
        isVerified,
        register,
        login,
        logout,
        verifyEmail,
        verifyPhone,
        resendOtp,
        updateProfile,
        refreshProfile
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};
