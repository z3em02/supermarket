import { useLanguage } from '../../context/LanguageContext';
import { Package, ShoppingCart } from 'lucide-react';

export const ProductCompactView = ({
  addToCart,
  filteredProducts,
  getProductPrices,
  getPromotionBadge,
  getStockBadge,
  setSelectedProduct
}) => {
  const { t, language } = useLanguage();

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-850 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-start text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-gray-950/80 border-b border-slate-200 dark:border-gray-800 text-slate-500 dark:text-gray-400 text-start font-semibold">
              <th className="py-3 px-4 text-start">{t('products')}</th>
              <th className="py-3 px-4 text-start">{t('category')}</th>
              <th className="py-3 px-4 text-start">SKU</th>
              <th className="py-3 px-4 text-start">{t('stock')}</th>
              <th className="py-3 px-4 text-start">{t('b2bPrice')}</th>
              <th className="py-3 px-4 text-end">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
            {filteredProducts.map((product) => {
              const localizedName = (language === 'ar' ? product.nameAr : product.nameDe) || product.name;
              const localizedCategory = product.category ? (language === 'ar' ? product.category.nameAr : product.category.nameDe) : '-';

              return (
                <tr
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="hover:bg-primary-50/40 dark:hover:bg-gray-800/40 transition-colors cursor-pointer"
                >
                  {/* Product Title + Thumbnail */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 shrink-0 rounded-lg bg-slate-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={localizedName}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <Package className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white line-clamp-1" title={localizedName}>
                          {localizedName}
                        </span>
                        {getPromotionBadge(product.id)}
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4 text-slate-600 dark:text-gray-300">
                    {localizedCategory}
                  </td>

                  {/* SKU */}
                  <td className="py-3 px-4 font-mono text-xs text-slate-400 dark:text-gray-500">
                    {product.sku}
                  </td>

                  {/* Stock */}
                  <td className="py-3 px-4">
                    {getStockBadge(product.stock)}
                  </td>

                  {/* Price */}
                  <td className="py-3 px-4">
                    {(() => {
                      const priceInfo = getProductPrices(product);
                      return priceInfo.promoPrice != null ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-black text-danger-600 dark:text-danger-400">
                            €{priceInfo.promoPrice.toFixed(2)}
                          </span>
                          <span className="line-through text-xs text-slate-400">
                            €{priceInfo.basePrice.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-black text-brand-600 dark:text-brand-400">
                          €{priceInfo.basePrice.toFixed(2)}
                        </span>
                      );
                    })()}
                  </td>

                  {/* Action */}
                  <td className="py-3 px-4 text-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                      }}
                      disabled={product.stock <= 0}
                      className="p-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white transition-colors cursor-pointer"
                      title={language === 'ar' ? 'أضف للسلة' : 'In den Warenkorb'}
                    >
                      <ShoppingCart className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
