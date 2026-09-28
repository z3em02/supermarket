import { Link } from 'react-router-dom';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Store,
  ShoppingCart,
  User,
  LogIn,
  X,
  Menu,
  UserPlus,
  Package,
  Star,
  MapPin
} from 'lucide-react';
import { ThemeToggle } from '../../components/ThemeToggle';
import { LanguageSelector } from '../../components/LanguageSelector';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

export const LandingHeader = ({
  mobileMenuOpen,
  setCartOpen,
  setMobileMenuOpen,
  totalCartCount
}) => {
  const { settings, getStoreName } = useStoreSettings();
  const { language, t } = useLanguage();
  const { isAuthenticated: isCustomerLoggedIn, customer } = useCustomerAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-gray-800 transition-colors shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">

        {/* Logo & Brand */}
        <Link to="/" className="flex items-center gap-2 sm:gap-3 group min-w-0 shrink lg:shrink-0">
          {settings?.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={getStoreName(language)}
              className="w-8 h-8 sm:w-11 sm:h-11 object-contain rounded-xl bg-slate-50 dark:bg-gray-850 p-1 border border-slate-200 dark:border-gray-750 shadow-xs shrink-0"
            />
          ) : (
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200 shrink-0">
              <Store className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          )}
          <div className="min-w-0">
            <span className="text-sm sm:text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white block leading-tight truncate max-w-[130px] xs:max-w-[180px] lg:max-w-none">
              {getStoreName(language) || 'Hajar Supermarkt'}
            </span>
            <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hidden xs:block truncate">
              {language === 'ar' ? 'سوبرماركت وخدمة التوصيل المنزلي' : 'Supermarkt & Lieferservice'}
            </span>
          </div>
        </Link>

        {/* Center Navigation Links (Desktop lg+) */}
        <nav className="hidden lg:flex items-center gap-5 text-sm font-semibold text-slate-600 dark:text-gray-300 shrink-0">
          <a href="#catalog" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {t('catalog')}
          </a>
          <a href="#reviews" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {t('googleReviewsTitle') || 'Google Reviews'}
          </a>
          <a href="#contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {t('contactAndLocation')}
          </a>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Desktop / Tablet switches (hidden on phone, available inside mobile menu) */}
          <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <LanguageSelector />
          </div>

          {/* Cart Button (Always visible on phone & desktop) */}
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="relative inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm shadow-emerald-600/20 transition cursor-pointer touch-manipulation shrink-0"
            aria-label={language === 'ar' ? 'سلة المشتريات' : 'Warenkorb'}
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden md:inline">{language === 'ar' ? 'السلة' : 'Warenkorb'}</span>
            {totalCartCount > 0 && (
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white text-emerald-700 text-[10px] sm:text-[11px] font-black flex items-center justify-center font-mono">
                {totalCartCount}
              </span>
            )}
          </button>

          {/* Desktop / Tablet Customer Auth */}
          <div className="hidden sm:flex items-center">
            {isCustomerLoggedIn ? (
              <Link
                to="/account"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-slate-800 dark:text-gray-100 text-xs sm:text-sm font-bold transition touch-manipulation"
              >
                <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden md:inline">{customer?.name || (language === 'ar' ? 'حسابي' : 'Mein Konto')}</span>
              </Link>
            ) : (
              <div className="flex items-center gap-1">
                <Link
                  to="/customer/login"
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-slate-800 dark:text-gray-100 text-xs sm:text-sm font-bold transition touch-manipulation"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden md:inline">{language === 'ar' ? 'دخول' : 'Anmelden'}</span>
                </Link>
                {/* Desktop header intentionally doesn't repeat this as its
                    own button — at the widths where the center nav is also
                    visible, the header's total content (brand + nav + cart
                    + both auth buttons) doesn't fit max-w-7xl's ~1216px
                    content budget without something giving, and this was
                    the one genuinely redundant element: registration stays
                    reachable via "Anmelden" -> the login page's own sign-up
                    link, the mobile menu, and the landing page's own CTA. */}
              </div>
            )}
          </div>

          {/* Mobile Menu Trigger (Phones & Tablets < lg) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 border border-slate-200/80 dark:border-gray-800 touch-manipulation cursor-pointer transition shrink-0"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Nav Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-gray-800 bg-white/98 dark:bg-gray-900/98 backdrop-blur-lg px-4 py-4 space-y-3 shadow-xl animate-in slide-in-from-top-2 duration-150">
          {/* Phone Controls: Language Selector & Theme Toggle */}
          <div className="sm:hidden flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-gray-850 border border-slate-200/80 dark:border-gray-800">
            <span className="text-xs font-bold text-slate-600 dark:text-gray-400">
              {language === 'ar' ? 'اللغة والمظهر' : 'Sprache & Design'}
            </span>
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <ThemeToggle />
            </div>
          </div>

          {/* Customer Account / Auth Box */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60">
            {isCustomerLoggedIn ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm shadow-emerald-600/30">
                    {customer?.name?.charAt(0)?.toUpperCase() || 'C'}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-slate-900 dark:text-white truncate">
                      {customer?.name || (language === 'ar' ? 'العميل' : 'Kunde')}
                    </span>
                    <span className="block text-[11px] text-emerald-700 dark:text-emerald-400 font-medium truncate">
                      {customer?.phone || customer?.email}
                    </span>
                  </div>
                </div>
                <Link
                  to="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shrink-0 touch-manipulation shadow-sm"
                >
                  {language === 'ar' ? 'حسابي' : 'Mein Konto'}
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-gray-300">
                  {language === 'ar' ? 'خدمة التوصيل السريع للمنزل' : 'Lieferservice & Kundenkonto'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/customer/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-900 dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition touch-manipulation shadow-2xs"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'تسجيل الدخول' : 'Anmelden'}</span>
                  </Link>
                  <Link
                    to="/customer/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition touch-manipulation shadow-2xs"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'حساب جديد' : 'Registrieren'}</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Anchor Links */}
          <div className="space-y-1 pt-1">
            <a
              href="#catalog"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-800 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition touch-manipulation"
            >
              <Package className="w-4 h-4 text-emerald-600" />
              <span>{t('catalog')}</span>
            </a>
            <a
              href="#reviews"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-800 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition touch-manipulation"
            >
              <Star className="w-4 h-4 text-amber-500" />
              <span>{t('googleReviewsTitle') || 'Google Reviews'}</span>
            </a>
            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-800 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition touch-manipulation"
            >
              <MapPin className="w-4 h-4 text-blue-500" />
              <span>{t('contactAndLocation')}</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
