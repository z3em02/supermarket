import {
  AlertCircle,
  Building2,
  Image as ImageIcon,
  Store,
  Phone,
  Mail,
  MapPin,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { resolveImageUrl } from '../../utils/api';
import { SectionPasscodeCard } from './SectionPasscodeCard';
import { DriverAccountsCard } from './DriverAccountsCard';

export const GeneralTab = ({
  driverAccounts,
  formData,
  handleChange,
  handleToggleMaintenanceMode,
  logoPreviewError,
  maintenanceMessage,
  savingMaintenanceMode,
  sectionPasscode,
  setLogoPreviewError
}) => {
  const { language, direction, t } = useLanguage();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Maintenance Mode — deliberately its own prominent, alert-styled
          card at the top of this tab (not buried alongside routine
          fields) since flipping it takes the whole storefront offline
          for customers. Applies immediately, independent of the
          "Speichern" button below. */}
      <div className={`rounded-2xl sm:rounded-3xl border p-4 sm:p-6 shadow-xs transition-colors ${
        formData.maintenanceMode
          ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
          : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-850'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              formData.maintenanceMode
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                : 'bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400'
            }`}>
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {language === 'ar' ? 'وضع الصيانة' : 'Wartungsmodus'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-gray-400 max-w-md">
                {language === 'ar'
                  ? 'عند التفعيل، يرى العملاء صفحة صيانة ولا يمكن تقديم طلبات جديدة. لوحة التحكم للمشرفين وواجهة السائق تبقى تعمل.'
                  : 'Wenn aktiv, sehen Kunden eine Wartungsseite und können keine neuen Bestellungen aufgeben. Admin-Dashboard und Fahrerportal bleiben erreichbar.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
            <span className={`text-xs font-bold ${formData.maintenanceMode ? 'text-rose-700 dark:text-rose-400' : 'text-slate-500 dark:text-gray-400'}`}>
              {formData.maintenanceMode
                ? (language === 'ar' ? 'مفعّل' : 'Aktiv')
                : (language === 'ar' ? 'غير مفعّل' : 'Inaktiv')}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={formData.maintenanceMode}
              disabled={savingMaintenanceMode}
              onClick={handleToggleMaintenanceMode}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none touch-manipulation disabled:opacity-50 ${
                formData.maintenanceMode ? 'bg-rose-600' : 'bg-slate-300 dark:bg-gray-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                  formData.maintenanceMode ? (direction === 'rtl' ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
        {maintenanceMessage && (
          <p className={`mt-3 text-xs font-semibold ${formData.maintenanceMode ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {maintenanceMessage}
          </p>
        )}
      </div>

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
                type="text"
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
                    src={resolveImageUrl(formData.logoUrl)}
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
                src={resolveImageUrl(formData.logoUrl)}
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

      {/* Section Passcode (Settings/Buchhaltung/Kunden/Aktionen gate) */}
      <SectionPasscodeCard sectionPasscode={sectionPasscode} />

      {/* Drivers (each courier has their own name + individual PIN,
          instead of one PIN shared by everyone) */}
      <DriverAccountsCard driverAccounts={driverAccounts} />
    </div>
  );
};
