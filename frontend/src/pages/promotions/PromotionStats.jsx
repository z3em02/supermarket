import { Tag, CheckCircle2, Sparkles, Gift } from 'lucide-react';

export const PromotionStats = ({
  activeCouponsCount,
  activeOffersCount,
  coupons,
  promotions,
  totalCouponRedemptions,
  twoPlusOneOffersCount
}) => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Aktive Gutscheine
          </span>
          <Tag className="w-4 h-4 text-blue-600" />
        </div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
          {activeCouponsCount} <span className="text-sm font-normal text-slate-400">/ {coupons.length}</span>
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Gutschein-Einlösungen
          </span>
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{totalCouponRedemptions}</p>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Aktive Produkt-Angebote
          </span>
          <Sparkles className="w-4 h-4 text-amber-500" />
        </div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
          {activeOffersCount} <span className="text-sm font-normal text-slate-400">/ {promotions.length}</span>
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            2+1 Gratis Aktionen
          </span>
          <Gift className="w-4 h-4 text-purple-600" />
        </div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{twoPlusOneOffersCount}</p>
      </div>
    </div>
);
