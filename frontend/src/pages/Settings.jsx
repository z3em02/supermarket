import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
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
  Truck
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
    freeDeliveryThreshold: '',
    allowedPostalCodes: ''
  });

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [logoPreviewError, setLogoPreviewError] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        storeName: settings.storeName || '',
        storeNameDe: settings.storeNameDe || '',
        storeNameAr: settings.storeNameAr || '',
        logoUrl: settings.logoUrl || '',
        phone: settings.phone || '',
        email: settings.email || '',
        address: settings.address || '',
        mapUrl: settings.mapUrl || '',
        mapEmbedUrl: settings.mapEmbedUrl || '',
        googleReviewsUrl: settings.googleReviewsUrl || '',
        showGoogleReviews: settings.showGoogleReviews !== false,
        minOrderValue: settings.minOrderValue ?? 0,
        deliveryFee: settings.deliveryFee ?? 0,
        freeDeliveryThreshold: settings.freeDeliveryThreshold ?? 0,
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
    if (successMessage) setSuccessMessage('');
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const result = await updateStoreSettings(formData);
      if (result.success) {
        setSuccessMessage(t('settingsSavedSuccess'));
        setTimeout(() => setSuccessMessage(''), 6000);
      } else {
        setErrorMessage(result.error || 'Error saving settings');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncGoogle = async () => {
    setSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await syncGoogleReviews(formData.googleReviewsUrl);
      if (res.success) {
        setSyncFeedback({ 
          type: 'success', 
          text: res.message || (language === 'ar' ? 'تمت مزامنة النجوم والتقييمات بنجاح!' : 'Sterne und Bewertungen erfolgreich synchronisiert!') 
        });
      } else {
        setSyncFeedback({ 
          type: 'error', 
          text: res.error || (language === 'ar' ? 'فشلت المزامنة' : 'Fehler bei der Synchronisierung') 
        });
      }
    } catch (err) {
      setSyncFeedback({ type: 'error', text: err.message });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncFeedback(null), 8000);
    }
  };



  const handleDeleteReview = async (id) => {
    const confirmMsg = language === 'ar' 
      ? 'هل أنت متأكد من حذف هذا التقييم؟' 
      : 'Möchten Sie diese Bewertung wirklich löschen?';
    if (window.confirm(confirmMsg)) {
      const res = await deleteReview(id);
      if (res.success) {
        setSuccessMessage(t('reviewDeletedSuccess'));
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-200/80 dark:border-gray-800 pb-4 sm:pb-5">
        <div>
          <div className="flex items-center gap-2.5 sm:gap-3 mb-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {t('storeSettings')}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 max-w-3xl">
            {t('storeSettingsDesc')}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0 touch-manipulation"
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
        <div className="flex items-center gap-2.5 sm:gap-3 p-3.5 sm:p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200 shadow-sm animate-in fade-in duration-200 text-xs sm:text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2.5 sm:gap-3 p-3.5 sm:p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/80 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 shadow-sm animate-in fade-in duration-200 text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          
          {/* Card 1: Store Name & Identity */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-850 p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5">
            <div className="flex items-center gap-2.5 sm:gap-3 pb-3 border-b border-slate-100 dark:border-gray-800">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {t('storeName')}
              </h2>
            </div>

            <div className="space-y-3.5 sm:space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
                  {t('storeName')} (Standard) *
                </label>
                <input
                  type="text"
                  value={formData.storeName}
                  onChange={(e) => handleChange('storeName', e.target.value)}
                  placeholder="Hajar Supermarkt"
                  className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
                  {t('storeNameDe')} <span className="text-[10px] font-normal text-slate-400 capitalize">(Deutsch)</span>
                </label>
                <input
                  type="text"
                  value={formData.storeNameDe}
                  onChange={(e) => handleChange('storeNameDe', e.target.value)}
                  placeholder="Hajar Supermarkt Großhandel"
                  className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
                  {t('storeNameAr')} <span className="text-[10px] font-normal text-slate-400 capitalize">(العربية)</span>
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={formData.storeNameAr}
                  onChange={(e) => handleChange('storeNameAr', e.target.value)}
                  placeholder="سوبرماركت هاجر للجملة"
                  className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none transition text-right"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Logo & Branding */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-850 p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-gray-800">
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t('storeLogo')}
              </h2>
            </div>

            <div className="space-y-3.5 sm:space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
                  {t('logoUrl')}
                </label>
                <input
                  type="url"
                  value={formData.logoUrl}
                  onChange={(e) => handleChange('logoUrl', e.target.value)}
                  placeholder={t('logoUrlPlaceholder')}
                  className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none transition"
                />
                <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">
                  Direkter Link zu Ihrem Logo (PNG, JPG, SVG oder WebP).
                </p>
              </div>

              {/* Logo Preview Box */}
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-2">
                  {t('logoPreview')}
                </span>
                <div className="h-24 sm:h-28 rounded-xl sm:rounded-2xl bg-slate-100/70 dark:bg-gray-950 border border-dashed border-slate-300 dark:border-gray-800 flex items-center justify-center p-3 sm:p-4">
                  {formData.logoUrl && !logoPreviewError ? (
                    <img
                      src={formData.logoUrl}
                      alt="Store Logo"
                      onError={() => setLogoPreviewError(true)}
                      className="max-h-16 sm:max-h-20 max-w-full object-contain rounded-lg drop-shadow-sm"
                    />
                  ) : (
                    <div className="text-center text-slate-400 dark:text-gray-500 flex flex-col items-center gap-1.5">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Store className="w-4 sm:w-5 h-4 sm:h-5" />
                      </div>
                      <span className="text-[11px] sm:text-xs">{t('noLogoProvided')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Contact Details (Phone & Email & Address) */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-850 p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5">
            <div className="flex items-center gap-2.5 sm:gap-3 pb-3 border-b border-slate-100 dark:border-gray-800">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {t('contactInfo')}
              </h2>
            </div>

            <div className="space-y-3.5 sm:space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
                  {t('phoneNumber')} *
                </label>
                <div className="relative">
                  <Phone className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500 pointer-events-none" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder={t('phonePlaceholder')}
                    className="w-full ps-10 pe-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
                  {t('emailAddressContact')} *
                </label>
                <div className="relative">
                  <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500 pointer-events-none" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder={t('emailPlaceholder')}
                    className="w-full ps-10 pe-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
                  {t('physicalAddress')}
                </label>
                <div className="relative">
                  <MapPin className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500 pointer-events-none" />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder={t('addressPlaceholder')}
                    className="w-full ps-10 pe-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Google Maps & Google Reviews */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-850 p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5">
            <div className="flex items-center gap-2.5 sm:gap-3 pb-3 border-b border-slate-100 dark:border-gray-800">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Navigation className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {t('googleMaps')} & {t('googleReviews')}
              </h2>
            </div>

            <div className="space-y-3.5 sm:space-y-4">
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
                  className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none transition"
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
                  className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none transition"
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
                  className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              {/* Live Scraped Google Metrics */}
              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-1">
                    {language === 'ar' ? 'التقييم الحالي في Google' : 'Aktuelle Google-Bewertung'}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-0.5">
                      <Star className="w-4 sm:w-5 h-4 sm:h-5 fill-amber-400 text-amber-400" />
                    </div>
                    <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                      {settings?.googleRating ? Number(settings.googleRating).toFixed(1) : '5.0'}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {settings?.googleReviewCount || 0} {language === 'ar' ? 'تقييم' : 'Bewertungen'}
                    </span>
                  </div>
                </div>
                <div className="text-end shrink-0">
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-1 rounded-lg bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 shadow-xs">
                    <span>Google Scraper</span>
                  </span>
                </div>
              </div>

              {/* Scraper Action Button & Feedback */}
              <div className="pt-2 space-y-3">
                <button
                  type="button"
                  onClick={handleSyncGoogle}
                  disabled={syncing}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 shadow-md shadow-emerald-500/20 transition cursor-pointer touch-manipulation"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  <span>
                    {syncing
                      ? (language === 'ar' ? 'جارٍ جلب التقييمات والنجوم من Google...' : 'Google-Sterne & Bewertungen werden abgerufen...')
                      : (language === 'ar' ? 'جلب النجوم والتقييمات من Google' : 'Sterne & Bewertungen von Google abrufen')}
                  </span>
                </button>

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

                <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center leading-relaxed">
                  {language === 'ar'
                    ? 'يتم تشغيل السكرابر لجلب النجوم والتقييمات الحقيقية من رابط Google Maps فور الضغط على الزر.'
                    : 'Klicken Sie auf den Button, um den Google Scraper zu starten und die echten Sterne sowie Rezensionen live zu importieren.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card: Delivery Rules (Full Width) */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-850 p-4 sm:p-8 shadow-sm space-y-5 sm:space-y-6">
          <div className="flex items-center gap-2.5 sm:gap-3 pb-4 border-b border-slate-100 dark:border-gray-800">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Truck className="w-4 sm:w-5 h-4 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white">
                {t('deliveryRules')}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-gray-400">
                {t('deliveryRulesDesc')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
                {t('minOrderValue')}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.minOrderValue}
                onChange={(e) => handleChange('minOrderValue', e.target.value)}
                className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
                {t('deliveryFee')}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.deliveryFee}
                onChange={(e) => handleChange('deliveryFee', e.target.value)}
                className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none transition"
              />
            </div>

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
                className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none transition"
              />
              <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">
                {t('freeDeliveryThresholdHint')}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
              {t('allowedPostalCodes')}
            </label>
            <input
              type="text"
              value={formData.allowedPostalCodes}
              onChange={(e) => handleChange('allowedPostalCodes', e.target.value)}
              placeholder={t('allowedPostalCodesPlaceholder')}
              className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none transition"
            />
            <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">
              {t('allowedPostalCodesHint')}
            </p>
          </div>
        </div>

        {/* Card 5: Google Reviews Management (Full Width) */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-850 p-4 sm:p-8 shadow-sm space-y-5 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 pb-4 border-b border-slate-100 dark:border-gray-800">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Star className="w-4 sm:w-5 h-4 sm:h-5 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <h2 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white">
                  {t('manageGoogleReviews')}
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-gray-400">
                  {reviews.length} {language === 'ar' ? 'تقييمات معروضة في الموقع' : 'aktive Rezensionen auf der Website'}
                </p>
              </div>
            </div>

            {/* Toggle Button for Reviews Visibility on Website */}
            <div className="flex items-center justify-between sm:justify-end gap-3 bg-slate-50 dark:bg-gray-950 px-3.5 sm:px-4 py-2 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-gray-800">
              <div className="text-start sm:text-end">
                <span className="text-xs font-bold text-slate-800 dark:text-gray-200 block leading-tight">
                  {t('showGoogleReviews')}
                </span>
                <span className={`text-[11px] font-semibold ${
                  formData.showGoogleReviews ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-gray-500'
                }`}>
                  {formData.showGoogleReviews ? t('reviewsVisibilityActive') : t('reviewsVisibilityHidden')}
                </span>
              </div>
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
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    formData.showGoogleReviews ? (direction === 'rtl' ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Sync-Only Notice */}
          <div className="p-3.5 rounded-xl sm:rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <p className="font-medium">{t('reviewsSyncedOnlyNotice')}</p>
          </div>

          {/* Review items grid */}
          {reviewsLoading ? (
            <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>{t('loading')}</span>
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 dark:bg-gray-950 rounded-2xl border border-dashed border-slate-200 dark:border-gray-800 p-4">
              <p>{language === 'ar' ? 'لا توجد تقييمات حالياً. استخدم زر "مزامنة من Google" لجلب التقييمات.' : 'Keine Rezensionen vorhanden. Nutzen Sie den Button "Von Google synchronisieren".'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {reviews.map((rev) => {
                const text = language === 'ar' ? (rev.textAr || rev.text) : (rev.textDe || rev.text);
                const ratingNum = Math.min(5, Math.max(1, rev.rating || 5));
                return (
                  <div
                    key={rev.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-gray-950 border border-slate-200/70 dark:border-gray-800 flex flex-col justify-between gap-3 relative group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {rev.authorPhotoUrl ? (
                            <img
                              src={rev.authorPhotoUrl}
                              alt={rev.authorName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-gray-700 shrink-0"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(rev.authorName)}&background=3b82f6&color=fff`;
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {rev.authorName ? rev.authorName.slice(0, 2).toUpperCase() : 'G'}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate">
                              {rev.authorName}
                            </h4>
                            <span className="text-[10px] sm:text-[11px] text-slate-400">
                              {rev.relativeTime || 'Kürzlich'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteReview(rev.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer touch-manipulation shrink-0"
                          title={language === 'ar' ? 'حذف التقييم' : 'Bewertung löschen'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-0.5 mb-2">
                        {[...Array(ratingNum)].map((_, i) => (
                          <Star key={i} className="w-3 sm:w-3.5 h-3 sm:h-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 italic">
                        "{text}"
                      </p>
                    </div>

                    {(rev.textDe && rev.textAr) && (
                      <div className="pt-2 border-t border-slate-200/50 dark:border-gray-800 text-[10px] sm:text-[11px] text-slate-400 flex items-center justify-between">
                        <span>DE & AR vorhanden</span>
                        <span className="text-emerald-500 font-semibold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verifiziert</span>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Website Preview Banner */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xl border border-slate-800 space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <Sparkles className="w-4 sm:w-5 h-4 sm:h-5 text-amber-400 shrink-0" />
              <h3 className="text-sm sm:text-lg font-bold truncate">
                {t('livePreview')} (Header & Brand Bar)
              </h3>
            </div>
            <span className="text-[10px] sm:text-xs px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/10 text-slate-300 font-mono shrink-0">
              Live Mockup
            </span>
          </div>

          {/* Mock Header Preview */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4">
            <div className="flex items-center gap-3">
              {formData.logoUrl && !logoPreviewError ? (
                <img
                  src={formData.logoUrl}
                  alt="Logo preview"
                  className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-xl bg-white p-1 shadow-sm shrink-0"
                />
              ) : (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30 shrink-0">
                  <Store className="w-4 sm:w-5 h-4 sm:h-5" />
                </div>
              )}
              <div className="min-w-0">
                <h4 className="text-sm sm:text-lg font-black tracking-tight truncate">
                  {(language === 'ar' ? formData.storeNameAr : formData.storeNameDe) || formData.storeName || 'Hajar Supermarkt'}
                </h4>
                <p className="text-[11px] sm:text-xs text-blue-200 font-medium truncate">
                  {language === 'ar' ? 'سوبرماركت وتوصيل منزلي' : 'Supermarkt & Lieferservice'}
                </p>
              </div>
            </div>

            {/* Quick Contact & Badges */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
              {formData.phone && (
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-white/15 text-white font-medium text-[11px] sm:text-xs">
                  <Phone className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-emerald-400" />
                  <span>{formData.phone}</span>
                </span>
              )}
              {formData.email && (
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-white/15 text-white font-medium text-[11px] sm:text-xs">
                  <Mail className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-blue-300" />
                  <span>{formData.email}</span>
                </span>
              )}
              {formData.googleRating && (
                <span className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold text-[11px] sm:text-xs">
                  <Star className="w-3 sm:w-3.5 h-3 sm:h-3.5 fill-amber-400 text-amber-400" />
                  <span>{formData.googleRating} ({formData.googleReviewCount})</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Save Action */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/80 dark:border-gray-850">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 shadow-lg shadow-blue-500/25 transition-all cursor-pointer touch-manipulation"
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
