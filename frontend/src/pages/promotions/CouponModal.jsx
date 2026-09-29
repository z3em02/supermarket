import { useId } from 'react';
import {
  AlertCircle,
  Percent,
  Euro,
  Gift,
  Truck
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Button, Input, Modal, Switch } from '../../components/ui';

const TYPE_OPTIONS = [
  { value: 'PERCENTAGE', label: 'Prozent (%)', icon: Percent, active: 'border-primary-600 bg-primary-50/80 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300' },
  { value: 'FIXED', label: 'Betrag (€)', icon: Euro, active: 'border-success-600 bg-success-50/80 text-success-700 dark:bg-success-950/50 dark:text-success-300' },
  { value: 'COMBO', label: 'Kombi Deal', icon: Gift, active: 'border-promo-600 bg-promo-50/80 text-promo-700 dark:bg-promo-950/50 dark:text-promo-300' }
];

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
  const formId = useId();
  const close = () => setShowCouponModal(false);
  const set = (patch) => setCouponForm({ ...couponForm, ...patch });

  return (
    <Modal
      isOpen
      onClose={close}
      title={editingCoupon ? t('editCoupon') : t('createCoupon')}
      footer={(
        <>
          <Button variant="secondary" onClick={close}>{t('cancel')}</Button>
          <Button type="submit" form={formId} loading={couponSubmitting}>
            {couponSubmitting ? 'Speichern...' : t('save')}
          </Button>
        </>
      )}
    >
      {couponError && (
        <div role="alert" className="p-3 rounded-xl bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{couponError}</span>
        </div>
      )}

      <form id={formId} onSubmit={handleSaveCoupon} className="space-y-4">
        <Input
          label={`${t('couponCode')} *`}
          type="text"
          required
          placeholder="z.B. SOMMER10 oder WELCOME"
          value={couponForm.code}
          onChange={(e) => set({ code: e.target.value.toUpperCase() })}
          className="font-mono font-bold uppercase"
        />

        {/* Discount Type */}
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Rabatttyp">
          {TYPE_OPTIONS.map(({ value, label, icon: Icon, active }) => (
            <button
              key={value}
              type="button"
              aria-pressed={couponForm.discountType === value}
              onClick={() => set(value === 'COMBO' ? { discountType: value, freeShipping: true } : { discountType: value })}
              className={`min-h-16 p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition cursor-pointer touch-manipulation ${
                couponForm.discountType === value ? active : 'border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 items-end">
          <Input
            label={`${couponForm.discountType === 'PERCENTAGE' ? 'Rabatt in %' : 'Rabatt in €'} *`}
            type="number"
            step="0.01"
            min="0"
            max={couponForm.discountType === 'PERCENTAGE' ? '100' : '1000'}
            required
            placeholder={couponForm.discountType === 'PERCENTAGE' ? '10' : '5.00'}
            value={couponForm.discountValue}
            onChange={(e) => set({ discountValue: e.target.value })}
          />
          <Input
            label={`${t('minOrderValue')} (€)`}
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={couponForm.minOrderValue}
            onChange={(e) => set({ minOrderValue: e.target.value })}
          />
        </div>

        {/* Free Shipping Checkbox (Combo perk) */}
        <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={couponForm.freeShipping}
            onChange={(e) => set({ freeShipping: e.target.checked })}
            className="w-5 h-5 shrink-0 rounded-sm accent-primary-600 cursor-pointer"
          />
          <div className="text-xs">
            <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-success-600" aria-hidden="true" />
              {t('includeFreeShipping')}
            </span>
            <p className="text-slate-500 dark:text-slate-400">Der Kunde zahlt keine Liefergebühr für diesen Auftrag.</p>
          </div>
        </label>

        <div className="grid grid-cols-2 gap-3 items-end">
          <Input
            label={`${t('usageLimit')} (Gesamt)`}
            type="number"
            min="1"
            placeholder="Unbegrenzt"
            value={couponForm.usageLimit}
            onChange={(e) => set({ usageLimit: e.target.value })}
          />
          <Input
            label={t('usageLimitPerCustomer')}
            type="number"
            min="1"
            value={couponForm.usageLimitPerCustomer}
            onChange={(e) => set({ usageLimitPerCustomer: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 items-end">
          <Input
            label={t('validFrom')}
            type="date"
            value={couponForm.startDate}
            onChange={(e) => set({ startDate: e.target.value })}
          />
          <Input
            label={t('validUntil')}
            type="date"
            value={couponForm.endDate}
            onChange={(e) => set({ endDate: e.target.value })}
          />
        </div>

        <Input
          label="Interne Notiz / Beschreibung"
          type="text"
          placeholder="z.B. Willkommensgutschein für Neukunden"
          value={couponForm.description}
          onChange={(e) => set({ description: e.target.value })}
        />

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Gutschein ist aktiv</span>
          <Switch
            checked={couponForm.isActive}
            onChange={(next) => set({ isActive: next })}
            label="Gutschein ist aktiv"
          />
        </div>
      </form>
    </Modal>
  );
};
