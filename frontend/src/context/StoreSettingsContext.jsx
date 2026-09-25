import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../utils/api';
import adminAxios from '../utils/adminAxios';

const DEFAULT_SETTINGS = {
  id: 'default',
  storeName: 'Hajar Supermarkt',
  storeNameDe: 'Hajar Supermarkt',
  storeNameAr: 'سوبرماركت هاجر',
  logoUrl: '',
  phone: '+49 123 4567890',
  email: 'info@hajar-supermarkt.de',
  address: 'Musterstraße 123, 10115 Berlin',
  mapUrl: 'https://maps.google.com',
  mapEmbedUrl: '',
  googleReviewsUrl: 'https://search.google.com/local/reviews',
  googleRating: 5.0,
  googleReviewCount: 0,
  showGoogleReviews: true,
  minOrderValue: 0,
  deliveryFee: 2.0,
  deliveryFeePerKm: 0.10,
  freeDeliveryThreshold: 0,
  storeLatitude: 48.1746605,
  storeLongitude: 16.3272662,
  maxDeliveryDistanceKm: 0,
  allowedPostalCodes: ''
};

const StoreSettingsContext = createContext(null);

export const StoreSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({ ...prev, ...data }));
        setError(null);
      }
    } catch (err) {
      console.warn('Could not fetch store settings, using defaults:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReviews = useCallback(async () => {
    try {
      setReviewsLoading(true);
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/settings/reviews`);
      if (res.ok) {
        const data = await res.json();
        setReviews(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Could not fetch reviews:', err.message);
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchReviews();
  }, [fetchSettings, fetchReviews]);

  // Update browser tab title dynamically
  useEffect(() => {
    if (settings?.storeName) {
      document.title = settings.storeName;
    }
  }, [settings?.storeName]);

  // Update browser tab favicon dynamically from the admin-configured logo.
  // The static tag in index.html has type="image/svg+xml" for the default
  // favicon.svg — an uploaded logo is usually a PNG/JPG, so that leftover
  // type attribute must go or browsers may refuse to render it.
  useEffect(() => {
    if (!settings?.logoUrl) return;
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.removeAttribute('type');
    link.href = settings.logoUrl;
  }, [settings?.logoUrl]);

  // Localized store name helper
  const getStoreName = useCallback((lang) => {
    if (!settings) return DEFAULT_SETTINGS.storeName;
    if (lang === 'ar' && settings.storeNameAr) {
      return settings.storeNameAr;
    }
    if (lang === 'de' && settings.storeNameDe) {
      return settings.storeNameDe;
    }
    return settings.storeName || settings.storeNameDe || DEFAULT_SETTINGS.storeName;
  }, [settings]);

  // Update settings API call
  const updateStoreSettings = async (newSettingsData) => {
    try {
      const apiUrl = getApiUrl();
      const res = await adminAxios.put(`${apiUrl}/api/settings`, newSettingsData);
      const updated = res.data.settings || res.data;
      setSettings(updated);
      return { success: true, settings: updated };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  };

  // Add Google review
  const addReview = async (reviewData) => {
    try {
      const apiUrl = getApiUrl();
      const res = await adminAxios.post(`${apiUrl}/api/settings/reviews`, reviewData);
      setReviews((prev) => [res.data, ...prev]);
      return { success: true, review: res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  };

  // Delete Google review
  const deleteReview = async (id) => {
    try {
      const apiUrl = getApiUrl();
      await adminAxios.delete(`${apiUrl}/api/settings/reviews/${id}`);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  };

  // Live Sync Google stars & reviews via backend scraper
  const syncGoogleReviews = async (googleReviewsUrl) => {
    try {
      const apiUrl = getApiUrl();
      const res = await adminAxios.post(`${apiUrl}/api/settings/sync-google-reviews`, { googleReviewsUrl });
      const data = res.data;
      if (Array.isArray(data.reviews)) {
        setReviews(data.reviews);
      }
      if (data.rating) {
        setSettings((prev) => ({
          ...prev,
          googleRating: data.rating,
          googleReviewCount: data.user_ratings_total !== undefined ? data.user_ratings_total : prev.googleReviewCount
        }));
      }
      return { success: true, message: data.message, synced: data.synced };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  };

  return (
    <StoreSettingsContext.Provider
      value={{
        settings,
        reviews,
        loading,
        reviewsLoading,
        error,
        getStoreName,
        updateStoreSettings,
        addReview,
        deleteReview,
        syncGoogleReviews,
        fetchSettings,
        fetchReviews
      }}
    >
      {children}
    </StoreSettingsContext.Provider>
  );
};

export const useStoreSettings = () => {
  const context = useContext(StoreSettingsContext);
  if (!context) {
    throw new Error('useStoreSettings must be used within a StoreSettingsProvider');
  }
  return context;
};
