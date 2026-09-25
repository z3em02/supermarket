import axios from 'axios';
import { getCsrfToken } from './csrf';

// Shared axios instance for authenticated customer API calls. Mirrors
// adminAxios.js — the customer session lives entirely in the HttpOnly
// `customer_token` cookie, so there is nothing to read from localStorage or
// attach as an Authorization header.
const customerAxios = axios.create({ withCredentials: true });

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

customerAxios.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();
  if (MUTATING_METHODS.has(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});

export default customerAxios;
