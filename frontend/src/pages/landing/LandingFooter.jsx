import { Store } from 'lucide-react';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { useLanguage } from '../../context/LanguageContext';
import { Link } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

export const LandingFooter = () => {
  const { getStoreName } = useStoreSettings();
  const { language, t } = useLanguage();
  const { isAuthenticated: isCustomerLoggedIn } = useCustomerAuth();

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-slate-200/80 dark:border-gray-850">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Store className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {getStoreName(language) || 'Hajar Supermarkt'}
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-gray-400 text-center">
          © {new Date().getFullYear()} {getStoreName(language)}. {language === 'ar' ? 'جميع الحقوق محفوظة.' : 'Alle Rechte vorbehalten.'}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-500 dark:text-gray-400">
          <a href="#catalog" className="hover:text-brand-600">{t('catalog')}</a>
          <a href="#reviews" className="hover:text-brand-600">{t('googleReviewsTitle')}</a>
          <Link to="/impressum" className="hover:text-brand-600">{t('impressum')}</Link>
          <Link to="/datenschutz" className="hover:text-brand-600">{t('datenschutz')}</Link>
          <Link to="/agb" className="hover:text-brand-600">{t('agb')}</Link>
          <Link to={isCustomerLoggedIn ? "/account" : "/customer/login"} className="hover:text-brand-600">
            {isCustomerLoggedIn ? (language === 'ar' ? 'حسابي' : 'Mein Konto') : (language === 'ar' ? 'دخول العملاء' : 'Kunden-Login')}
          </Link>
        </div>
      </div>
    </footer>
  );
};
