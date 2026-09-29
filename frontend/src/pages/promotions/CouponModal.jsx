import {
  Tag,
  AlertCircle,
  Percent,
  Euro,
  Gift,
  Truck
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const CouponModal = ({
  couponError,
  couponForm,
  couponSubmitting,
  editingCoupon,
  handleSaveCoupon,
  setCouponForm,
  setShowCouponModal
}) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary-600" />
            {editingCoupon ? t('editCoupon') : t('createCoupon')}
          </h2>
          <button
            onClick={() => setShowCouponModal(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {couponError && (
          <div className="mt-4 p-3 rounded-xl bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{couponError}</span>
          </div>
        )}

        <form onSubmit={handleSaveCoupon} className="space-y-4 mt-4">
          {/* Code */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              {t('couponCode')} *
            </label>
            <input
              type="text"
              required
              placeholder="z.B. SOMMER10 oder WELCOME"
              value={couponForm.code}
              onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white uppercase focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Discount Type */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setCouponForm({ ...couponForm, discountType: 'PERCENTAGE' })}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                couponForm.discountType === 'PERCENTAGE'
                  ? 'border-primary-600 bg-primary-50/80 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300'
                  : 'border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Percent className="w-4 h-4" />
              Prozent (%)
            </button>
            <button
              type="button"
              onClick={() => setCouponForm({ ...couponForm, discountType: 'FIXED' })}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                couponForm.discountType === 'FIXED'
                  ? 'border-success-600 bg-success-50/80 text-success-700 dark:bg-success-950/50 dark:text-success-300'
                  : 'border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Euro className="w-4 h-4" />
              Betrag (€)
            </button>
            <button
              type="button"
              onClick={() => setCouponForm({ ...couponForm, discountType: 'COMBO', freeShipping: true })}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                couponForm.discountType === 'COMBO'
                  ? 'border-promo-600 bg-promo-50/80 text-promo-700 dark:bg-promo-950/50 dark:text-promo-300'
                  : 'border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Gift className="w-4 h-4" />
              Kombi Deal
            </button>
          </div>

          {/* Discount Value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {couponForm.discountType === 'PERCENTAGE' ? 'Rabatt in %' : 'Rabatt in €'} *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={couponForm.discountType === 'PERCENTAGE' ? '100' : '1000'}
                required
                placeholder={couponForm.discountType === 'PERCENTAGE' ? '10' : '5.00'}
                value={couponForm.discountValue}
                onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('minOrderValue')} (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={couponForm.minOrderValue}
                onChange={(e) => setCouponForm({ ...couponForm, minOrderValue: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Free Shipping Checkbox (Combo perk) */}
          <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={couponForm.freeShipping}
              onChange={(e) => setCouponForm({ ...couponForm, freeShipping: e.target.checked })}
              className="w-4 h-4 rounded-sm text-primary-600 focus:ring-primary-500"
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-success-600" />
                {t('includeFreeShipping')}
              </span>
              <p className="text-slate-500">Der Kunde zahlt keine Liefergebühr für diesen Auftrag.</p>
            </div>
          </label>

          {/* Limits */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('usageLimit')} (Gesamt)
              </label>
              <input
                type="number"
                min="1"
                placeholder="Unbegrenzt"
                value={couponForm.usageLimit}
                onChange={(e) => setCouponForm({ ...couponForm, usageLimit: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('usageLimitPerCustomer')}
              </label>
              <input
                type="number"
                min="1"
                value={couponForm.usageLimitPerCustomer}
                onChange={(e) => setCouponForm({ ...couponForm, usageLimitPerCustomer: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('validFrom')}
              </label>
              <input
                type="date"
                value={couponForm.startDate}
                onChange={(e) => setCouponForm({ ...couponForm, startDate: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('validUntil')}
              </label>
              <input
                type="date"
                value={couponForm.endDate}
                onChange={(e) => setCouponForm({ ...couponForm, endDate: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Interne Notiz / Beschreibung
            </label>
            <input
              type="text"
              placeholder="z.B. Willkommensgutschein für Neukunden"
              value={couponForm.description}
              onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Gutschein ist aktiv</span>
            <input
              type="checkbox"
              checked={couponForm.isActive}
              onChange={(e) => setCouponForm({ ...couponForm, isActive: e.target.checked })}
              className="w-5 h-5 rounded-sm text-primary-600 focus:ring-primary-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setShowCouponModal(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-gray-800"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={couponSubmitting}
              className="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 shadow-sm shadow-primary-600/30 transition disabled:opacity-50"
            >
              {couponSubmitting ? 'Speichern...' : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
