import { useLanguage } from '../../context/LanguageContext';
import { Package, ShoppingCart } from 'lucide-react';

export const ProductGridView = ({
  addToCart,
  filteredProducts,
  getProductPrices,
  getPromotionBadge,
  getStockBadge,
  setSelectedProduct
}) => {
  const { language, t } = useLanguage();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {filteredProducts.map((product) => {
        const localizedName = (language === 'ar' ? product.nameAr : product.nameDe) || product.name;
        const localizedDesc = (language === 'ar' ? product.descriptionAr : product.descriptionDe) || product.description;
        const localizedCategory = product.category ? (language === 'ar' ? product.category.nameAr : product.category.nameDe) : null;

        return (
          <div
            key={product.id}
            onClick={() => setSelectedProduct(product)}
            className="group bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-gray-850 shadow-sm hover:shadow-md hover:border-brand-500/40 dark:hover:border-brand-500/40 transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer"
          >
            <div>
              {/* Media Area */}
              <div className="relative aspect-[4/3] bg-slate-50 dark:bg-gray-950 flex items-center justify-center overflow-hidden border-b border-slate-100 dark:border-gray-800/80">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    loading="lazy"
                    decoding="async"
                    alt={localizedName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) {
                        e.target.nextSibling.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div
                  className={`flex-col items-center justify-center gap-1.5 group-hover:scale-105 transition-transform duration-300 ${
                    product.imageUrl ? 'hidden' : 'flex'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-850 shadow-sm border border-slate-200/70 dark:border-gray-750 flex items-center justify-center text-brand-600 dark:text-brand-400">
                    <Package className="w-5 h-5" />
                  </div>
                </div>

                {/* Stock Badge */}
                <div className="absolute top-2 end-2">
                  {getStockBadge(product.stock)}
                </div>

                {/* Promotion Badge Overlay */}
                <div className="absolute bottom-2 start-2 z-10">
                  {getPromotionBadge(product.id)}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-3 space-y-1.5">
                <div className="space-y-0.5">
                  {/* Category sits in the body (not over the image) so it
                      never collides with the stock badge on narrow cards. */}
                  {localizedCategory && (
                    <p className="text-[10px] font-bold uppercase tracking-wide text-brand-700 dark:text-brand-400 truncate">{localizedCategory}</p>
                  )}
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" title={localizedName}>
                    {localizedName}
                  </h3>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>SKU:</span>
                    <span className="truncate">{product.sku}</span>
                  </div>
                </div>

                {localizedDesc && (
                  <p className="text-[11px] text-slate-500 dark:text-gray-400 line-clamp-1 leading-snug">
                    {localizedDesc}
                  </p>
                )}
              </div>
            </div>

            {/* Price & Action Row */}
            <div className="p-3 pt-0">
              <div className="pt-2.5 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between gap-2">
                {(() => {
                  const priceInfo = getProductPrices(product);
                  return (
                    <div className="flex flex-col">
                      {priceInfo.promoPrice != null ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base sm:text-lg font-black text-danger-600 dark:text-danger-400 tracking-tight leading-none">
                            €{priceInfo.promoPrice.toFixed(2)}
                          </span>
                          <span className="line-through text-xs text-slate-500">
                            €{priceInfo.basePrice.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-base sm:text-lg font-black text-brand-600 dark:text-brand-400 tracking-tight leading-none">
                          €{priceInfo.basePrice.toFixed(2)}
                        </span>
                      )}
                      {priceInfo.promoType === 'BUY_X_GET_Y' && (
                        <span className="text-[10px] text-promo-600 dark:text-promo-400 font-bold mt-0.5">
                          {language === 'ar' ? 'عرض 2+1 مجاناً' : '2+1 Gratis Deal'}
                        </span>
                      )}
                    </div>
                  );
                })()}

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product);
                    }}
                    disabled={product.stock <= 0}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 coarse:min-h-11 coarse:px-3.5 rounded-lg text-xs font-bold bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white transition-all shadow-sm cursor-pointer"
                    title={product.stock <= 0 ? t('outOfStock') : (language === 'ar' ? 'أضف للسلة' : 'In den Warenkorb')}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{product.stock <= 0 ? t('outOfStock') : (language === 'ar' ? 'أضف' : 'Kaufen')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
