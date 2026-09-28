import { Search, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const CatalogFilters = ({
  categories,
  fetchCatalog,
  loading,
  searchQuery,
  selectedCategory,
  setSearchQuery,
  setSelectedCategory,
  setSortBy,
  setStockFilter,
  sortBy,
  stockFilter
}) => {
  const { direction, t, language } = useLanguage();

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-2xs border border-slate-200/80 dark:border-gray-850 space-y-4">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-gray-500 ${direction === 'rtl' ? 'right-3.5' : 'left-3.5'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchProducts')}
            className={`w-full py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none transition-all ${
              direction === 'rtl' ? 'pr-11 pl-3.5' : 'pl-11 pr-3.5'
            }`}
          />
        </div>

        {/* Controls Right */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Stock Filter */}
          <div className="flex items-center bg-slate-100 dark:bg-gray-950 p-1 rounded-xl text-xs font-medium border border-slate-200/60 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                stockFilter === 'all'
                  ? 'bg-white dark:bg-gray-850 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/60 dark:border-gray-750'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('all')}
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('inStock')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                stockFilter === 'inStock'
                  ? 'bg-white dark:bg-gray-850 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200/60 dark:border-gray-750'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('inStock')}
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('lowStock')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                stockFilter === 'lowStock'
                  ? 'bg-white dark:bg-gray-850 text-amber-600 dark:text-amber-400 shadow-xs border border-slate-200/60 dark:border-gray-750'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('lowStock')}
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 dark:text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none"
            >
              <option value="name-asc">{t('sortNameAsc')}</option>
              <option value="name-desc">{t('sortNameDesc')}</option>
              <option value="price-low">{t('sortPriceLow')}</option>
              <option value="price-high">{t('sortPriceHigh')}</option>
              <option value="stock-high">{t('sortStockHigh')}</option>
              <option value="stock-low">{t('sortStockLow')}</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchCatalog}
            title={t('retry')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 border border-slate-200 dark:border-gray-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-gray-950 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-850 border border-transparent dark:border-gray-850'
          }`}
        >
          {t('allCategories')}
        </button>
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          const label = language === 'ar' ? cat.nameAr : cat.nameDe;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-gray-950 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-850 border border-transparent dark:border-gray-850'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
