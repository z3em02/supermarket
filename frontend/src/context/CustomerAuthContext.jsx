import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import customerAxios from '../utils/customerAxios';
import { getApiUrl } from '../utils/api';

const CustomerAuthContext = createContext(null);

// The customer session lives entirely in the HttpOnly `customer_token`
// cookie now — never in localStorage, which is what let any XSS on the
// storefront read it straight out. Since JS can't read an HttpOnly cookie,
// "am I logged in" is answered by asking the backend (refreshProfile, which
// succeeds iff the cookie is present and valid), not by checking local
// state. `customer_user` in localStorage is kept purely as a non-sensitive
// cache (profile fields, no secret) so the UI doesn't flash a loading state
// on every reload — refreshProfile is still the authority and overwrites it.
export const CustomerAuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(() => {
    try {
      const saved = localStorage.getItem('customer_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const apiUrl = getApiUrl();
      const res = await customerAxios.get(`${apiUrl}/api/customer/profile`);
      setCustomer(res.data);
      localStorage.setItem('customer_user', JSON.stringify(res.data));
      return res.data;
    } catch (err) {
      // No valid session cookie (never logged in, expired, or revoked) —
      // this is the expected/common case on first load, not a real error.
      setCustomer(null);
      localStorage.removeItem('customer_user');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const register = async (formData) => {
    const apiUrl = getApiUrl();
    const res = await axios.post(`${apiUrl}/api/customer/register`, formData, { withCredentials: true });
    if (res.data.customer) {
      setCustomer(res.data.customer);
      localStorage.setItem('customer_user', JSON.stringify(res.data.customer));
    }
    return res.data;
  };

  const login = async (identifier, password) => {
    const apiUrl = getApiUrl();
    const res = await axios.post(`${apiUrl}/api/customer/login`, { identifier, password }, { withCredentials: true });
    if (res.data.customer) {
      setCustomer(res.data.customer);
      localStorage.setItem('customer_user', JSON.stringify(res.data.customer));
    }
    return res.data;
  };

  const verifyEmail = async (code) => {
    const apiUrl = getApiUrl();
    const res = await customerAxios.post(`${apiUrl}/api/customer/verify-email`, {
      code,
      customerId: customer?.id
    });
    if (res.data.emailVerified) {
      setCustomer(prev => prev ? { ...prev, emailVerified: true } : prev);
      localStorage.setItem('customer_user', JSON.stringify({ ...customer, emailVerified: true }));
    }
    return res.data;
  };

  // idToken comes from Firebase Phone Auth (see utils/firebaseClient.js) after
  // the customer confirms the SMS code with Firebase directly.
  const verifyPhone = async (idToken) => {
    const apiUrl = getApiUrl();
    const res = await customerAxios.post(`${apiUrl}/api/customer/verify-phone`, { idToken });
    if (res.data.phoneVerified) {
      setCustomer(prev => prev ? { ...prev, phoneVerified: true } : prev);
      localStorage.setItem('customer_user', JSON.stringify({ ...customer, phoneVerified: true }));
    }
    return res.data;
  };

  const resendOtp = async (type) => {
    const apiUrl = getApiUrl();
    const res = await customerAxios.post(`${apiUrl}/api/customer/resend-otp`, {
      type,
      customerId: customer?.id,
      email: customer?.email,
      phone: customer?.phone
    });
    return res.data;
  };

  const updateProfile = async (updateData) => {
    const apiUrl = getApiUrl();
    const res = await customerAxios.put(`${apiUrl}/api/customer/profile`, updateData);
    if (res.data.customer) {
      setCustomer(res.data.customer);
      localStorage.setItem('customer_user', JSON.stringify(res.data.customer));
    }
    return res.data;
  };

  const logout = () => {
    setCustomer(null);
    localStorage.removeItem('customer_user');
    // Best-effort: revoke the session server-side (bumps tokenVersion, clears
    // the HttpOnly + CSRF cookies) so a stolen cookie can't outlive logout.
    const apiUrl = getApiUrl();
    customerAxios.post(`${apiUrl}/api/customer/logout`, {}).catch(() => {});
  };

  const requestPasswordReset = async (email) => {
    const apiUrl = getApiUrl();
    const res = await axios.post(`${apiUrl}/api/customer/request-password-reset`, { email });
    return res.data;
  };

  const resetPassword = async (token, password) => {
    const apiUrl = getApiUrl();
    const res = await axios.post(`${apiUrl}/api/customer/reset-password`, { token, password });
    return res.data;
  };

  // Both email and phone verification are required to place orders.
  const isVerified = Boolean(customer?.emailVerified && customer?.phoneVerified);

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        loading,
        isAuthenticated: Boolean(customer),
        isVerified,
        register,
        login,
        logout,
        verifyEmail,
        verifyPhone,
        resendOtp,
        updateProfile,
        refreshProfile,
        requestPasswordReset,
        resetPassword
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
