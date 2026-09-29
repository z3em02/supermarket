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
      <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Aktive Gutscheine
          </span>
          <Tag className="w-4 h-4 text-primary-600" />
        </div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
          {activeCouponsCount} <span className="text-sm font-normal text-slate-500">/ {coupons.length}</span>
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Gutschein-Einlösungen
          </span>
          <CheckCircle2 className="w-4 h-4 text-success-600" />
        </div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{totalCouponRedemptions}</p>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Aktive Produkt-Angebote
          </span>
          <Sparkles className="w-4 h-4 text-warning-500" />
        </div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
          {activeOffersCount} <span className="text-sm font-normal text-slate-500">/ {promotions.length}</span>
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            2+1 Gratis Aktionen
          </span>
          <Gift className="w-4 h-4 text-promo-600" />
        </div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{twoPlusOneOffersCount}</p>
      </div>
    </div>
);
