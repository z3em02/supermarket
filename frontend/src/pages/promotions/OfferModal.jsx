import { useId } from 'react';
import { AlertCircle, Gift, Percent } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Button, Input, Modal, Select, Switch } from '../../components/ui';

const TYPE_OPTIONS = [
  {
    value: 'BUY_X_GET_Y',
    label: '2+1 / Mengenrabatt',
    icon: Gift,
    patch: { badgeTextDe: '2+1 Gratis', badgeTextAr: '2+1 مجاناً' },
    active: 'border-promo-600 bg-promo-50 text-promo-700 dark:bg-promo-950/40 dark:text-promo-300'
  },
  {
    value: 'PRODUCT_DISCOUNT',
    label: 'Einzelprodukt-Rabatt',
    icon: Percent,
    patch: { badgeTextDe: 'Angebot', badgeTextAr: 'عرض خاص' },
    active: 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300'
  }
];

export const OfferModal = ({
  editingOffer,
  handleSaveOffer,
  offerError,
  offerForm,
  offerSubmitting,
  products,
  setOfferForm,
  setShowOfferModal
}) => {
  const { t } = useLanguage();
  const formId = useId();
  const close = () => setShowOfferModal(false);
  const set = (patch) => setOfferForm({ ...offerForm, ...patch });

  return (
    <Modal
      isOpen
      onClose={close}
      title={editingOffer ? t('editOffer') : t('createOffer')}
      footer={(
        <>
          <Button variant="secondary" onClick={close}>{t('cancel')}</Button>
          <Button type="submit" form={formId} loading={offerSubmitting}>
            {offerSubmitting ? 'Speichern...' : t('save')}
          </Button>
        </>
      )}
    >
      {offerError && (
        <div role="alert" className="p-3 rounded-xl bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{offerError}</span>
        </div>
      )}

      <form id={formId} onSubmit={handleSaveOffer} className="space-y-4">
        <Select
          label="Produkt auswählen *"
          required
          value={offerForm.productId}
          onChange={(e) => set({ productId: e.target.value })}
        >
          <option value="" disabled>
            -- Bitte Produkt wählen --
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nameDe || p.name} (SKU: {p.sku} &bull; €{Number(p.b2bPrice).toFixed(2)})
            </option>
          ))}
        </Select>

        {/* Offer Type Selection */}
        <div className="space-y-1.5">
          <span className="block text-xs font-bold text-slate-600 dark:text-slate-300">Angebotstyp *</span>
          <div className="grid grid-cols-2 gap-3" role="group" aria-label="Angebotstyp">
            {TYPE_OPTIONS.map(({ value, label, icon: Icon, patch, active }) => (
              <button
                key={value}
                type="button"
                aria-pressed={offerForm.type === value}
                onClick={() => set({ type: value, ...patch })}
                className={`min-h-16 p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition cursor-pointer touch-manipulation ${
                  offerForm.type === value ? active : 'border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {offerForm.type === 'BUY_X_GET_Y' && (
          <div className="p-4 rounded-xl bg-promo-50/60 dark:bg-promo-950/30 border border-promo-200 dark:border-promo-800 space-y-3">
            <p className="text-xs font-semibold text-promo-800 dark:text-promo-300">
              Formel: Kaufe X Einheiten und erhalte Y Einheiten kostenlos (z.B. 2+1 Gratis = Kaufe 2, erhalte 1 gratis)
            </p>
            <div className="grid grid-cols-2 gap-3 items-end">
              <Input
                label="Kaufmenge (X)"
                type="number"
                min="1"
                required
                value={offerForm.buyQuantity}
                onChange={(e) => set({
                  buyQuantity: e.target.value,
                  badgeTextDe: `${e.target.value}+${offerForm.getYQuantity} Gratis`,
                  badgeTextAr: `${e.target.value}+${offerForm.getYQuantity} مجاناً`
                })}
              />
              <Input
                label="Gratismenge (Y)"
                type="number"
                min="1"
                required
                value={offerForm.getYQuantity}
                onChange={(e) => set({
                  getYQuantity: e.target.value,
                  badgeTextDe: `${offerForm.buyQuantity}+${e.target.value} Gratis`,
                  badgeTextAr: `${offerForm.buyQuantity}+${e.target.value} مجاناً`
                })}
              />
            </div>
          </div>
        )}

        {offerForm.type === 'PRODUCT_DISCOUNT' && (
          <div className="p-4 rounded-xl bg-primary-50/60 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800">
            <div className="grid grid-cols-2 gap-3 items-end">
              <Input
                label="Fester Aktionspreis (€)"
                type="number"
                step="0.01"
                min="0"
                placeholder="z.B. 2.49"
                value={offerForm.promotionalPrice}
                onChange={(e) => set({ promotionalPrice: e.target.value, discountPercent: '' })}
              />
              <Input
                label="ODER Rabatt in %"
                type="number"
                min="1"
                max="99"
                placeholder="z.B. 20"
                value={offerForm.discountPercent}
                onChange={(e) => set({
                  discountPercent: e.target.value,
                  promotionalPrice: '',
                  badgeTextDe: e.target.value ? `-${e.target.value}%` : 'Angebot'
                })}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 items-end">
          <Input
            label="Badge Deutsch"
            type="text"
            placeholder="2+1 Gratis"
            value={offerForm.badgeTextDe}
            onChange={(e) => set({ badgeTextDe: e.target.value })}
          />
          <Input
            label="Badge Arabisch"
            type="text"
            dir="rtl"
            placeholder="2+1 مجاناً"
            value={offerForm.badgeTextAr}
            onChange={(e) => set({ badgeTextAr: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 items-end">
          <Input
            label={t('validFrom')}
            type="date"
            value={offerForm.startDate}
            onChange={(e) => set({ startDate: e.target.value })}
          />
          <Input
            label={t('validUntil')}
            type="date"
            value={offerForm.endDate}
            onChange={(e) => set({ endDate: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Angebot ist aktiv</span>
          <Switch
            checked={offerForm.isActive}
            onChange={(next) => set({ isActive: next })}
            label="Angebot ist aktiv"
          />
        </div>
      </form>
    </Modal>
  );
};
