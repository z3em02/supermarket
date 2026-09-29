import { useLanguage } from '../../context/LanguageContext';
import { AlertTriangle, Search, X } from 'lucide-react';
import { IconButton, Input, Select } from '../../components/ui';

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
          aria-pressed={stockTab === 'all'}
          className={`min-h-11 px-4 rounded-xl text-xs sm:text-sm font-semibold transition touch-manipulation cursor-pointer ${
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
          aria-pressed={stockTab === 'low'}
          className={`min-h-11 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition touch-manipulation cursor-pointer ${
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
          <Input
            icon={Search}
            type="text"
            aria-label={t('searchProducts')}
            placeholder={`${t('searchProducts')} (DE / AR / SKU)...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pe-11"
          />
          {searchTerm && (
            <IconButton icon={X} label={language === 'ar' ? 'مسح البحث' : 'Suche leeren'} onClick={() => setSearchTerm('')} className="absolute end-0 top-0" />
          )}
        </div>
        {categories.length > 0 && (
          <div className="sm:w-56">
            <Select
              aria-label={t('category')}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">{t('allCategories')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {language === 'ar' ? c.nameAr : c.nameDe}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>
    </div>
  );
};
