import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageSelector } from '../components/LanguageSelector';
import { 
  Search, 
  Package, 
  Store, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Eye, 
  X,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  SlidersHorizontal,
  RefreshCw,
  RotateCcw,
  Phone,
  Mail,
  MapPin,
  Star,
  ExternalLink
} from 'lucide-react';
import { getApiUrl } from '../utils/api';
import TrustindexWidget from '../components/TrustindexWidget';

export const Catalog = () => {
  const { t, direction, language } = useLanguage();
  const { user } = useAuth();
  const { settings, getStoreName, reviews } = useStoreSettings();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState('all'); // 'all', 'inStock', 'lowStock'
  const [sortBy, setSortBy] = useState('name-asc');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const apiUrl = getApiUrl();
      const [prodRes, catRes] = await Promise.all([
        fetch(`${apiUrl}/api/products/catalog`, { headers }),
        fetch(`${apiUrl}/api/categories`, { headers })
      ]);

      if (!prodRes.ok) {
        throw new Error(`Failed to load catalog (${prodRes.status})`);
      }

      const prodData = await prodRes.json();
      const catData = await catRes.json();

      setProducts(Array.isArray(prodData) ? prodData : []);
      setCategories(Array.isArray(catData) ? catData : []);
    } catch (err) {
      console.error('Catalog fetch error:', err);
      setError(err.message || 'Error loading catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        // Category filter
        if (selectedCategory !== 'all') {
          const matchId = product.categoryId === selectedCategory || product.category?.id === selectedCategory;
          if (!matchId) return false;
        }

        // Stock filter
        if (stockFilter === 'inStock' && product.stock <= 0) return false;
        if (stockFilter === 'lowStock' && (product.stock <= 0 || product.stock > 15)) return false;

        // Search query across German, Arabic, SKU, descriptions
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const nameMatch = 
            (product.nameDe && product.nameDe.toLowerCase().includes(q)) ||
            (product.nameAr && product.nameAr.toLowerCase().includes(q)) ||
            (product.name && product.name.toLowerCase().includes(q));
          const skuMatch = product.sku?.toLowerCase().includes(q);
          const descMatch = 
            (product.descriptionDe && product.descriptionDe.toLowerCase().includes(q)) ||
            (product.descriptionAr && product.descriptionAr.toLowerCase().includes(q)) ||
            (product.description && product.description.toLowerCase().includes(q));
          const catMatch = 
            (product.category?.nameDe && product.category.nameDe.toLowerCase().includes(q)) ||
            (product.category?.nameAr && product.category.nameAr.toLowerCase().includes(q));
          return nameMatch || skuMatch || descMatch || catMatch;
        }

        return true;
      })
      .sort((a, b) => {
        const getLocalizedName = (p) => (language === 'ar' ? p.nameAr : p.nameDe) || p.name || '';
        switch (sortBy) {
          case 'price-low':
            return (a.b2bPrice || 0) - (b.b2bPrice || 0);
          case 'price-high':
            return (b.b2bPrice || 0) - (a.b2bPrice || 0);
          case 'stock-high':
            return (b.stock || 0) - (a.stock || 0);
          case 'stock-low':
            return (a.stock || 0) - (b.stock || 0);
          case 'name-desc':
            return getLocalizedName(b).localeCompare(getLocalizedName(a));
          case 'name-asc':
          default:
            return getLocalizedName(a).localeCompare(getLocalizedName(b));
        }
      });
  }, [products, selectedCategory, stockFilter, searchQuery, sortBy, language]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    selectedCategory !== 'all' ||
    stockFilter !== 'all' ||
    sortBy !== 'name-asc'
  );

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setStockFilter('all');
    setSortBy('name-asc');
  };

  const getStockBadge = (stock) => {
    if (stock <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50/95 dark:bg-rose-950/90 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/50 shadow-2xs backdrop-blur">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          {t('outOfStock')}
        </span>
      );
    }
    if (stock <= 15) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50/95 dark:bg-amber-950/90 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/50 shadow-2xs backdrop-blur">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          {stock} {t('units')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50/95 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/50 shadow-2xs backdrop-blur">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        {stock} {t('units')}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Contact & Quick Access Bar */}
      {(settings?.phone || settings?.email || settings?.googleReviewsUrl || settings?.mapUrl) && (
        <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4 border-b border-slate-800 transition-colors">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-4">
              {settings?.phone && (
                <a 
                  href={`tel:${settings.phone}`} 
                  className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span dir="ltr">{settings.phone}</span>
                </a>
              )}
              {settings?.email && (
                <a 
                  href={`mailto:${settings.email}`} 
                  className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  <span>{settings.email}</span>
                </a>
              )}
            </div>

            <div className="flex items-center gap-3">
              {settings?.googleReviewsUrl && (
                <a
                  href={settings.googleReviewsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-amber-300 transition-colors font-medium"
                >
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>
                    {(settings.googleRating ? Number(settings.googleRating) : 5.0).toFixed(1)} ({settings?.googleReviewCount ?? 0} {language === 'ar' ? 'تقييم' : 'Google Reviews'})
                  </span>
                </a>
              )}
              {settings?.mapUrl && (
                <a
                  href={settings.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>{t('viewOnGoogleMaps')}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Header / Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-slate-200/80 dark:border-gray-850 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {settings?.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={getStoreName(language)}
                className="w-10 h-10 object-contain rounded-xl bg-slate-50 dark:bg-gray-900 p-1 border border-slate-200/60 dark:border-gray-800 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                <Store className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-none block truncate">
                {getStoreName(language) || t('publicCatalog')}
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                {t('wholesaleCatalog')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <LanguageSelector />

            {user ? (
              <Link
                to="/secret/admin/dashboard"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-sm transition-colors cursor-pointer"
              >
                {direction === 'rtl' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                <span className="hidden sm:inline">{t('dashboard')}</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-sm transition-colors cursor-pointer"
              >
                {t('login')}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Hero Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-gray-900 dark:via-indigo-950/60 dark:to-gray-900 p-6 sm:p-8 text-white shadow-lg border border-transparent dark:border-indigo-900/30 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 dark:bg-white/10 backdrop-blur text-xs font-semibold text-white">
              <Sparkles className="w-3.5 h-3.5" />
              {products.length} {t('products')}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {getStoreName(language) || t('publicCatalog')}
            </h1>
            <p className="text-blue-100 dark:text-indigo-200/80 text-sm sm:text-base">
              {t('catalogSubtitle')}
            </p>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-10 pointer-events-none">
            <Package className="w-64 h-64" />
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-gray-850 space-y-4">
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
                      ? 'bg-white dark:bg-gray-850 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-gray-750'
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
                      ? 'bg-white dark:bg-gray-850 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/60 dark:border-gray-750'
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
                      ? 'bg-white dark:bg-gray-850 text-amber-600 dark:text-amber-400 shadow-sm border border-slate-200/60 dark:border-gray-750'
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
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-gray-950 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-850 border border-transparent dark:border-gray-800/80'
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
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-gray-950 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-850 border border-transparent dark:border-gray-800/80'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{t('loading')}</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-6 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto" />
            <p className="text-sm text-rose-700 dark:text-rose-300 font-medium">{error}</p>
            <button
              onClick={fetchCatalog}
              className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition-colors"
            >
              {t('retry')}
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredProducts.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-850 p-8 shadow-sm">
            <Package className="w-12 h-12 text-slate-400 dark:text-gray-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {t('noProductsFound')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
              {t('adjustFiltersHint')}
            </p>
          </div>
        )}

        {/* Compact, High-UX Product Grid */}
        {!loading && !error && filteredProducts.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {filteredProducts.map((product) => {
              const localizedName = (language === 'ar' ? product.nameAr : product.nameDe) || product.name;
              const localizedDesc = (language === 'ar' ? product.descriptionAr : product.descriptionDe) || product.description;
              const localizedCategory = product.category ? (language === 'ar' ? product.category.nameAr : product.category.nameDe) : null;

              return (
                <div
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="group bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-gray-850 shadow-2xs hover:shadow-md hover:border-blue-500/40 dark:hover:border-blue-500/40 transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer"
                >
                  <div>
                    {/* Media Area (Compact) */}
                    <div className="relative h-32 sm:h-36 bg-slate-50 dark:bg-gray-950 flex items-center justify-center overflow-hidden border-b border-slate-100 dark:border-gray-800/80">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
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
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-850 shadow-2xs border border-slate-200/70 dark:border-gray-750 flex items-center justify-center text-blue-600 dark:text-blue-400">
                          <Package className="w-5 h-5" />
                        </div>
                      </div>

                      {/* Category Tag */}
                      {localizedCategory && (
                        <span className="absolute top-2 start-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/95 dark:bg-gray-900/90 text-slate-700 dark:text-gray-300 shadow-2xs backdrop-blur border border-slate-200/50 dark:border-gray-800 line-clamp-1 max-w-[55%]">
                          {localizedCategory}
                        </span>
                      )}

                      {/* Stock Badge */}
                      <div className="absolute top-2 end-2">
                        {getStockBadge(product.stock)}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-3 space-y-1.5">
                      <div className="space-y-0.5">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" title={localizedName}>
                          {localizedName}
                        </h3>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-gray-500 font-mono">
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
                    <div>
                  
                      <span className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 tracking-tight leading-none">
                        €{Number(product.b2bPrice).toFixed(2)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProduct(product);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-200 group-hover:bg-blue-600 group-hover:text-white dark:group-hover:bg-blue-600 dark:group-hover:text-white transition-colors cursor-pointer shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t('viewDetails')}</span>
                    </button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Google Reviews Showcase Section */}
      {settings?.showGoogleReviews !== false && (
      <section className="mt-20 py-16 bg-gradient-to-b from-slate-50/80 via-white to-slate-50/50 dark:from-gray-950 dark:via-gray-900/60 dark:to-gray-950 border-t border-slate-200/80 dark:border-gray-850">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <TrustindexWidget
            settings={settings}
            reviews={reviews}
          />
        </div>
      </section>
      )}

      {/* Store Footer & Information Section */}
      <footer className="mt-16 bg-white dark:bg-gray-900 border-t border-slate-200/80 dark:border-gray-850 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Column 1: Store Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {settings?.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt={getStoreName(language)}
                    className="w-12 h-12 object-contain rounded-2xl bg-slate-50 dark:bg-gray-950 p-1.5 border border-slate-200/80 dark:border-gray-800 shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                    <Store className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    {getStoreName(language) || 'Hajar Supermarkt'}
                  </h3>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Supermarkt &amp; Lieferservice</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 leading-relaxed">
                {language === 'ar' 
                  ? 'وجهتكم الأولى للتسوق المنزلي اليومي وتوصيل الطلبات الطازجة لباب البيت مباشرة مع الدفع عند الاستلام.' 
                  : 'Ihr zuverlässiger Supermarkt für bequeme Hauszustellung frischer Lebensmittel mit Bar- oder Kartenzahlung an der Haustür.'}
              </p>
            </div>

            {/* Column 2: Contact Info */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                {t('contactInfo')}
              </h4>
              <ul className="space-y-2.5 text-xs sm:text-sm">
                {settings?.phone && (
                  <li>
                    <a
                      href={`tel:${settings.phone}`}
                      className="flex items-center gap-2.5 text-slate-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
                    >
                      <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span dir="ltr">{settings.phone}</span>
                    </a>
                  </li>
                )}
                {settings?.email && (
                  <li>
                    <a
                      href={`mailto:${settings.email}`}
                      className="flex items-center gap-2.5 text-slate-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
                    >
                      <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="break-all">{settings.email}</span>
                    </a>
                  </li>
                )}
                {settings?.address && (
                  <li className="flex items-start gap-2.5 text-slate-600 dark:text-gray-300">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{settings.address}</span>
                  </li>
                )}
              </ul>
            </div>

      

            {/* Column 4: Google Maps & Location */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                {t('findUs')}
              </h4>
              {settings?.mapEmbedUrl ? (
                <div className="w-full h-28 rounded-xl overflow-hidden border border-slate-200/80 dark:border-gray-800 shadow-sm">
                  <iframe
                    title="Store Google Maps"
                    src={settings.mapEmbedUrl}
                    className="w-full h-full border-0"
                    loading="lazy"
                  />
                </div>
              ) : null}
              {settings?.mapUrl && (
                <a
                  href={settings.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition"
                >
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span>{t('viewOnGoogleMaps')}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

          </div>

          {/* Bottom Copyright */}
          <div className="mt-10 pt-6 border-t border-slate-100 dark:border-gray-800 text-center text-xs text-slate-400 dark:text-gray-500">
            <p>© {new Date().getFullYear()} {getStoreName(language) || 'Hajar Supermarkt'}. All rights reserved.</p>
          </div>
        </div>
      </footer>


      {/* Product Details Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="relative h-48 bg-gradient-to-br from-blue-600/10 to-indigo-600/20 dark:from-blue-950/40 dark:to-gray-950 flex items-center justify-center border-b border-slate-100 dark:border-gray-850">
              {selectedProduct.imageUrl ? (
                <img
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="w-16 h-16 text-blue-500/50" />
              )}
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    {selectedProduct.category ? (language === 'ar' ? selectedProduct.category.nameAr : selectedProduct.category.nameDe) : t('generalCategory')}
                  </span>
                  {getStockBadge(selectedProduct.stock)}
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {(language === 'ar' ? selectedProduct.nameAr : selectedProduct.nameDe) || selectedProduct.name}
                </h2>
                {/* Secondary name */}
                {(selectedProduct.nameDe && selectedProduct.nameAr) && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5" dir={language === 'ar' ? 'ltr' : 'rtl'}>
                    {language === 'ar' ? selectedProduct.nameDe : selectedProduct.nameAr}
                  </p>
                )}
                <span className="text-xs font-mono text-slate-400 dark:text-gray-500 block mt-1">SKU: {selectedProduct.sku}</span>
              </div>

              <div className="bg-slate-50 dark:bg-gray-950/70 border border-slate-200/80 dark:border-gray-800 p-4 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-gray-800">
                  <span className="text-slate-500 dark:text-gray-400">{t('b2bPrice')}</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                    €{Number(selectedProduct.b2bPrice).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-gray-800">
                  <span className="text-slate-500 dark:text-gray-400">{t('stock')}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedProduct.stock} {t('units')}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 dark:text-gray-400">{t('status')}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedProduct.stock > 0 ? t('inStock') : t('outOfStock')}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  {t('description')}
                </h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {(language === 'ar' ? selectedProduct.descriptionAr : selectedProduct.descriptionDe) || selectedProduct.description || t('noDescription')}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-gray-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  {t('cancel')}
                </button>
                {user ? (
                  <Link
                    to="/secret/admin/products"
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors cursor-pointer"
                  >
                    {t('editProduct')}
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors cursor-pointer"
                  >
                    {t('login')}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Catalog;
