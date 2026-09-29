import { useState, useEffect } from 'react';
import axios from '../utils/adminAxios';
import { useLanguage } from '../context/LanguageContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { getApiUrl } from '../utils/api';
import {
  Store,
  Star,
  Save,
  CheckCircle2,
  AlertCircle,
  Building2,
  Truck,
  Gavel
} from 'lucide-react';
import { useDriverAccounts } from './settings/useDriverAccounts';
import { useSectionPasscode } from './settings/useSectionPasscode';
import { useDeliveryWindows } from './settings/useDeliveryWindows';
import { LegalTab } from './settings/LegalTab';
import { GoogleTab } from './settings/GoogleTab';
import { DeliveryTab } from './settings/DeliveryTab';
import { GeneralTab } from './settings/GeneralTab';
import { useConfirm } from '../context/FeedbackContext';

export const Settings = () => {
  const { t, language } = useLanguage();
  const confirm = useConfirm();
  const {
    settings,
    updateStoreSettings,
    reviews,
    deleteReview,
    syncGoogleReviews
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
    maintenanceMode: false,
    minOrderValue: '',
    deliveryFee: '',
    deliveryFeePerKm: '',
    freeDeliveryThreshold: '',
    maxDeliveryDistanceKm: '',
    storeLatitude: '',
    storeLongitude: '',
    allowedPostalCodes: '',
    legalOwnerName: '',
    gisaNumber: '',
    isKleinunternehmer: true,
    vatId: '',
    businessPurposeDe: '',
    businessPurposeAr: ''
  });

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [logoPreviewError, setLogoPreviewError] = useState(false);
  const [geocodingStore, setGeocodingStore] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null);

  const deliveryWindowSettings = useDeliveryWindows();
  const { deliveryWindows } = deliveryWindowSettings;

  const sectionPasscode = useSectionPasscode();

  const driverAccounts = useDriverAccounts();

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
        maintenanceMode: settings.maintenanceMode === true,
        minOrderValue: settings.minOrderValue ?? 0,
        deliveryFee: settings.deliveryFee ?? 2.0,
        deliveryFeePerKm: settings.deliveryFeePerKm ?? 0.10,
        freeDeliveryThreshold: settings.freeDeliveryThreshold ?? 0,
        maxDeliveryDistanceKm: settings.maxDeliveryDistanceKm ?? 0,
        storeLatitude: settings.storeLatitude ?? 48.1746605,
        storeLongitude: settings.storeLongitude ?? 16.3272662,
        allowedPostalCodes: settings.allowedPostalCodes || '',
        legalOwnerName: (settings.legalOwnerName && settings.legalOwnerName !== 'null') ? settings.legalOwnerName : '',
        gisaNumber: (settings.gisaNumber && settings.gisaNumber !== 'null') ? settings.gisaNumber : '',
        isKleinunternehmer: settings.isKleinunternehmer !== false,
        vatId: (settings.vatId && settings.vatId !== 'null') ? settings.vatId : '',
        businessPurposeDe: settings.businessPurposeDe || '',
        businessPurposeAr: settings.businessPurposeAr || ''
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

  // Maintenance mode applies immediately on click via its own API call,
  // rather than waiting for the general "Speichern" button — this is meant
  // for genuine emergencies (closing the store right now), and shouldn't be
  // blocked by an unrelated validation error elsewhere in this large form,
  // or left in limbo if the admin toggles it then navigates away before
  // saving everything else.
  const [savingMaintenanceMode, setSavingMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const handleToggleMaintenanceMode = async () => {
    const next = !formData.maintenanceMode;
    setSavingMaintenanceMode(true);
    setMaintenanceMessage('');
    const res = await updateStoreSettings({ maintenanceMode: next });
    if (res.success) {
      setFormData((prev) => ({ ...prev, maintenanceMode: next }));
      setMaintenanceMessage(
        next
          ? (language === 'ar' ? 'وضع الصيانة مفعّل — المتجر مغلق أمام العملاء' : 'Wartungsmodus aktiv — Shop ist für Kunden gesperrt')
          : (language === 'ar' ? 'تم إلغاء وضع الصيانة — المتجر متاح مجدداً' : 'Wartungsmodus beendet — Shop ist wieder erreichbar')
      );
    } else {
      setMaintenanceMessage(res.error || (language === 'ar' ? 'حدث خطأ' : 'Ein Fehler ist aufgetreten'));
    }
    setSavingMaintenanceMode(false);
  };

  const handleGeocodeStoreAddress = async () => {
    try {
      setGeocodingStore(true);
      setSuccessMessage('');
      setErrorMessage('');
      const apiUrl = getApiUrl();
      const res = await axios.post(`${apiUrl}/api/delivery-distance/geocode-store`, {});
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
        maintenanceMode: formData.maintenanceMode,
        minOrderValue: formData.minOrderValue !== '' ? parseFloat(formData.minOrderValue) : 0,
        deliveryFee: formData.deliveryFee !== '' ? parseFloat(formData.deliveryFee) : 0,
        deliveryFeePerKm: formData.deliveryFeePerKm !== '' ? parseFloat(formData.deliveryFeePerKm) : 0,
        freeDeliveryThreshold: formData.freeDeliveryThreshold !== '' ? parseFloat(formData.freeDeliveryThreshold) : 0,
        maxDeliveryDistanceKm: formData.maxDeliveryDistanceKm !== '' ? parseFloat(formData.maxDeliveryDistanceKm) : 0,
        storeLatitude: formData.storeLatitude !== '' ? parseFloat(formData.storeLatitude) : null,
        storeLongitude: formData.storeLongitude !== '' ? parseFloat(formData.storeLongitude) : null,
        allowedPostalCodes: formData.allowedPostalCodes.trim() || null,
        legalOwnerName: formData.legalOwnerName.trim() || null,
        gisaNumber: formData.gisaNumber.trim() || null,
        isKleinunternehmer: formData.isKleinunternehmer,
        vatId: formData.vatId.trim() || null,
        businessPurposeDe: formData.businessPurposeDe.trim() || null,
        businessPurposeAr: formData.businessPurposeAr.trim() || null
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
    if (await confirm({ message: t('confirmDeleteReview'), confirmText: t('delete'), variant: 'danger' })) {
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
    },
    {
      id: 'legal',
      label: language === 'ar' ? 'بيانات قانونية (AGB/Impressum)' : 'Rechtliches (AGB/Impressum)',
      icon: Gavel
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-primary-600/10 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <h1 className="text-heading-xl">
              {t('storeSettings')}
            </h1>
          </div>
          <p className="text-body-muted">
            {t('storeSettingsDesc')}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-primary-600 hover:bg-primary-700 active:bg-primary-800 disabled:opacity-50 shadow-md shadow-primary-500/20 transition cursor-pointer shrink-0 touch-manipulation"
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
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-success-50 dark:bg-success-950/50 border border-success-200/80 dark:border-success-900/60 text-success-800 dark:text-success-200 shadow-sm animate-fade-in text-xs sm:text-sm">
          <CheckCircle2 className="w-4 h-4 text-success-600 dark:text-success-400 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-danger-50 dark:bg-danger-950/50 border border-danger-200/80 dark:border-danger-900/60 text-danger-800 dark:text-danger-200 shadow-sm animate-fade-in text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 text-danger-600 dark:text-danger-400 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Clean Category Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-gray-800/70 rounded-2xl overflow-x-auto border border-slate-200/80 dark:border-gray-700/80 shadow-sm">
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
              <Icon className={`w-4 h-4 ${isActive ? 'text-primary-600 dark:text-primary-400' : ''}`} />
              <span>{tab.label}</span>
              {tab.badge != null && (
                <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                  isActive
                    ? 'bg-primary-100 dark:bg-primary-950/70 text-primary-700 dark:text-primary-300'
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
          <GeneralTab
            driverAccounts={driverAccounts}
            formData={formData}
            handleChange={handleChange}
            handleToggleMaintenanceMode={handleToggleMaintenanceMode}
            logoPreviewError={logoPreviewError}
            maintenanceMessage={maintenanceMessage}
            savingMaintenanceMode={savingMaintenanceMode}
            sectionPasscode={sectionPasscode}
            setLogoPreviewError={setLogoPreviewError}
          />
        )}

        {/* ============================================================== */}
        {/* TAB 2: LIEFERUNG & ZEITFENSTER */}
        {/* ============================================================== */}
        {activeTab === 'delivery' && (
          <DeliveryTab
            deliveryWindowSettings={deliveryWindowSettings}
            formData={formData}
            geocodingStore={geocodingStore}
            handleChange={handleChange}
            handleGeocodeStoreAddress={handleGeocodeStoreAddress}
          />
        )}

        {/* ============================================================== */}
        {/* TAB 3: GOOGLE MAPS & BEWERTUNGEN */}
        {/* ============================================================== */}
        {activeTab === 'google' && (
          <GoogleTab
            formData={formData}
            handleChange={handleChange}
            handleDeleteReview={handleDeleteReview}
            handleSyncGoogle={handleSyncGoogle}
            syncFeedback={syncFeedback}
            syncing={syncing}
          />
        )}

        {/* ============================================================== */}
        {/* TAB 4: RECHTLICHES (AGB & IMPRESSUM) */}
        {/* ============================================================== */}
        {activeTab === 'legal' && (
          <LegalTab formData={formData} handleChange={handleChange} />
        )}

        {/* Global Save Button at bottom of active section */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/80 dark:border-gray-850">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-primary-600 hover:bg-primary-700 active:bg-primary-800 disabled:opacity-50 shadow-md shadow-primary-500/20 transition cursor-pointer touch-manipulation"
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
