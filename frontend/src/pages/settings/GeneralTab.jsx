import {
  AlertCircle,
  Building2,
  Image as ImageIcon,
  Store,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  ShoppingCart,
  Clock
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { resolveImageUrl } from '../../utils/api';
import { Card, CardHeader, Input, Switch } from '../../components/ui';
import { SectionPasscodeCard } from './SectionPasscodeCard';
import { DriverAccountsCard } from './DriverAccountsCard';

export const GeneralTab = ({
  driverAccounts,
  formData,
  handleChange,
  handleToggleMaintenanceMode,
  handleToggleOrdersPaused,
  logoPreviewError,
  maintenanceMessage,
  ordersPausedMessage,
  savingMaintenanceMode,
  savingOrdersPaused,
  sectionPasscode,
  setLogoPreviewError
}) => {
  const { language, t } = useLanguage();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Maintenance Mode — deliberately its own prominent, alert-styled
          card at the top of this tab (not buried alongside routine
          fields) since flipping it takes the whole storefront offline
          for customers. Applies immediately, independent of the
          "Speichern" button below. */}
      <Card className={formData.maintenanceMode ? '!bg-danger-50 dark:!bg-danger-950/30 !border-danger-300 dark:!border-danger-800' : ''}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              formData.maintenanceMode
                ? 'bg-danger-100 dark:bg-danger-950/60 text-danger-600 dark:text-danger-400'
                : 'bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-slate-400'
            }`}>
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-heading-md">
                {language === 'ar' ? 'وضع الصيانة' : 'Wartungsmodus'}
              </h2>
              <p className="text-caption max-w-md">
                {language === 'ar'
                  ? 'عند التفعيل، يرى العملاء صفحة صيانة ولا يمكن تقديم طلبات جديدة. لوحة التحكم للمشرفين وواجهة السائق تبقى تعمل.'
                  : 'Wenn aktiv, sehen Kunden eine Wartungsseite und können keine neuen Bestellungen aufgeben. Admin-Dashboard und Fahrerportal bleiben erreichbar.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <span className={`text-xs font-bold ${formData.maintenanceMode ? 'text-danger-700 dark:text-danger-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {formData.maintenanceMode
                ? (language === 'ar' ? 'مفعّل' : 'Aktiv')
                : (language === 'ar' ? 'غير مفعّل' : 'Inaktiv')}
            </span>
            <Switch
              checked={formData.maintenanceMode}
              onChange={handleToggleMaintenanceMode}
              disabled={savingMaintenanceMode}
              tone="danger"
              label={language === 'ar' ? 'وضع الصيانة' : 'Wartungsmodus'}
            />
          </div>
        </div>
        {maintenanceMessage && (
          <p className={`mt-3 text-xs font-semibold ${formData.maintenanceMode ? 'text-danger-700 dark:text-danger-400' : 'text-success-600 dark:text-success-400'}`}>
            {maintenanceMessage}
          </p>
        )}
      </Card>

      {/* Pause ordering — lighter than maintenance: the shop stays browsable,
          only checkout is closed. Applies immediately, independent of the
          "Speichern" button below. */}
      <Card className={formData.ordersPaused ? '!bg-warning-50 dark:!bg-warning-950/30 !border-warning-300 dark:!border-warning-800' : ''}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              formData.ordersPaused
                ? 'bg-warning-100 dark:bg-warning-950/60 text-warning-600 dark:text-warning-400'
                : 'bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-slate-400'
            }`}>
              <ShoppingCart className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-heading-md">
                {language === 'ar' ? 'إيقاف استقبال الطلبات' : 'Bestellannahme pausieren'}
              </h2>
              <p className="text-caption max-w-md">
                {language === 'ar'
                  ? 'عند التفعيل، يبقى المتجر قابلاً للتصفح لكن لا يمكن للعملاء إتمام الطلب (الكاسة معطّلة). يمكن للمشرف تسجيل الطلبات يدوياً.'
                  : 'Wenn aktiv, bleibt der Shop sichtbar, aber Kunden können nicht bestellen (Kasse deaktiviert). Admin-Bestellungen bleiben möglich.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <span className={`text-xs font-bold ${formData.ordersPaused ? 'text-warning-700 dark:text-warning-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {formData.ordersPaused
                ? (language === 'ar' ? 'مفعّل' : 'Aktiv')
                : (language === 'ar' ? 'غير مفعّل' : 'Inaktiv')}
            </span>
            <Switch
              checked={formData.ordersPaused}
              onChange={handleToggleOrdersPaused}
              disabled={savingOrdersPaused}
              tone="warning"
              label={language === 'ar' ? 'إيقاف استقبال الطلبات' : 'Bestellannahme pausieren'}
            />
          </div>
        </div>
        {ordersPausedMessage && (
          <p className={`mt-3 text-xs font-semibold ${formData.ordersPaused ? 'text-warning-700 dark:text-warning-400' : 'text-success-600 dark:text-success-400'}`}>
            {ordersPausedMessage}
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Store Name & Language */}
        <Card>
          <CardHeader icon={Building2} title={t('storeName')} />
          <div className="space-y-3.5">
            <Input
              label={`${t('storeName')} (Standard) *`}
              type="text"
              value={formData.storeName}
              onChange={(e) => handleChange('storeName', e.target.value)}
              placeholder="Hajar Supermarkt"
              required
            />
            <Input
              label={`${t('storeNameDe')} (Deutsch)`}
              type="text"
              value={formData.storeNameDe}
              onChange={(e) => handleChange('storeNameDe', e.target.value)}
              placeholder="Hajar Supermarkt Großhandel"
            />
            <Input
              label={`${t('storeNameAr')} (العربية)`}
              type="text"
              dir="rtl"
              value={formData.storeNameAr}
              onChange={(e) => handleChange('storeNameAr', e.target.value)}
              placeholder="سوبرماركت هاجر"
            />
          </div>
        </Card>

        {/* Logo & Branding */}
        <Card>
          <CardHeader icon={ImageIcon} title={t('storeLogo')} />
          <div className="space-y-3.5">
            <Input
              label={t('logoUrl')}
              hint="Link zu Ihrem Logo (PNG, JPG, SVG oder WebP)."
              type="text"
              value={formData.logoUrl}
              onChange={(e) => handleChange('logoUrl', e.target.value)}
              placeholder={t('logoUrlPlaceholder')}
            />

            <div className="space-y-1.5">
              <span className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                {t('logoPreview')}
              </span>
              <div className="h-24 rounded-xl bg-slate-50 dark:bg-gray-950 border border-dashed border-slate-200 dark:border-gray-800 flex items-center justify-center p-3">
                {formData.logoUrl && !logoPreviewError ? (
                  <img
                    src={resolveImageUrl(formData.logoUrl)}
                    alt="Store Logo"
                    onError={() => setLogoPreviewError(true)}
                    className="max-h-16 max-w-full object-contain drop-shadow-sm"
                  />
                ) : (
                  <div className="text-center text-slate-500 flex flex-col items-center gap-1">
                    <Store className="w-6 h-6 text-slate-300 dark:text-slate-400" aria-hidden="true" />
                    <span className="text-caption">{t('noLogoProvided')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Contact Details Card */}
      <Card>
        <CardHeader icon={Phone} title={t('contactInfo')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={`${t('phoneNumber')} *`}
            icon={Phone}
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder={t('phonePlaceholder')}
          />
          <Input
            label={`${t('emailAddressContact')} *`}
            icon={Mail}
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder={t('emailPlaceholder')}
          />
          <div className="sm:col-span-2">
            <Input
              label={t('physicalAddress')}
              icon={MapPin}
              type="text"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder={t('addressPlaceholder')}
            />
          </div>
          <Input
            label={language === 'ar' ? 'ساعات العمل (ألماني)' : 'Öffnungszeiten (Deutsch)'}
            icon={Clock}
            type="text"
            value={formData.openingHoursDe}
            onChange={(e) => handleChange('openingHoursDe', e.target.value)}
            placeholder="Mo – Sa: 08:00 – 19:00 Uhr"
          />
          <Input
            label={language === 'ar' ? 'ساعات العمل (عربي)' : 'Öffnungszeiten (Arabisch)'}
            icon={Clock}
            type="text"
            value={formData.openingHoursAr}
            onChange={(e) => handleChange('openingHoursAr', e.target.value)}
            placeholder="الإثنين - السبت: ٠٨:٠٠ - ١٩:٠٠"
          />
        </div>
      </Card>

      {/* Live Website Preview Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-primary-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-800 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-warning-400 shrink-0" aria-hidden="true" />
            <h3 className="text-sm font-bold truncate">
              {t('livePreview')} (Header & Brand)
            </h3>
          </div>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
            Live Mockup
          </span>
        </div>

        <div className="bg-white/10 rounded-xl p-4 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {formData.logoUrl && !logoPreviewError ? (
              <img
                src={resolveImageUrl(formData.logoUrl)}
                alt="Logo preview"
                className="w-9 h-9 object-contain rounded-xl bg-white p-1 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-sm shrink-0">
                <Store className="w-4 h-4" aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0">
              <h4 className="text-sm sm:text-base font-black tracking-tight truncate">
                {(language === 'ar' ? formData.storeNameAr : formData.storeNameDe) || formData.storeName || 'Hajar Supermarkt'}
              </h4>
              <p className="text-xs text-slate-300 font-medium truncate">
                {language === 'ar' ? 'سوبرماركت وتوصيل منزلي' : 'Supermarkt & Lieferservice'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {formData.phone && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 text-white font-medium">
                <Phone className="w-3 h-3 text-success-400" aria-hidden="true" />
                <span>{formData.phone}</span>
              </span>
            )}
            {formData.email && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 text-white font-medium">
                <Mail className="w-3 h-3 text-primary-300" aria-hidden="true" />
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
