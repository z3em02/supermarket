import { useLanguage } from '../../context/LanguageContext';
import { X, Package, ShoppingCart } from 'lucide-react';

export const ProductDetailModal = ({
  addToCart,
  getProductPrices,
  getPromotionBadge,
  getStockBadge,
  selectedProduct,
  setSelectedProduct
}) => {
  const { language, t } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-gray-800 space-y-4 sm:space-y-6 max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-400">
            {selectedProduct.category ? (language === 'ar' ? selectedProduct.category.nameAr : selectedProduct.category.nameDe) : t('allCategories')}
          </span>
          <button
            type="button"
            onClick={() => setSelectedProduct(null)}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors cursor-pointer touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Image */}
        <div className="w-full h-44 sm:h-56 rounded-2xl bg-slate-50 dark:bg-gray-950 border border-slate-100 dark:border-gray-800 overflow-hidden flex items-center justify-center">
          {selectedProduct.imageUrl ? (
            <img
              src={selectedProduct.imageUrl}
              alt={selectedProduct.name}
              className="w-full h-full object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <Package className="w-12 h-12 sm:w-16 sm:h-16 text-primary-600 dark:text-primary-400" />
          )}
        </div>

        {/* Modal Content */}
        <div className="space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {(language === 'ar' ? selectedProduct.nameAr : selectedProduct.nameDe) || selectedProduct.name}
              </h3>
              {getPromotionBadge(selectedProduct.id)}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-400 dark:text-gray-500 font-mono flex-wrap">
              <span>SKU: {selectedProduct.sku}</span>
              <span>•</span>
              <div>{getStockBadge(selectedProduct.stock)}</div>
            </div>
          </div>

          {((language === 'ar' ? selectedProduct.descriptionAr : selectedProduct.descriptionDe) || selectedProduct.description) && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-300 leading-relaxed">
              {(language === 'ar' ? selectedProduct.descriptionAr : selectedProduct.descriptionDe) || selectedProduct.description}
            </p>
          )}

          <div className="pt-4 border-t border-slate-100 dark:border-gray-800 flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-3">
            <div>
              <span className="block text-[11px] text-slate-400 font-semibold">{language === 'ar' ? 'السعر للتوصيل' : 'Preis für Hauszustellung'}</span>
              {(() => {
                const priceInfo = getProductPrices(selectedProduct);
                return (
                  <div>
                    {priceInfo.promoPrice != null ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl sm:text-2xl font-black text-danger-600 dark:text-danger-400 font-mono">
                          €{priceInfo.promoPrice.toFixed(2)}
                        </span>
                        <span className="line-through text-xs text-slate-400 font-mono">
                          €{priceInfo.basePrice.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xl sm:text-2xl font-black text-brand-600 dark:text-brand-400 font-mono">
                        €{priceInfo.basePrice.toFixed(2)}
                      </span>
                    )}
                    {priceInfo.promoType === 'BUY_X_GET_Y' && (
                      <span className="text-xs text-promo-600 dark:text-promo-400 font-bold block mt-0.5">
                        {language === 'ar' ? 'عرض 2+1 مجاناً: أضف 3 وحدات للسلة وادفع ثمن 2 فقط!' : '2+1 Gratis Aktion: 3 Stück in den Warenkorb legen und 1 geschenkt bekommen!'}
                      </span>
                    )}
                  </div>
                );
              })()}
              <span className="block text-[10px] text-slate-400 dark:text-gray-500 mt-0.5">
                {t('pricesInclVatNotice')}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                addToCart(selectedProduct);
                setSelectedProduct(null);
              }}
              disabled={selectedProduct.stock <= 0}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-xs sm:text-sm font-bold shadow-md shadow-brand-600/20 transition cursor-pointer touch-manipulation"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{selectedProduct.stock <= 0 ? t('outOfStock') : (language === 'ar' ? 'أضف للسلة والتوصيل' : 'In den Warenkorb')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
