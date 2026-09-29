import { Package, Plus, Edit, Trash2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const ProductCardGrid = ({
  filteredProducts,
  handleDelete,
  handleEdit,
  setRestockProduct
}) => {
  const { language, t } = useLanguage();

  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {filteredProducts.map((product) => (
        <div 
          key={product.id} 
          className="group bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-850 shadow-xs hover:shadow-lg dark:hover:border-gray-700 transition-all duration-300 flex flex-col justify-between overflow-hidden"
        >
          <div>
            {/* Product Media Area */}
            <div className="h-44 bg-slate-100 dark:bg-gray-950 flex items-center justify-center relative overflow-hidden border-b border-slate-100 dark:border-gray-850">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.nameDe || product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  onError={(e) => { 
                    e.target.style.display = 'none'; 
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`flex-col items-center justify-center gap-2 group-hover:scale-105 transition-transform duration-300 ${product.imageUrl ? 'hidden' : 'flex'}`}>
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-850 shadow-xs border border-slate-200/80 dark:border-gray-750 flex items-center justify-center text-primary-600 dark:text-primary-400 backdrop-blur">
                  <Package className="w-7 h-7" />
                </div>
              </div>

              {/* Category Pill */}
              {product.category && (
                <span className="absolute top-3 start-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/95 dark:bg-gray-950/90 text-slate-800 dark:text-slate-200 shadow-xs backdrop-blur border border-slate-200/80 dark:border-gray-800 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                  {language === 'ar' ? product.category.nameAr : product.category.nameDe}
                </span>
              )}

              {/* SKU Badge */}
              <div className="absolute top-3 end-3 px-2 py-0.5 rounded-md bg-slate-900/80 text-white font-mono text-[10px] font-bold backdrop-blur">
                {product.sku}
              </div>
            </div>

            {/* Product Info */}
            <div className="p-4 space-y-2">
              <div className="space-y-0.5">
                <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-1" title={product.nameDe || product.name}>
                  {(language === 'ar' ? product.nameAr : product.nameDe) || product.name}
                </h3>
                {/* Secondary language sub-line */}
                <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1" dir={language === 'ar' ? 'ltr' : 'rtl'}>
                  {language === 'ar' ? (product.nameDe || product.name) : product.nameAr}
                </p>
              </div>

              {(product.descriptionDe || product.descriptionAr || product.description) && (
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {(language === 'ar' ? product.descriptionAr : product.descriptionDe) || product.description}
                </p>
              )}

              {/* Price & Stock info */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-gray-850 text-xs">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 text-[11px] block">{t('b2bPrice')}</span>
                  <span className="text-base font-extrabold text-primary-600 dark:text-primary-400 font-mono">
                    €{Number(product.b2bPrice).toFixed(2)}
                  </span>
                </div>
                <div className="text-end">
                  <span className="text-slate-400 dark:text-slate-500 text-[11px] block">{t('stock')}</span>
                  <span className={`font-bold font-mono ${product.stock <= 15 ? 'text-warning-600 dark:text-warning-400' : 'text-slate-900 dark:text-white'}`}>
                    {product.stock} {t('units')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card Action Footer */}
          <div className="px-4 py-3 bg-slate-50/70 dark:bg-gray-950/60 border-t border-slate-100 dark:border-gray-850 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setRestockProduct(product)}
              className="text-xs font-semibold text-success-600 dark:text-success-400 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('quickRestock')}</span>
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleEdit(product)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 hover:bg-slate-200/60 dark:hover:bg-gray-800 transition"
                title={t('edit')}
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(product.id)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-danger-600 dark:text-slate-400 dark:hover:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950/40 transition"
                title={t('delete')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
