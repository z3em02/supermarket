import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { ADMIN_BASE } from '../../config/adminPath';
import {
  ArrowLeft,
  Truck,
  RefreshCw,
  Sun,
  Moon,
  Globe,
  LogOut
} from 'lucide-react';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

export const DriverHeader = ({
  activeDisplayName,
  driverUser,
  fetchOrders,
  handleDriverLogout,
  isAr,
  refreshing
}) => {
  const { user: adminUser } = useAuth();
  const { getStoreName } = useStoreSettings();
  const { language, setLanguage } = useLanguage();
  const { toggleTheme, theme } = useTheme();

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-gray-800 shadow-sm px-4 py-3 sm:px-6">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {adminUser && (
            <Link
              to={`${ADMIN_BASE}/orders`}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 transition"
              title={isAr ? 'العودة لإدارة الطلبات' : 'Zurück zur Bestellübersicht'}
            >
              <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
            </Link>
          )}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-warning-500 to-success-600 flex items-center justify-center text-white shadow-md shadow-warning-500/20 shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white truncate">
                {isAr ? 'واجهة التوصيل والسائق' : 'Fahrer- & Lieferansicht'}
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-warning-100 text-warning-800 dark:bg-warning-900/60 dark:text-warning-300 uppercase">
                {isAr ? 'سائق' : 'Driver'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
              {getStoreName(language) || 'Supermarkt'} · {activeDisplayName}
            </p>
          </div>
        </div>

        {/* Quick controls: Language, Darkmode, Refresh */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 transition"
            title={isAr ? 'تحديث الطلبات' : 'Aktualisieren'}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-success-600' : ''}`} />
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 transition"
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-warning-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          <button
            onClick={() => setLanguage(language === 'de' ? 'ar' : 'de')}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-xs font-bold text-slate-700 dark:text-gray-200 transition"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{language === 'de' ? 'العربية' : 'DE'}</span>
          </button>

          {driverUser && !adminUser && (
            <button
              onClick={handleDriverLogout}
              type="button"
              className="inline-flex items-center justify-center min-w-11 min-h-11 p-2 rounded-xl bg-danger-50 hover:bg-danger-100 dark:bg-danger-950/40 dark:hover:bg-danger-950/60 text-danger-600 dark:text-danger-400 transition"
              title={isAr ? 'تسجيل الخروج' : 'Abmelden'}
              aria-label={isAr ? 'تسجيل الخروج' : 'Abmelden'}
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
