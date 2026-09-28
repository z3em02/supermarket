import { useLanguage } from '../../context/LanguageContext';

export const OrderStatusSummary = ({
  metrics,
  setStatusFilter,
  statusFilter
}) => {
  const { t, language } = useLanguage();

  return (
    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-2.5">
      <button
        type="button"
        onClick={() => setStatusFilter('all')}
        className={`p-2.5 sm:p-3 rounded-xl border text-start transition touch-manipulation cursor-pointer ${
          statusFilter === 'all'
            ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-400 dark:border-blue-700/80 text-blue-900 dark:text-blue-200 shadow-2xs'
            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-850 hover:border-blue-300 dark:hover:border-gray-700'
        }`}
      >
        <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
          {t('all')}
        </span>
        <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{metrics.total}</span>
      </button>

      <button
        type="button"
        onClick={() => setStatusFilter('pending')}
        className={`p-2.5 sm:p-3 rounded-xl border text-start transition touch-manipulation cursor-pointer ${
          statusFilter === 'pending'
            ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-400 dark:border-amber-700/80 text-amber-900 dark:text-amber-200 shadow-2xs'
            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-850 hover:border-amber-300 dark:hover:border-gray-700'
        }`}
      >
        <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 block truncate">
          {t('pending')}
        </span>
        <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{metrics.pending}</span>
      </button>

      <button
        type="button"
        onClick={() => setStatusFilter('pending_customer_approval')}
        className={`p-2.5 sm:p-3 rounded-xl border text-start transition touch-manipulation cursor-pointer ${
          statusFilter === 'pending_customer_approval'
            ? 'bg-amber-100 dark:bg-amber-950 border-amber-500 text-amber-950 dark:text-amber-200 shadow-2xs'
            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-850 hover:border-amber-400 dark:hover:border-gray-700'
        }`}
      >
        <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 block truncate">
          {language === 'ar' ? 'بانتظار العميل' : 'Wartet auf Kunde'}
        </span>
        <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{metrics.pending_customer_approval}</span>
      </button>

      <button
        type="button"
        onClick={() => setStatusFilter('accepted')}
        className={`p-2.5 sm:p-3 rounded-xl border text-start transition touch-manipulation cursor-pointer ${
          statusFilter === 'accepted'
            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 dark:border-emerald-700/80 text-emerald-900 dark:text-emerald-200 shadow-2xs'
            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-850 hover:border-emerald-300 dark:hover:border-gray-700'
        }`}
      >
        <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block truncate">
          {t('accepted')}
        </span>
        <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{metrics.accepted}</span>
      </button>

      <button
        type="button"
        onClick={() => setStatusFilter('preparing')}
        className={`p-2.5 sm:p-3 rounded-xl border text-start transition touch-manipulation cursor-pointer ${
          statusFilter === 'preparing'
            ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-400 dark:border-indigo-700/80 text-indigo-900 dark:text-indigo-200 shadow-2xs'
            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-850 hover:border-indigo-300 dark:hover:border-gray-700'
        }`}
      >
        <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block truncate">
          {t('preparing')}
        </span>
        <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{metrics.preparing}</span>
      </button>

      <button
        type="button"
        onClick={() => setStatusFilter('shipped')}
        className={`p-2.5 sm:p-3 rounded-xl border text-start transition touch-manipulation cursor-pointer ${
          statusFilter === 'shipped'
            ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-400 dark:border-blue-700/80 text-blue-900 dark:text-blue-200 shadow-2xs'
            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-850 hover:border-blue-300 dark:hover:border-gray-700'
        }`}
      >
        <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 block truncate">
          {t('shipped')}
        </span>
        <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{metrics.shipped}</span>
      </button>

      <button
        type="button"
        onClick={() => setStatusFilter('delivered')}
        className={`p-2.5 sm:p-3 rounded-xl border text-start transition touch-manipulation cursor-pointer ${
          statusFilter === 'delivered'
            ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-400 dark:border-purple-700/80 text-purple-900 dark:text-purple-200 shadow-2xs'
            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-850 hover:border-purple-300 dark:hover:border-gray-700'
        }`}
      >
        <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 block truncate">
          {t('delivered')}
        </span>
        <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{metrics.delivered}</span>
      </button>

      <button
        type="button"
        onClick={() => setStatusFilter('declined')}
        className={`p-2.5 sm:p-3 rounded-xl border text-start transition touch-manipulation cursor-pointer ${
          statusFilter === 'declined'
            ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 dark:border-rose-700/80 text-rose-900 dark:text-rose-200 shadow-2xs'
            : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-850 hover:border-rose-300 dark:hover:border-gray-700'
        }`}
      >
        <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 block truncate">
          {t('declined')}
        </span>
        <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{metrics.declined}</span>
      </button>
    </div>
  );
};
