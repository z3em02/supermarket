import {
  MapPin,
  Phone,
  Mail,
  Clock,
  ExternalLink,
  CheckCircle2,
  Star
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useStoreSettings } from '../../context/StoreSettingsContext';

export const ContactSection = () => {
  const { t, language } = useLanguage();
  const { getStoreName, settings } = useStoreSettings();

  return (
    <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-200/80 dark:border-gray-850">
      <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
          <MapPin className="w-3.5 h-3.5" />
          <span>{t('contactAndLocation')}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          {language === 'ar' ? 'تفضلوا بزيارتنا أو تواصلوا معنا' : 'Besuchen Sie uns vor Ort oder kontaktieren Sie uns'}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Contact Details Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-6">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            {getStoreName(language) || 'Hajar Supermarkt'}
          </h3>

          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <span className="block font-bold text-slate-900 dark:text-white">{t('addressLabel')}</span>
                <span>{settings?.address || 'Koppreitergasse 8, 1120 Wien'}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <span className="block font-bold text-slate-900 dark:text-white">{t('phoneLabel')}</span>
                <a href={`tel:${settings?.phone || '0681 20800852'}`} className="hover:text-blue-600">
                  {settings?.phone || '0681 20800852'}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <span className="block font-bold text-slate-900 dark:text-white">{t('emailLabel')}</span>
                <a href={`mailto:${settings?.email || 'info@hajar-supermarkt.at'}`} className="hover:text-blue-600">
                  {settings?.email || 'info@hajar-supermarkt.at'}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="block font-bold text-slate-900 dark:text-white">{t('businessHours')}</span>
                <span>{t('businessHoursValue')}</span>
              </div>
            </div>
          </div>

          {settings?.mapUrl && (
            <a
              href={settings.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-slate-800 dark:text-white text-xs font-bold transition-all"
            >
              <MapPin className="w-4 h-4 text-rose-500" />
              <span>{t('viewOnMap')}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Interactive Google Map Embed */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-850 p-4 sm:p-6 shadow-2xs flex flex-col justify-between overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'موقع مركزي في فيينا' : 'Zentrale Lage in Wien'}</span>
              </span>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
                {settings?.address || 'Koppreitergasse 8, 1120 Wien'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {settings?.mapUrl && (
                <a
                  href={settings.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{t('viewOnMap')}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {settings?.googleReviewsUrl && (
                <a
                  href={settings.googleReviewsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-slate-700 dark:text-white font-bold text-xs transition-colors"
                >
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>{t('writeGoogleReview')}</span>
                </a>
              )}
            </div>
          </div>

          {/* Live Google Maps Iframe */}
          {settings?.mapEmbedUrl ? (
            <div className="w-full h-80 sm:h-96 rounded-xl overflow-hidden border border-slate-200 dark:border-gray-800 shadow-inner">
              <iframe
                title="Store Google Maps Location"
                src={settings.mapEmbedUrl}
                className="w-full h-full border-0"
                loading="lazy"
                allowFullScreen
              />
            </div>
          ) : null}
        </div>

      </div>
    </section>
  );
};
