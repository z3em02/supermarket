import { Box, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const RestockModal = ({
  handleQuickRestock,
  isRestocking,
  restockAmount,
  restockProduct,
  setRestockAmount,
  setRestockProduct
}) => {
  const { t, language } = useLanguage();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-slate-200 dark:border-gray-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Box className="w-5 h-5 text-success-600 dark:text-success-400" />
            <span>{t('quickRestock')}</span>
          </h2>
          <button
            onClick={() => setRestockProduct(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleQuickRestock} className="space-y-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('product')}:</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {(language === 'ar' ? restockProduct.nameAr : restockProduct.nameDe) || restockProduct.name}
            </p>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t('currentStock')}: {restockProduct.stock} {t('units')}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              {t('restockAmount')}
            </label>
            <div className="flex items-center gap-2 mb-3">
              {[10, 25, 50, 100].map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setRestockAmount(qty)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition ${
                    restockAmount === qty
                      ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                      : 'bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-gray-750 hover:bg-slate-200 dark:hover:bg-gray-750'
                  }`}
                >
                  +{qty}
                </button>
              ))}
            </div>

            <input
              type="number"
              min="1"
              required
              value={restockAmount}
              onChange={(e) => setRestockAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 text-center font-bold text-base"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setRestockProduct(null)}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isRestocking}
              className="px-5 py-2 bg-success-600 hover:bg-success-700 text-white text-sm font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {isRestocking ? t('loading') : `${t('confirm')} (+${restockAmount})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
