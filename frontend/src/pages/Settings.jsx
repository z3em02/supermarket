import { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { getApiUrl } from '../utils/api';
import { windowLabel } from '../utils/deliverySlot';
import {
  Store,
  Image as ImageIcon,
  MapPin,
  Star,
  Phone,
  Mail,
  Save,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Building2,
  Navigation,
  Trash2,
  RefreshCw,
  Truck,
  Clock,
  Plus,
  Power
} from 'lucide-react';

export const Settings = () => {
  const { t, language, direction } = useLanguage();
  const { 
    settings, 
    updateStoreSettings, 
    reviews, 
    deleteReview, 
    syncGoogleReviews, 
    reviewsLoading 
  } = useStoreSettings();

  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'delivery' | 'google'

  const [formData, setFormData] = useState({
    storeName: '',
    storeNameDe: '',
    storeNameAr: '',
    logoUrl: '',
    phone: '',
    email: '',
    address: '',
    mapUrl: '',
    mapEmbedUrl: '',
    googleReviewsUrl: '',
    showGoogleReviews: true,
    minOrderValue: '',
    deliveryFee: '',
    deliveryFeePerKm: '',
    freeDeliveryThreshold: '',
    maxDeliveryDistanceKm: '',
    storeLatitude: '',
    storeLongitude: '',
    allowedPostalCodes: ''
  });

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [logoPreviewError, setLogoPreviewError] = useState(false);
  const [geocodingStore, setGeocodingStore] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null);

  // Delivery time windows (admin-configurable options offered at checkout)
  const [deliveryWindows, setDeliveryWindows] = useState([]);
  const [loadingWindows, setLoadingWindows] = useState(true);
  const [newStartHour, setNewStartHour] = useState('10');
  const [newEndHour, setNewEndHour] = useState('12');
  const [windowError, setWindowError] = useState('');
  const [savingWindowId, setSavingWindowId] = useState(null);

  const fetchDeliveryWindows = async () => {
    try {
      setLoadingWindows(true);
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      const res = await axios.get(`${apiUrl}/api/delivery-windows`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeliveryWindows(res.data);
    } catch (err) {
      console.error('Error fetching delivery windows:', err);
    } finally {
      setLoadingWindows(false);
    }
  };

  useEffect(() => {
    fetchDeliveryWindows();
  }, []);

  const handleAddDeliveryWindow = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setWindowError('');
    const start = parseInt(newStartHour, 10);
    const end = parseInt(newEndHour, 10);
    if (isNaN(start) || isNaN(end) || start < 0 || start > 23 || end < 1 || end > 24 || end <= start) {
      setWindowError(
        language === 'ar'
          ? 'يرجى إدخال ساعات صحيحة (من 0 إلى 23، وإلى 1 إلى 24، مع أن تكون النهاية بعد البداية).'
          : 'Bitte gültige Stunden eingeben (Von 0–23, Bis 1–24, Ende muss nach Start liegen).'
      );
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      await axios.post(
        `${apiUrl}/api/delivery-windows`,
        { startHour: start, endHour: end, sortOrder: deliveryWindows.length },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchDeliveryWindows();
      setNewStartHour('10');
      setNewEndHour('12');
    } catch (err) {
      setWindowError(err.response?.data?.error || (language === 'ar' ? 'فشل إضافة الوقت' : 'Fehler beim Hinzufügen'));
    }
  };

  const handleToggleDeliveryWindow = async (win) => {
    setSavingWindowId(win.id);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      await axios.put(
        `${apiUrl}/api/delivery-windows/${win.id}`,
        { isActive: !win.isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDeliveryWindows((prev) => prev.map((w) => (w.id === win.id ? { ...w, isActive: !w.isActive } : w)));
    } catch (err) {
      console.error('Error toggling delivery window:', err);
    } finally {
      setSavingWindowId(null);
    }
  };

  const handleDeleteDeliveryWindow = async (id) => {
    if (!window.confirm(language === 'ar' ? 'هل تريد حذف هذا الوقت؟' : 'Dieses Zeitfenster löschen?')) return;
    try {
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      await axios.delete(`${apiUrl}/api/delivery-windows/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeliveryWindows((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      console.error('Error deleting delivery window:', err);
    }
  };

  useEffect(() => {
    if (settings) {
      setFormData({
        storeName: settings.storeName || '',
        storeNameDe: settings.storeNameDe || '',
        storeNameAr: settings.storeNameAr || '',
        logoUrl: (settings.logoUrl && settings.logoUrl !== 'null') ? settings.logoUrl : '',
        phone: settings.phone || '',
        email: settings.email || '',
        address: settings.address || '',
        mapUrl: settings.mapUrl || '',
        mapEmbedUrl: settings.mapEmbedUrl || '',
        googleReviewsUrl: settings.googleReviewsUrl || '',
        showGoogleReviews: settings.showGoogleReviews !== false,
        minOrderValue: settings.minOrderValue ?? 0,
        deliveryFee: settings.deliveryFee ?? 2.0,
        deliveryFeePerKm: settings.deliveryFeePerKm ?? 0.10,
        freeDeliveryThreshold: settings.freeDeliveryThreshold ?? 0,
        maxDeliveryDistanceKm: settings.maxDeliveryDistanceKm ?? 0,
        storeLatitude: settings.storeLatitude ?? 48.1746605,
        storeLongitude: settings.storeLongitude ?? 16.3272662,
        allowedPostalCodes: settings.allowedPostalCodes || ''
      });
      setLogoPreviewError(false);
    }
  }, [settings]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'logoUrl') {
      setLogoPreviewError(false);
    }
  };

  const handleGeocodeStoreAddress = async () => {
    try {
      setGeocodingStore(true);
      setSuccessMessage('');
      setErrorMessage('');
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      const res = await axios.post(`${apiUrl}/api/delivery-distance/geocode-store`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.latitude && res.data.longitude) {
        setFormData((prev) => ({
          ...prev,
          storeLatitude: res.data.latitude,
          storeLongitude: res.data.longitude
        }));
        setSuccessMessage(t('coordsUpdatedSuccess'));
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      console.error('Geocode store error:', err);
      setErrorMessage(err.response?.data?.error || 'Fehler beim Ermitteln der Koordinaten');
    } finally {
      setGeocodingStore(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const payload = {
        storeName: formData.storeName.trim(),
        storeNameDe: formData.storeNameDe.trim(),
        storeNameAr: formData.storeNameAr.trim(),
        logoUrl: formData.logoUrl.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        mapUrl: formData.mapUrl.trim() || null,
        mapEmbedUrl: formData.mapEmbedUrl.trim() || null,
        googleReviewsUrl: formData.googleReviewsUrl.trim() || null,
        showGoogleReviews: formData.showGoogleReviews,
        minOrderValue: formData.minOrderValue !== '' ? parseFloat(formData.minOrderValue) : 0,
        deliveryFee: formData.deliveryFee !== '' ? parseFloat(formData.deliveryFee) : 0,
        deliveryFeePerKm: formData.deliveryFeePerKm !== '' ? parseFloat(formData.deliveryFeePerKm) : 0,
        freeDeliveryThreshold: formData.freeDeliveryThreshold !== '' ? parseFloat(formData.freeDeliveryThreshold) : 0,
        maxDeliveryDistanceKm: formData.maxDeliveryDistanceKm !== '' ? parseFloat(formData.maxDeliveryDistanceKm) : 0,
        storeLatitude: formData.storeLatitude !== '' ? parseFloat(formData.storeLatitude) : null,
        storeLongitude: formData.storeLongitude !== '' ? parseFloat(formData.storeLongitude) : null,
        allowedPostalCodes: formData.allowedPostalCodes.trim() || null
      };

      const res = await updateStoreSettings(payload);
      if (res.success) {
        setSuccessMessage(t('settingsSavedSuccess'));
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        setErrorMessage(res.error || t('settingsSavedError'));
      }
    } catch (err) {
      console.error('Settings update error:', err);
      setErrorMessage(t('settingsSavedError'));
    } finally {
      setSaving(false);
    }
  };

  const handleSyncGoogle = async () => {
    setSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await syncGoogleReviews();
      if (res.success) {
        setSyncFeedback({
          type: 'success',
          text: language === 'ar'
            ? `تم جلب التقييمات بنجاح! النجوم: ${res.data.googleRating?.toFixed(1) || '5.0'} (${res.data.googleReviewCount || 0} تقييم)`
            : `Erfolgreich synchronisiert! Sterne: ${res.data.googleRating?.toFixed(1) || '5.0'} (${res.data.googleReviewCount || 0} Bewertungen)`
        });
      } else {
        setSyncFeedback({
          type: 'error',
          text: res.error || (language === 'ar' ? 'فشل جلب التقييمات من Google' : 'Fehler beim Abrufen der Google-Bewertungen')
        });
      }
    } catch (err) {
      console.error('Sync Google error:', err);
      setSyncFeedback({
        type: 'error',
        text: language === 'ar' ? 'حدث خطأ أثناء الاتصال بـ Google' : 'Verbindungsfehler zu Google'
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteReview = async (id) => {
    if (window.confirm(t('confirmDeleteReview'))) {
      const res = await deleteReview(id);
      if (res.success) {
        setSuccessMessage(t('reviewDeletedSuccess'));
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    }
  };

  const tabs = [
    {
      id: 'general',
      label: language === 'ar' ? 'المتجر والتواصل' : 'Allgemein & Kontakt',
      icon: Building2
    },
    {
      id: 'delivery',
      label: language === 'ar' ? 'التوصيل وأوقات العمل' : 'Lieferung & Zeitfenster',
      icon: Truck,
      badge: deliveryWindows.filter(w => w.isActive).length || null
    },
    {
      id: 'google',
      label: language === 'ar' ? 'خرائط وتقييمات Google' : 'Google & Bewertungen',
      icon: Star,
      badge: reviews.length || null
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {t('storeSettings')}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
            {t('storeSettingsDesc')}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 shadow-md shadow-blue-500/20 transition cursor-pointer shrink-0 touch-manipulation"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{saving ? t('loading') : t('saveSettings')}</span>
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200 shadow-xs animate-in fade-in duration-200 text-xs sm:text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/80 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 shadow-xs animate-in fade-in duration-200 text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Clean Category Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-gray-800/70 rounded-2xl overflow-x-auto border border-slate-200/80 dark:border-gray-700/80 shadow-xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-white dark:bg-gray-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
              <span>{tab.label}</span>
              {tab.badge != null && (
                <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-200/70 dark:bg-gray-700 text-slate-600 dark:text-gray-300'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Settings Form Body */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ============================================================== */}
        {/* TAB 1: ALLGEMEIN & KONTAKT */}
        {/* ============================================================== */}
        {activeTab === 'general' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Store Name & Language */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-850 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-gray-800">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {t('storeName')}
                  </h2>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
                      {t('storeName')} (Standard) *
                    </label>
                    <input
                      type="text"
                      value={formData.storeName}
                      onChange={(e) => handleChange('storeName', e.target.value)}
                      placeholder="Hajar Supermarkt"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
                      {t('storeNameDe')} <span className="text-[10px] font-normal text-slate-400">(Deutsch)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.storeNameDe}
                      onChange={(e) => handleChange('storeNameDe', e.target.value)}
                      placeholder="Hajar Supermarkt Großhandel"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
                      {t('storeNameAr')} <span className="text-[10px] font-normal text-slate-400">(العربية)</span>
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={formData.storeNameAr}
                      onChange={(e) => handleChange('storeNameAr', e.target.value)}
                      placeholder="سوبرماركت هاجر"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none transition text-right"
                    />
                  </div>
                </div>
              </div>

              {/* Logo & Branding */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-850 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-gray-800">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {t('storeLogo')}
                  </h2>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
                      {t('logoUrl')}
                    </label>
                    <input
                      type="url"
                      value={formData.logoUrl}
                      onChange={(e) => handleChange('logoUrl', e.target.value)}
                      placeholder={t('logoUrlPlaceholder')}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none transition"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">
                      Link zu Ihrem Logo (PNG, JPG, SVG oder WebP).
                    </p>
                  </div>

                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
                      {t('logoPreview')}
                    </span>
                    <div className="h-24 rounded-xl bg-slate-50 dark:bg-gray-950 border border-dashed border-slate-200 dark:border-gray-800 flex items-center justify-center p-3">
                      {formData.logoUrl && !logoPreviewError ? (
                        <img
                          src={formData.logoUrl}
                          alt="Store Logo"
                          onError={() => setLogoPreviewError(true)}
                          className="max-h-16 max-w-full object-contain drop-shadow-xs"
                        />
                      ) : (
                        <div className="text-center text-slate-400 flex flex-col items-center gap-1">
                          <Store className="w-6 h-6 text-slate-300 dark:text-gray-600" />
                          <span className="text-[11px]">{t('noLogoProvided')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Details Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-850 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-gray-800">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {t('contactInfo')}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
                    {t('phoneNumber')} *
                  </label>
                  <div className="relative">
                    <Phone className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder={t('phonePlaceholder')}
                      className="w-full ps-10 pe-4 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
                    {t('emailAddressContact')} *
                  </label>
                  <div className="relative">
                    <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder={t('emailPlaceholder')}
                      className="w-full ps-10 pe-4 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
                    {t('physicalAddress')}
                  </label>
                  <div className="relative">
                    <MapPin className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      placeholder={t('addressPlaceholder')}
                      className="w-full ps-10 pe-4 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Live Website Preview Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-md border border-slate-800 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <h3 className="text-sm font-bold truncate">
                    {t('livePreview')} (Header & Brand)
                  </h3>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
                  Live Mockup
                </span>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {formData.logoUrl && !logoPreviewError ? (
                    <img
                      src={formData.logoUrl}
                      alt="Logo preview"
                      className="w-9 h-9 object-contain rounded-xl bg-white p-1 shadow-sm shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
                      <Store className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-sm sm:text-base font-black tracking-tight truncate">
                      {(language === 'ar' ? formData.storeNameAr : formData.storeNameDe) || formData.storeName || 'Hajar Supermarkt'}
                    </h4>
                    <p className="text-[11px] text-blue-200 font-medium truncate">
                      {language === 'ar' ? 'سوبرماركت وتوصيل منزلي' : 'Supermarkt & Lieferservice'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {formData.phone && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 text-white font-medium text-[11px]">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      <span>{formData.phone}</span>
                    </span>
                  )}
                  {formData.email && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 text-white font-medium text-[11px]">
                      <Mail className="w-3 h-3 text-blue-300" />
                      <span>{formData.email}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: LIEFERUNG & ZEITFENSTER */}
        {/* ============================================================== */}
        {activeTab === 'delivery' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Delivery Rules Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-850 p-5 sm:p-7 shadow-xs space-y-5">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-gray-800">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {t('deliveryRules')}
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-gray-400">
                    {t('deliveryRulesDesc')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
                    {t('minOrderValue')} (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.minOrderValue}
                    onChange={(e) => handleChange('minOrderValue', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
                    {t('baseServiceFee')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.deliveryFee}
                    onChange={(e) => handleChange('deliveryFee', e.target.value)}
                    placeholder="2.00"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
                    {t('deliveryFeePerKm')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.deliveryFeePerKm}
                    onChange={(e) => handleChange('deliveryFeePerKm', e.target.value)}
                    placeholder="0.10"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none transition"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">
                    {t('deliveryFeePerKmHint')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-gray-800">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
                    {t('freeDeliveryThreshold')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.freeDeliveryThreshold}
                    onChange={(e) => handleChange('freeDeliveryThreshold', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none transition"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">
                    {t('freeDeliveryThresholdHint')}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
                    {t('maxDeliveryDistanceKm')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.maxDeliveryDistanceKm}
                    onChange={(e) => handleChange('maxDeliveryDistanceKm', e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none transition"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">
                    {t('maxDeliveryDistanceKmHint')}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-gray-800">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
                  {t('allowedPostalCodes')}
                </label>
                <input
                  type="text"
                  value={formData.allowedPostalCodes}
                  onChange={(e) => handleChange('allowedPostalCodes', e.target.value)}
                  placeholder={t('allowedPostalCodesPlaceholder')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none transition"
                />
                <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">
                  {t('allowedPostalCodesHint')}
                </p>
              </div>

              {/* Supermarket Origin Coordinates */}
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-gray-950/60 border border-slate-200/70 dark:border-gray-800/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                        {t('storeCoordinates')}
                      </h3>
                      <p className="text-[11px] text-slate-400 dark:text-gray-500">
                        {formData.address ? formData.address : 'Koppreitergasse 8, 1120 Wien'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={geocodingStore || !formData.address}
                    onClick={handleGeocodeStoreAddress}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 hover:border-emerald-500 text-slate-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-semibold shadow-2xs transition disabled:opacity-40 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${geocodingStore ? 'animate-spin text-emerald-600' : ''}`} />
                    <span>{geocodingStore ? (language === 'ar' ? 'جارٍ التحديد...' : 'Ermittle...') : t('updateCoordsFromAddress')}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 mb-1">
                      {t('storeLatitude')}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.storeLatitude}
                      onChange={(e) => handleChange('storeLatitude', e.target.value)}
                      placeholder="48.1746605"
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 mb-1">
                      {t('storeLongitude')}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.storeLongitude}
                      onChange={(e) => handleChange('storeLongitude', e.target.value)}
                      placeholder="16.3272662"
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Time Windows Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-850 p-5 sm:p-7 shadow-xs space-y-5">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-gray-800">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {language === 'ar' ? 'أوقات التوصيل (Zeitfenster)' : 'Liefer-Zeitfenster'}
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-gray-400">
                    {language === 'ar'
                      ? 'الأوقات التي يمكن للعملاء اختيارها عند إتمام الطلب.'
                      : 'Zeitfenster, die Kunden beim Checkout auswählen können. Nur aktive werden angezeigt.'}
                  </p>
                </div>
              </div>

              {loadingWindows ? (
                <p className="text-xs text-slate-400">{language === 'ar' ? 'جارٍ التحميل...' : 'Wird geladen...'}</p>
              ) : (
                <div className="space-y-3">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                    {language === 'ar' ? 'الأوقات المتاحة حالياً:' : 'Vorhandene Zeitfenster:'}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {deliveryWindows.length === 0 && (
                      <p className="text-xs text-slate-400 italic">
                        {language === 'ar' ? 'لا توجد أوقات مضافة بعد.' : 'Noch keine Zeitfenster angelegt.'}
                      </p>
                    )}
                    {deliveryWindows.map((win) => (
                      <div
                        key={win.id}
                        className={`flex items-center gap-2 pl-3.5 pr-2 py-1.5 rounded-xl border text-xs font-bold transition ${
                          win.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-850 text-emerald-800 dark:text-emerald-300'
                            : 'bg-slate-50 dark:bg-gray-950 border-slate-200 dark:border-gray-800 text-slate-400 dark:text-gray-500'
                        }`}
                      >
                        <span>{windowLabel(win.startHour, win.endHour, language === 'ar')}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleDeliveryWindow(win)}
                          disabled={savingWindowId === win.id}
                          title={win.isActive ? (language === 'ar' ? 'إيقاف' : 'Deaktivieren') : (language === 'ar' ? 'تفعيل' : 'Aktivieren')}
                          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 cursor-pointer"
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDeliveryWindow(win.id)}
                          title={language === 'ar' ? 'حذف' : 'Löschen'}
                          className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Window Inline (No page refresh) */}
              <div className="pt-3 border-t border-slate-100 dark:border-gray-800 space-y-2">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                  {language === 'ar' ? 'إضافة وقت جديد:' : 'Neues Zeitfenster anlegen:'}
                </span>
                <div className="flex flex-wrap items-end gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-400 mb-1">
                      {language === 'ar' ? 'من (ساعة 0–23)' : 'Von (Stunde 0–23)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={newStartHour}
                      onChange={(e) => setNewStartHour(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddDeliveryWindow(e);
                        }
                      }}
                      className="w-20 px-3 py-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-400 mb-1">
                      {language === 'ar' ? 'إلى (ساعة 1–24)' : 'Bis (Stunde 1–24)'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={newEndHour}
                      onChange={(e) => setNewEndHour(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddDeliveryWindow(e);
                        }
                      }}
                      className="w-20 px-3 py-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none transition"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddDeliveryWindow}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold cursor-pointer shadow-xs transition touch-manipulation"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'إضافة وقت' : 'Zeitfenster hinzufügen'}</span>
                  </button>
                </div>
                {windowError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{windowError}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: GOOGLE MAPS & BEWERTUNGEN */}
        {/* ============================================================== */}
        {activeTab === 'google' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Google Integration & Scraper Settings */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-850 p-5 sm:p-7 shadow-xs space-y-5">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-gray-800">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Navigation className="w-4 h-4" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {t('googleMaps')} & {t('googleReviews')}
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300">
                      {t('mapsUrl')}
                    </label>
                    {formData.mapUrl && (
                      <a
                        href={formData.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 inline-flex items-center gap-1 font-semibold"
                      >
                        <span>Vorschau</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <input
                    type="url"
                    value={formData.mapUrl}
                    onChange={(e) => handleChange('mapUrl', e.target.value)}
                    placeholder={t('mapsUrlPlaceholder')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
                    {t('mapsEmbedUrl')}
                  </label>
                  <input
                    type="text"
                    value={formData.mapEmbedUrl}
                    onChange={(e) => handleChange('mapEmbedUrl', e.target.value)}
                    placeholder={t('mapsEmbedUrlPlaceholder')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none transition"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-gray-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300">
                      {t('googleReviewsUrl')}
                    </label>
                    {formData.googleReviewsUrl && (
                      <a
                        href={formData.googleReviewsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 inline-flex items-center gap-1 font-semibold"
                      >
                        <span>Vorschau</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <input
                    type="url"
                    value={formData.googleReviewsUrl}
                    onChange={(e) => handleChange('googleReviewsUrl', e.target.value)}
                    placeholder={t('googleReviewsUrlPlaceholder')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none transition"
                  />
                </div>

                {/* Scraper Metric Card */}
                <div className="p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-1">
                      {language === 'ar' ? 'التقييم الحالي في Google' : 'Aktuelle Google-Bewertung'}
                    </span>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="text-lg font-black text-slate-900 dark:text-white">
                        {settings?.googleRating ? Number(settings.googleRating).toFixed(1) : '5.0'}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {settings?.googleReviewCount || 0} {language === 'ar' ? 'تقييم' : 'Bewertungen'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncGoogle}
                    disabled={syncing}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 shadow-xs transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    <span>{syncing ? (language === 'ar' ? 'جارٍ الجلب...' : 'Wird abgerufen...') : (language === 'ar' ? 'تحديث الآن' : 'Jetzt synchronisieren')}</span>
                  </button>
                </div>

                {syncFeedback && (
                  <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    syncFeedback.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}>
                    {syncFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{syncFeedback.text}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Google Reviews Management */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-850 p-5 sm:p-7 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-gray-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      {t('manageGoogleReviews')}
                    </h2>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-gray-400">
                      {reviews.length} {language === 'ar' ? 'تقييمات معروضة في الموقع' : 'aktive Rezensionen auf der Website'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 bg-slate-50 dark:bg-gray-950 px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-gray-800">
                  <span className="text-xs font-bold text-slate-700 dark:text-gray-300">
                    {t('showGoogleReviews')}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.showGoogleReviews}
                    onClick={() => handleChange('showGoogleReviews', !formData.showGoogleReviews)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none touch-manipulation ${
                      formData.showGoogleReviews ? 'bg-blue-600' : 'bg-slate-300 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                        formData.showGoogleReviews ? (direction === 'rtl' ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {reviewsLoading ? (
                <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span>{t('loading')}</span>
                </div>
              ) : reviews.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 dark:bg-gray-950 rounded-2xl border border-dashed border-slate-200 dark:border-gray-800 p-4">
                  <p>{language === 'ar' ? 'لا توجد تقييمات حالياً.' : 'Keine Rezensionen vorhanden.'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {reviews.map((rev) => {
                    const text = language === 'ar' ? (rev.textAr || rev.text) : (rev.textDe || rev.text);
                    const ratingNum = Math.min(5, Math.max(1, rev.rating || 5));
                    return (
                      <div
                        key={rev.id}
                        className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-gray-950 border border-slate-200/70 dark:border-gray-800 flex flex-col justify-between gap-3 relative group"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {rev.authorPhotoUrl ? (
                                <img
                                  src={rev.authorPhotoUrl}
                                  alt={rev.authorName}
                                  className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-gray-700 shrink-0"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(rev.authorName)}&background=3b82f6&color=fff`;
                                  }}
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                  {rev.authorName ? rev.authorName.slice(0, 2).toUpperCase() : 'G'}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate">
                                  {rev.authorName}
                                </h4>
                                <span className="text-[10px] text-slate-400">
                                  {rev.relativeTime || 'Kürzlich'}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteReview(rev.id)}
                              className="text-slate-300 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              title={t('deleteReview')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-0.5 mb-1.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < ratingNum
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-300 dark:text-gray-700'
                                }`}
                              />
                            ))}
                          </div>

                          <p className="text-xs text-slate-600 dark:text-gray-300 line-clamp-3 leading-relaxed">
                            {text || 'Kein Text vorhanden'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Global Save Button at bottom of active section */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/80 dark:border-gray-850">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 shadow-md shadow-blue-500/20 transition cursor-pointer touch-manipulation"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? t('loading') : t('saveSettings')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
