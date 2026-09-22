import axios from 'axios';

// Shared axios instance for authenticated admin API calls. Login itself uses
// plain axios (see AuthContext.jsx) since a 401 there means "wrong password",
// not "session expired", and must not trigger a redirect.
const adminAxios = axios.create();

adminAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('adminUser');
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/secret/admin/login')) {
        window.location.href = '/secret/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export default adminAxios;
