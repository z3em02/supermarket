// Reads the non-HttpOnly csrf_token cookie the backend sets alongside every
// session cookie (see backend/middleware/csrf.js) so it can be echoed back
// as the X-CSRF-Token header on mutating requests — required now that auth
// relies on the cookie alone (no more Authorization header from the token
// this used to be duplicated into via localStorage).
export const getCsrfToken = () => {
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};
