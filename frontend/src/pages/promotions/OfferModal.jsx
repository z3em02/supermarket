import { Sparkles, AlertCircle, Gift, Percent } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-success-600" />
            {editingOffer ? t('editOffer') : t('createOffer')}
          </h2>
          <button
            onClick={() => setShowOfferModal(false)}
            className="text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {offerError && (
          <div className="mt-4 p-3 rounded-xl bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{offerError}</span>
          </div>
        )}

        <form onSubmit={handleSaveOffer} className="space-y-4 mt-4">
          {/* Target Product */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Produkt auswählen *
            </label>
            <select
              required
              value={offerForm.productId}
              onChange={(e) => setOfferForm({ ...offerForm, productId: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-success-500"
            >
              <option value="" disabled>
                -- Bitte Produkt wählen --
              </option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nameDe || p.name} (SKU: {p.sku} &bull; €{Number(p.b2bPrice).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {/* Offer Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Angebotstyp *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setOfferForm({
                    ...offerForm,
                    type: 'BUY_X_GET_Y',
                    badgeTextDe: '2+1 Gratis',
                    badgeTextAr: '2+1 مجاناً'
                  })
                }
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                  offerForm.type === 'BUY_X_GET_Y'
                    ? 'border-promo-600 bg-promo-50 text-promo-700 dark:bg-promo-950/40 dark:text-promo-300'
                    : 'border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Gift className="w-5 h-5" />
                2+1 / Mengenrabatt
              </button>

              <button
                type="button"
                onClick={() =>
                  setOfferForm({
                    ...offerForm,
                    type: 'PRODUCT_DISCOUNT',
                    badgeTextDe: 'Angebot',
                    badgeTextAr: 'عرض خاص'
                  })
                }
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                  offerForm.type === 'PRODUCT_DISCOUNT'
                    ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300'
                    : 'border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Percent className="w-5 h-5" />
                Einzelprodukt-Rabatt
              </button>
            </div>
          </div>

          {/* Type = BUY_X_GET_Y */}
          {offerForm.type === 'BUY_X_GET_Y' && (
            <div className="p-4 rounded-xl bg-promo-50/60 dark:bg-promo-950/30 border border-promo-200 dark:border-promo-800 space-y-3">
              <p className="text-xs font-semibold text-promo-800 dark:text-promo-300">
                Formel: Kaufe X Einheiten und erhalte Y Einheiten kostenlos (z.B. 2+1 Gratis = Kaufe 2, erhalte 1 gratis)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kaufmenge (X)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={offerForm.buyQuantity}
                    onChange={(e) =>
                      setOfferForm({
                        ...offerForm,
                        buyQuantity: e.target.value,
                        badgeTextDe: `${e.target.value}+${offerForm.getYQuantity} Gratis`,
                        badgeTextAr: `${e.target.value}+${offerForm.getYQuantity} مجاناً`
                      })
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Gratismenge (Y)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={offerForm.getYQuantity}
                    onChange={(e) =>
                      setOfferForm({
                        ...offerForm,
                        getYQuantity: e.target.value,
                        badgeTextDe: `${offerForm.buyQuantity}+${e.target.value} Gratis`,
                        badgeTextAr: `${offerForm.buyQuantity}+${e.target.value} مجاناً`
                      })
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Type = PRODUCT_DISCOUNT */}
          {offerForm.type === 'PRODUCT_DISCOUNT' && (
            <div className="p-4 rounded-xl bg-primary-50/60 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Fester Aktionspreis (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="z.B. 2.49"
                    value={offerForm.promotionalPrice}
                    onChange={(e) =>
                      setOfferForm({
                        ...offerForm,
                        promotionalPrice: e.target.value,
                        discountPercent: ''
                      })
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ODER Rabatt in %
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    placeholder="z.B. 20"
                    value={offerForm.discountPercent}
                    onChange={(e) =>
                      setOfferForm({
                        ...offerForm,
                        discountPercent: e.target.value,
                        promotionalPrice: '',
                        badgeTextDe: e.target.value ? `-${e.target.value}%` : 'Angebot'
                      })
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Badge Text (German & Arabic) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Badge Deutsch
              </label>
              <input
                type="text"
                placeholder="2+1 Gratis"
                value={offerForm.badgeTextDe}
                onChange={(e) => setOfferForm({ ...offerForm, badgeTextDe: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Badge Arabisch
              </label>
              <input
                type="text"
                dir="rtl"
                placeholder="2+1 مجاناً"
                value={offerForm.badgeTextAr}
                onChange={(e) => setOfferForm({ ...offerForm, badgeTextAr: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm"
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
                value={offerForm.startDate}
                onChange={(e) => setOfferForm({ ...offerForm, startDate: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('validUntil')}
              </label>
              <input
                type="date"
                value={offerForm.endDate}
                onChange={(e) => setOfferForm({ ...offerForm, endDate: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm"
              />
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Angebot ist aktiv</span>
            <input
              type="checkbox"
              checked={offerForm.isActive}
              onChange={(e) => setOfferForm({ ...offerForm, isActive: e.target.checked })}
              className="w-5 h-5 rounded-sm text-success-600 focus:ring-success-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setShowOfferModal(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-gray-800"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={offerSubmitting}
              className="px-5 py-2.5 rounded-xl bg-success-600 text-white text-sm font-semibold hover:bg-success-700 shadow-sm shadow-success-600/30 transition disabled:opacity-50"
            >
              {offerSubmitting ? 'Speichern...' : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
