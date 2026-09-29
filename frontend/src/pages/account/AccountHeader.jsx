import { Link } from 'react-router-dom';
import { Truck, ShoppingBag, LogOut } from 'lucide-react';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { LanguageSelector } from '../../components/LanguageSelector';
import { ThemeToggle } from '../../components/ThemeToggle';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

export const AccountHeader = ({
  isAr,
  navigate
}) => {
  const { getStoreName } = useStoreSettings();
  const { logout } = useCustomerAuth();

  return (
    <header className="px-3 xs:px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-slate-200/80 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-30">
      <Link to="/" className="flex items-center gap-1.5 sm:gap-3 group min-w-0">
        <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-md shadow-brand-600/20 group-hover:scale-105 transition">
          <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0">
          <span className="font-extrabold text-xs sm:text-base md:text-lg text-slate-900 dark:text-white block leading-tight truncate max-w-[110px] xs:max-w-[160px] sm:max-w-none">
            {getStoreName()}
          </span>
          <span className="text-[9px] xs:text-[10px] sm:text-xs font-semibold text-brand-600 dark:text-brand-400 block truncate">
            {isAr ? 'حساب العميل والطلبات' : 'Kundenkonto & Bestellungen'}
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <Link
          to="/"
          className="hidden sm:flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 dark:hover:bg-brand-900/60 text-brand-700 dark:text-brand-300 font-bold text-xs transition"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>{isAr ? 'متابعة التسوق' : 'Zum Shop'}</span>
        </Link>
        <LanguageSelector />
        <ThemeToggle />
        <button
          onClick={() => { logout(); navigate('/customer/login'); }}
          className="p-2 text-slate-400 hover:text-danger-600 dark:hover:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950/30 rounded-xl transition cursor-pointer touch-manipulation"
          title={isAr ? 'تسجيل الخروج' : 'Abmelden'}
        >
          <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </header>
  );
};
