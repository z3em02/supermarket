import { useLanguage } from '../../context/LanguageContext';
import {
  LayoutGrid,
  List,
  TableProperties,
  AlertTriangle,
  Package
} from 'lucide-react';
import { ProductCompactView } from './ProductCompactView';
import { ProductListView } from './ProductListView';
import { ProductGridView } from './ProductGridView';
import { CatalogFilters } from './CatalogFilters';
import { Skeleton } from '../../components/ui';

export const CatalogSection = ({
  addToCart,
  categories,
  error,
  fetchCatalog,
  filteredProducts,
  getProductPrices,
  getPromotionBadge,
  getStockBadge,
  handleViewChange,
  loading,
  searchQuery,
  selectedCategory,
  setSearchQuery,
  setSelectedCategory,
  setSelectedProduct,
  setSortBy,
  setStockFilter,
  sortBy,
  stockFilter,
  viewMode
}) => {
  const { t } = useLanguage();

  return (
    <section id="catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-6">

      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200/60 dark:border-brand-800 text-brand-700 dark:text-brand-400 text-xs font-bold tracking-wide uppercase mb-2">
            <span>{t('catalog')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('allProducts')}
          </h2>
        </div>

        {/* Product Count & View Switcher */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <span className="text-xs font-semibold text-slate-500 dark:text-gray-400">
            {filteredProducts.length} {t('productsCount')}
          </span>

          {/* VIEW SWITCHER BUTTONS */}
          <div className="inline-flex items-center bg-white dark:bg-gray-900 p-1 rounded-xl border border-slate-200 dark:border-gray-800 shadow-sm">
            <button
              type="button"
              onClick={() => handleViewChange('grid')}
              title={t('gridView')}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 coarse:min-h-11 coarse:min-w-11 justify-center rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">{t('gridView')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleViewChange('list')}
              title={t('listView')}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 coarse:min-h-11 coarse:min-w-11 justify-center rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">{t('listView')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleViewChange('compact')}
              title={t('compactView')}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 coarse:min-h-11 coarse:min-w-11 justify-center rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'compact'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TableProperties className="w-4 h-4" />
              <span className="hidden sm:inline">{t('compactView')}</span>
            </button>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-2">
        {t('pricesInclVatNotice')}
      </p>

      {/* Filter Controls Bar */}
      <CatalogFilters
        categories={categories}
        fetchCatalog={fetchCatalog}
        loading={loading}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        setSearchQuery={setSearchQuery}
        setSelectedCategory={setSelectedCategory}
        setSortBy={setSortBy}
        setStockFilter={setStockFilter}
        sortBy={sortBy}
        stockFilter={stockFilter}
      />

      {/* Loading State — skeleton cards in the real grid layout, so the catalog
          reserves its height while products load. A bare spinner here let the
          page grow from almost nothing to the full grid once products arrived,
          shoving the reviews/contact/footer down (big CLS). The skeletons keep
          the footer below the fold from first paint. */}
      {loading && (
        <div
          role="status"
          aria-live="polite"
          className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4"
        >
          <span className="sr-only">{t('loading')}</span>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-gray-850 overflow-hidden flex flex-col">
              <div className="aspect-[4/3] bg-slate-200/80 dark:bg-gray-800 animate-pulse" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-6 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-xl text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-danger-600 dark:text-danger-400 mx-auto" />
          <p className="text-sm text-danger-700 dark:text-danger-300 font-medium">{error}</p>
          <button
            onClick={fetchCatalog}
            className="px-4 py-2 coarse:min-h-11 bg-danger-600 text-white text-xs font-semibold rounded-lg hover:bg-danger-700 transition-colors"
          >
            {t('retry')}
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredProducts.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-850 p-8 shadow-sm">
          <Package className="w-12 h-12 text-slate-500 dark:text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {t('noProductsFound')}
          </h3>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
            {t('adjustFiltersHint')}
          </p>
        </div>
      )}

      {/* -------------------- VIEW 1: GRID VIEW -------------------- */}
      {!loading && !error && filteredProducts.length > 0 && viewMode === 'grid' && (
        <ProductGridView
          addToCart={addToCart}
          filteredProducts={filteredProducts}
          getProductPrices={getProductPrices}
          getPromotionBadge={getPromotionBadge}
          getStockBadge={getStockBadge}
          setSelectedProduct={setSelectedProduct}
        />
      )}

      {/* -------------------- VIEW 2: LIST VIEW -------------------- */}
      {!loading && !error && filteredProducts.length > 0 && viewMode === 'list' && (
        <ProductListView
          addToCart={addToCart}
          filteredProducts={filteredProducts}
          getProductPrices={getProductPrices}
          getPromotionBadge={getPromotionBadge}
          getStockBadge={getStockBadge}
          setSelectedProduct={setSelectedProduct}
        />
      )}

      {/* -------------------- VIEW 3: COMPACT WHOLESALE VIEW -------------------- */}
      {!loading && !error && filteredProducts.length > 0 && viewMode === 'compact' && (
        <ProductCompactView
          addToCart={addToCart}
          filteredProducts={filteredProducts}
          getProductPrices={getProductPrices}
          getPromotionBadge={getPromotionBadge}
          getStockBadge={getStockBadge}
          setSelectedProduct={setSelectedProduct}
        />
      )}

    </section>
  );
};
