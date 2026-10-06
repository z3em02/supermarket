import axios from 'axios';
import { getCsrfToken } from './csrf';
import { getApiUrl } from './api';

// Shared axios instance for authenticated customer API calls. Mirrors
// adminAxios.js — the customer session lives entirely in the HttpOnly
// `customer_token` cookie, so there is nothing to read from localStorage or
// attach as an Authorization header.
// baseURL means call sites use '/api/...' directly; getApiUrl() resolves to
// the backend origin in dev and '' (same-origin, nginx proxies /api) in prod.
const customerAxios = axios.create({ baseURL: getApiUrl(), withCredentials: true });

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
