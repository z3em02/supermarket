import { useEffect, useState } from 'react';
import axios from '../utils/adminAxios';
import { getApiUrl } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import {
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  Clock,
  ArrowRight,
  Sparkles,
  Layers,
  Store,
  Lock
} from 'lucide-react';

export const Dashboard = () => {
  const { t, language } = useLanguage();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0
  });
  // Kunden/Buchhaltung numbers are behind the section PIN — track separately
  // so a locked state can be shown instead of a misleading "0".
  const [sectionLocked, setSectionLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      const apiUrl = getApiUrl();

      // customer-auth/customers and accounting/summary sit behind the
      // Kunden/Buchhaltung section PIN — fall back to a "locked" marker
      // instead of failing the whole dashboard when it isn't unlocked.
      // adminAxios interceptor attaches both Authorization and X-Section-Unlock automatically.
      const LOCKED = { locked: true };
      const [customersRes, productsRes, ordersRes, accountingRes] = await Promise.all([
        axios.get(`${apiUrl}/api/customer-auth/customers`).catch(() => LOCKED),
        axios.get(`${apiUrl}/api/products`),
        axios.get(`${apiUrl}/api/orders`),
        axios.get(`${apiUrl}/api/accounting/summary`).catch(() => LOCKED)
      ]);

      setSectionLocked(customersRes.locked || accountingRes.locked);
      setStats({
        totalCustomers: customersRes.locked ? null : customersRes.data.length,
        totalProducts: productsRes.data.length,
        totalOrders: ordersRes.data.length,
        totalRevenue: accountingRes.locked ? null : (accountingRes.data.summary?.totalRevenue || 0),
        pendingOrders: accountingRes.locked ? null : (accountingRes.data.summary?.pendingOrders || 0)
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const statCards = [
    {
      title: t('customers') || 'Total Customers',
      value: stats.totalCustomers,
      locked: stats.totalCustomers === null,
      icon: Users,
      color: 'bg-blue-50 text-blue-600 border border-blue-100/80 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900/50',
      borderColor: 'border-slate-200/80 dark:border-gray-800'
    },
    {
      title: t('totalProducts'),
      value: stats.totalProducts,
      icon: Package,
      color: 'bg-emerald-50 text-emerald-600 border border-emerald-100/80 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900/50',
      borderColor: 'border-slate-200/80 dark:border-gray-800'
    },
    {
      title: t('totalOrders'),
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: 'bg-purple-50 text-purple-600 border border-purple-100/80 dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-900/50',
      borderColor: 'border-slate-200/80 dark:border-gray-800'
    },
    {
      title: t('totalRevenue'),
      value: stats.totalRevenue === null ? null : `€${stats.totalRevenue.toFixed(2)}`,
      locked: stats.totalRevenue === null,
      icon: DollarSign,
      color: 'bg-amber-50 text-amber-600 border border-amber-100/80 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900/50',
      borderColor: 'border-slate-200/80 dark:border-gray-800'
    },
    {
      title: t('pendingOrders'),
      value: stats.pendingOrders,
      locked: stats.pendingOrders === null,
      icon: Clock,
      color: 'bg-rose-50 text-rose-600 border border-rose-100/80 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900/50',
      borderColor: 'border-slate-200/80 dark:border-gray-800'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-gray-900 dark:via-blue-950/40 dark:to-gray-900 dark:border dark:border-blue-900/30 text-white rounded-2xl p-5 sm:p-8 shadow-lg shadow-blue-500/10 dark:shadow-none">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">
            {t('dashboardOverview')}
          </h1>
          <p className="text-blue-100 dark:text-slate-300 mt-1 text-xs sm:text-base">
            {t('welcomeMessage')}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto bg-white/15 dark:bg-blue-950/70 dark:border dark:border-blue-800/60 backdrop-blur px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{language === 'ar' ? 'إدارة التوصيل المنزلي' : 'Hauszustellung im Überblick'}</span>
        </div>
      </div>

      {sectionLocked && (
        <div className="flex items-center gap-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs sm:text-sm rounded-2xl px-4 py-3">
          <Lock className="w-4 h-4 shrink-0" />
          <span>
            {language === 'ar'
              ? 'بعض الأرقام مخفية — افتح قسم الإعدادات أو العملاء أو المحاسبة لعرضها'
              : 'Einige Zahlen sind gesperrt — öffnen Sie Einstellungen, Kunden oder Buchhaltung, um sie zu sehen'}
          </span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-5">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div 
              key={stat.title} 
              className={`bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 border ${stat.borderColor} shadow-xs hover:shadow-md dark:hover:border-gray-700 transition-all duration-200`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                    {stat.title}
                  </p>
                  {stat.locked ? (
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 dark:text-gray-500 mt-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'مقفل' : 'Gesperrt'}</span>
                    </p>
                  ) : (
                    <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 truncate">
                      {stat.value}
                    </p>
                  )}
                </div>
                <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl ${stat.color} shrink-0`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-xs">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-3 sm:mb-4">
          {t('quickActions')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 group transition"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100/80 dark:bg-blue-950/60 dark:border-blue-900/50 text-blue-600 dark:text-blue-400">
                <Store className="w-5 h-5" />
              </div>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm text-left rtl:text-right">
                {t('publicCatalog') || 'View Online Shop'}
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 rtl:rotate-180 transition" />
          </button>

          <button
            onClick={() => navigate('/secret/admin/catalogs')}
            className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-gray-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 group transition"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100/80 dark:bg-indigo-950/60 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                <Layers className="w-5 h-5" />
              </div>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm text-left rtl:text-right">
                {t('catalogs')}
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 rtl:rotate-180 transition" />
          </button>

          <button
            onClick={() => navigate('/secret/admin/products')}
            className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-gray-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 group transition"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100/80 dark:bg-emerald-950/60 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                <Package className="w-5 h-5" />
              </div>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm text-left rtl:text-right">
                {t('addNewProduct')}
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 rtl:rotate-180 transition" />
          </button>

          <button
            onClick={() => navigate('/secret/admin/orders')}
            className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-gray-800 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 group transition"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100/80 dark:bg-purple-950/60 dark:border-purple-900/50 text-purple-600 dark:text-purple-400">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm text-left rtl:text-right">
                {t('viewOrders')}
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 rtl:rotate-180 transition" />
          </button>

        </div>
      </div>

      {/* Getting Started Guide */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-slate-200/80 dark:border-gray-850 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          {t('gettingStarted')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/80 dark:bg-gray-950/60 border border-slate-200/60 dark:border-gray-800/80">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
            <p className="text-sm text-slate-700 dark:text-slate-300">{t('tip1')}</p>
          </div>
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/80 dark:bg-gray-950/60 border border-slate-200/60 dark:border-gray-800/80">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
            <p className="text-sm text-slate-700 dark:text-slate-300">{t('tip2')}</p>
          </div>
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/80 dark:bg-gray-950/60 border border-slate-200/60 dark:border-gray-800/80">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
            <p className="text-sm text-slate-700 dark:text-slate-300">{t('tip3')}</p>
          </div>
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/80 dark:bg-gray-950/60 border border-slate-200/60 dark:border-gray-800/80">
            <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center shrink-0">4</span>
            <p className="text-sm text-slate-700 dark:text-slate-300">{t('tip4')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};