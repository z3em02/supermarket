import { useLanguage } from '../../context/LanguageContext';
import { Package, ShoppingCart } from 'lucide-react';

export const ProductListView = ({
  addToCart,
  filteredProducts,
  getProductPrices,
  getPromotionBadge,
  getStockBadge,
  setSelectedProduct
}) => {
  const { language, t } = useLanguage();

  return (
    <div className="space-y-3">
      {filteredProducts.map((product) => {
        const localizedName = (language === 'ar' ? product.nameAr : product.nameDe) || product.name;
        const localizedDesc = (language === 'ar' ? product.descriptionAr : product.descriptionDe) || product.description;
        const localizedCategory = product.category ? (language === 'ar' ? product.category.nameAr : product.category.nameDe) : null;

        return (
          <div
            key={product.id}
            onClick={() => setSelectedProduct(product)}
            className="group bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-850 p-3 sm:p-4 shadow-2xs hover:shadow-md hover:border-primary-500/40 dark:hover:border-primary-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
          >
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              {/* Media Thumbnail */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-100 dark:border-gray-800 overflow-hidden flex items-center justify-center">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={localizedName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <Package className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                )}
              </div>

              {/* Content */}
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {localizedName}
                  </h3>
                  {localizedCategory && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300">
                      {localizedCategory}
                    </span>
                  )}
                  {getStockBadge(product.stock)}
                  {getPromotionBadge(product.id)}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-gray-500 font-mono">
                  <span>SKU: {product.sku}</span>
                </div>

                {localizedDesc && (
                  <p className="text-xs text-slate-500 dark:text-gray-400 line-clamp-1">
                    {localizedDesc}
                  </p>
                )}
              </div>
            </div>

            {/* Price & Action */}
            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-gray-800">
              <div className="text-start sm:text-end">
                {(() => {
                  const priceInfo = getProductPrices(product);
                  return (
                    <div className="flex flex-col items-start sm:items-end">
                      {priceInfo.promoPrice != null ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg sm:text-xl font-black text-danger-600 dark:text-danger-400">
                            €{priceInfo.promoPrice.toFixed(2)}
                          </span>
                          <span className="line-through text-xs text-slate-400">
                            €{priceInfo.basePrice.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-lg sm:text-xl font-black text-brand-600 dark:text-brand-400">
                          €{priceInfo.basePrice.toFixed(2)}
                        </span>
                      )}
                      {priceInfo.promoType === 'BUY_X_GET_Y' && (
                        <span className="text-[10px] text-promo-600 dark:text-promo-400 font-bold">
                          {language === 'ar' ? 'عرض 2+1 مجاناً' : '2+1 Gratis Deal'}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  addToCart(product);
                }}
                disabled={product.stock <= 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white transition-all cursor-pointer shadow-sm"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{product.stock <= 0 ? t('outOfStock') : (language === 'ar' ? 'أضف للسلة' : 'In den Warenkorb')}</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
