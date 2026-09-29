import { useLanguage } from '../../context/LanguageContext';
import {
  ShoppingCart,
  Gift,
  Sparkles,
  Minus,
  Plus,
  Trash2
} from 'lucide-react';

export const CartItemList = ({
  cartWithPromos,
  isAr,
  removeFromCart,
  updateQuantity
}) => {
  const { language } = useLanguage();

  return (
    <div className="space-y-3">
      {cartWithPromos.map((item) => {
        const localizedName = (language === 'ar' ? item.nameAr : item.nameDe) || item.name;
        return (
          <div 
            key={item.productId}
            className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-gray-800 bg-white dark:bg-gray-950/60 flex items-center justify-between gap-3 shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200/60 dark:border-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={localizedName} className="w-full h-full object-cover" />
                ) : (
                  <ShoppingCart className="w-5 h-5 text-slate-500" />
                )}
              </div>
              <div className="min-w-0 space-y-0.5">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate" title={localizedName}>
                  {localizedName}
                </h4>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">
                    €{Number(item.effectivePrice).toFixed(2)}
                  </span>
                  {item.effectivePrice < item.price && (
                    <span className="line-through text-[10px] text-slate-500">
                      €{Number(item.price).toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Promotion Badges on Line Item */}
                {item.freeUnits > 0 && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-promo-50 text-promo-700 dark:bg-promo-950/50 dark:text-promo-300 text-[10px] font-bold border border-promo-200 dark:border-promo-800">
                    <Gift className="w-3 h-3" />
                    <span>{item.freeUnits}x {isAr ? 'مجاناً (عرض 2+1)' : 'GRATIS (2+1 Aktion)'}</span>
                  </div>
                )}

                {item.freeUnits === 0 && item.badge && (
                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-warning-50 text-warning-800 dark:bg-warning-950/40 dark:text-warning-300 text-[10px] font-bold border border-warning-200 dark:border-warning-800">
                    <Sparkles className="w-3 h-3" />
                    <span>{item.badge}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quantity Controls — buttons sized for a real touch
                target (min ~40px), not just the visual icon size,
                since this is the most-repeated tap in the cart. */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center border border-slate-200 dark:border-gray-800 rounded-xl bg-slate-50 dark:bg-gray-900 p-0.5">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.productId, -1)}
                  className="min-w-10 min-h-10 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-gray-800 text-slate-600 dark:text-gray-300 transition cursor-pointer touch-manipulation"
                  aria-label={isAr ? 'تقليل الكمية' : 'Menge verringern'}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-7 text-center font-bold text-xs text-slate-800 dark:text-gray-200 font-mono">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.productId, 1)}
                  disabled={item.quantity >= item.stock}
                  className="min-w-10 min-h-10 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-gray-800 text-slate-600 dark:text-gray-300 disabled:opacity-30 transition cursor-pointer touch-manipulation"
                  aria-label={isAr ? 'زيادة الكمية' : 'Menge erhöhen'}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => removeFromCart(item.productId)}
                className="min-w-10 min-h-10 flex items-center justify-center text-slate-500 hover:text-danger-600 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-950/40 transition cursor-pointer touch-manipulation"
                aria-label={isAr ? 'حذف' : 'Entfernen'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
