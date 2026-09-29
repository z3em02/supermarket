import { useLanguage } from '../../context/LanguageContext';
import { AlertTriangle, Search, X } from 'lucide-react';

export const ProductFilters = ({
  categories,
  lowStockProductsCount,
  products,
  searchTerm,
  selectedCategory,
  setSearchTerm,
  setSelectedCategory,
  setStockTab,
  stockTab
}) => {
  const { t, language } = useLanguage();

  return (
    <div className="space-y-3">
      {/* Low Stock vs All Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setStockTab('all')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition touch-manipulation cursor-pointer ${
            stockTab === 'all'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-white dark:bg-gray-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-850'
          }`}
        >
          {t('allProductsTab')} ({products.length})
        </button>
        <button
          type="button"
          onClick={() => setStockTab('low')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition touch-manipulation cursor-pointer ${
            stockTab === 'low'
              ? 'bg-warning-600 text-white shadow-sm'
              : 'bg-white dark:bg-gray-900 text-warning-700 dark:text-warning-400 border border-warning-200 dark:border-warning-900/50 hover:bg-warning-50 dark:hover:bg-warning-950/20'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>{t('lowStockFilter')}</span>
          <span className="px-1.5 py-px rounded-full text-xs font-bold bg-white/20 dark:bg-warning-900/40">
            {lowStockProductsCount}
          </span>
        </button>
      </div>

      {/* Search & Category Dropdown */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 sm:w-5 sm:h-5" />
          <input
            type="text"
            placeholder={`${t('searchProducts')} (DE / AR / SKU)...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full ps-10 sm:ps-11 pe-4 py-2.5 sm:py-3 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute end-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 touch-manipulation cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {categories.length > 0 && (
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 sm:px-4 py-2.5 sm:py-3 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 text-xs sm:text-sm transition"
          >
            <option value="all" className="dark:bg-gray-900 dark:text-white">{t('allCategories')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="dark:bg-gray-900 dark:text-white">
                {language === 'ar' ? c.nameAr : c.nameDe}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
};
