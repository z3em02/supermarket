import {
  Star,
  ExternalLink,
  ArrowLeft,
  ArrowRight,
  User,
  ShieldCheck,
  Truck
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { Link } from 'react-router-dom';

export const HeroSection = ({
  countNum,
  hasRealRating,
  ratingNum
}) => {
  const { language, t, direction } = useLanguage();
  const { settings } = useStoreSettings();
  const { isAuthenticated: isCustomerLoggedIn } = useCustomerAuth();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary-50/70 via-slate-50 to-white dark:from-gray-900 dark:via-gray-950 dark:to-gray-950 pt-8 pb-12 sm:pt-16 sm:pb-24 border-b border-slate-200/70 dark:border-gray-850">
      {/* Decorative background glows */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -start-24 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-brand-300/30 dark:bg-brand-600/10 blur-3xl" />
        <div className="absolute -bottom-32 -end-16 w-72 h-72 sm:w-[28rem] sm:h-[28rem] rounded-full bg-primary-300/30 dark:bg-primary-600/10 blur-3xl" />
        <div className="absolute top-1/3 start-1/2 w-56 h-56 sm:w-72 sm:h-72 rounded-full bg-warning-200/25 dark:bg-warning-500/10 blur-3xl" />
      </div>
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-4 sm:space-y-6">

          {/* Google Rating Trust Badge */}
          {hasRealRating ? (
            <div className="inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 px-3 sm:px-4 py-1.5 rounded-full bg-white dark:bg-gray-850 border border-slate-200/80 dark:border-gray-750 shadow-xs text-xs max-w-full">
              <div className="flex items-center gap-0.5 sm:gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-warning-400 text-warning-400" />
                ))}
              </div>
              <span className="font-extrabold text-slate-900 dark:text-white">
                {ratingNum.toFixed(1)}
              </span>
              <span className="text-slate-400 dark:text-slate-500 hidden xs:inline">•</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs">
                {countNum === 1
                  ? (language === 'ar' ? 'تقييم حقيقي واحد على Google' : '1 verifizierte Google-Bewertung')
                  : `${countNum} ${language === 'ar' ? (countNum <= 10 ? 'تقييمات حقيقية على Google' : 'تقييم حقيقي على Google') : 'verifizierte Google-Bewertungen'}`}
              </span>
              {settings?.googleReviewsUrl && (
                <a
                  href={settings.googleReviewsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-primary-600 hover:text-primary-700 dark:text-primary-400 font-bold ms-1"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ) : (
            <div className="inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 px-3 sm:px-4 py-1.5 rounded-full bg-white dark:bg-gray-850 border border-dashed border-slate-200/80 dark:border-gray-750 text-xs max-w-full">
              <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs">
                {language === 'ar' ? 'لا توجد تقييمات بعد — كن أول من يقيّم' : 'Noch keine Bewertungen — seien Sie der/die Erste'}
              </span>
              {settings?.googleReviewsUrl && (
                <a
                  href={settings.googleReviewsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-primary-600 hover:text-primary-700 dark:text-primary-400 font-bold ms-1"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {/* Main Headline */}
          <h1 className="text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.18] sm:leading-[1.15]">
            {t('heroTitle')}
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto px-2">
            {t('heroSubtitle')}
          </p>

          {/* Hero CTAs */}
          <div className="pt-2 flex flex-col xs:flex-row flex-wrap items-center justify-center gap-2.5 sm:gap-4 w-full">
            <a
              href="#catalog"
              className="w-full xs:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm sm:text-base shadow-sm hover:shadow transition-all cursor-pointer touch-manipulation"
            >
              <span>{t('exploreProducts')}</span>
              {direction === 'rtl' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </a>

            {isCustomerLoggedIn ? (
              <Link
                to="/account"
                className="w-full xs:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-gray-850 hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-800 dark:text-white font-bold text-sm sm:text-base border border-slate-200 dark:border-gray-750 shadow-2xs transition-all cursor-pointer touch-manipulation"
              >
                <User className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>{language === 'ar' ? 'حسابي وطلباتي' : 'Mein Konto & Bestellungen'}</span>
              </Link>
            ) : (
              <Link
                to="/customer/login"
                className="w-full xs:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-gray-850 hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-800 dark:text-white font-bold text-sm sm:text-base border border-slate-200 dark:border-gray-750 shadow-2xs transition-all cursor-pointer touch-manipulation"
              >
                <User className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>{language === 'ar' ? 'دخول العملاء / تسجيل' : 'Kunden-Login / Registrieren'}</span>
              </Link>
            )}
          </div>

          {/* 3 Core Value Cards */}
          <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-start">
            <div className="p-4 rounded-2xl bg-white/80 dark:bg-gray-850/80 border border-slate-200/80 dark:border-gray-850 shadow-2xs backdrop-blur-xs">
              <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/70 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                {t('b2bFeatureTitle1')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                {t('b2bFeatureDesc1')}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/80 dark:bg-gray-850/80 border border-slate-200/80 dark:border-gray-850 shadow-2xs backdrop-blur-xs">
              <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/70 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-3">
                <Star className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                {t('b2bFeatureTitle2')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                {t('b2bFeatureDesc2')}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/80 dark:bg-gray-850/80 border border-slate-200/80 dark:border-gray-850 shadow-2xs backdrop-blur-xs">
              <div className="w-9 h-9 rounded-xl bg-warning-50 dark:bg-warning-950/70 text-warning-600 dark:text-warning-400 flex items-center justify-center mb-3">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                {t('b2bFeatureTitle3')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                {t('b2bFeatureDesc3')}
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
