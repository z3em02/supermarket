const API_URL = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : (import.meta.env.PROD ? '' : 'http://localhost:5000');

export const getApiUrl = () => API_URL;

/**
 * Resolves local/relative asset URLs (e.g. /api/uploads/logo-123.png)
 * by prepending the backend API URL when running in dev/non-prod,
 * while keeping external URLs and root-relative paths in prod intact.
 */
export const resolveImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const apiUrl = getApiUrl();
  if (apiUrl && trimmed.startsWith('/')) {
    return `${apiUrl}${trimmed}`;
  }
  return trimmed;
};