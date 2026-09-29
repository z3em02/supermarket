import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShoppingCart,
  Gift,
  Sparkles
} from 'lucide-react';
import { getApiUrl } from '../utils/api';
import TrustindexWidget from '../components/TrustindexWidget';
import { CustomerCartDrawer } from '../components/CustomerCartDrawer';
import { ProductDetailModal } from './landing/ProductDetailModal';
import { LandingFooter } from './landing/LandingFooter';
import { ContactSection } from './landing/ContactSection';
import { DeliveryBanner } from './landing/DeliveryBanner';
import { CatalogSection } from './landing/CatalogSection';
import { HeroSection } from './landing/HeroSection';
import { LandingHeader } from './landing/LandingHeader';

export const LandingPage = () => {
  const { t, direction, language } = useLanguage();
  const { settings, reviews } = useStoreSettings();

  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('customer_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [addedToast, setAddedToast] = useState(null);

  useEffect(() => {
    localStorage.setItem('customer_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (!addedToast) return;
    const timer = setTimeout(() => setAddedToast(null), 1800);
    return () => clearTimeout(timer);
  }, [addedToast]);

  const addToCart = (product, quantity = 1) => {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        const newQty = Math.min(product.stock, existing.quantity + quantity);
        return prev.map((item) => (item.productId === product.id ? { ...item, quantity: newQty } : item));
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          nameDe: product.nameDe,
          nameAr: product.nameAr,
          price: product.b2bPrice,
          imageUrl: product.imageUrl,
          stock: product.stock,
          quantity
        }
      ];
    });
    setAddedToast(product.nameDe || product.name);
  };

  const updateCartQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.stock) return item;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState('all'); // 'all', 'inStock', 'lowStock'
  const [sortBy, setSortBy] = useState('name-asc');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // View Mode: 'grid' | 'list' | 'compact'
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('catalog_view_mode') || 'grid';
  });

  const handleViewChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('catalog_view_mode', mode);
  };

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      setError(null);
      // credentials: 'include' lets the (optional) admin session cookie ride
      // along automatically if present — no token to read from localStorage.
      const headers = { 'Content-Type': 'application/json' };
      const apiUrl = getApiUrl();
      const [prodRes, catRes, promoRes] = await Promise.all([
        fetch(`${apiUrl}/api/products/catalog`, { headers, credentials: 'include' }),
        fetch(`${apiUrl}/api/categories`, { headers, credentials: 'include' }),
        fetch(`${apiUrl}/api/promotions/active`).catch(() => null)
      ]);

      if (!prodRes.ok) {
        throw new Error(`Failed to load catalog (${prodRes.status})`);
      }

      const prodData = await prodRes.json();
      const catData = await catRes.json();
      let promoData = [];
      if (promoRes && promoRes.ok) {
        promoData = await promoRes.json();
      }

      setProducts(Array.isArray(prodData) ? prodData : []);
      setCategories(Array.isArray(catData) ? catData : []);
      setPromotions(Array.isArray(promoData) ? promoData : []);
    } catch (err) {
      console.error('Catalog fetch error:', err);
      setError(err.message || 'Error loading catalog');
    } finally {
      setLoading(false);
    }
  };

  const promoMap = useMemo(() => {
    return new Map(promotions.map(p => [p.productId, p]));
  }, [promotions]);

  const getPromotionBadge = (productId) => {
    const promo = promoMap.get(productId);
    if (!promo || !promo.isActive) return null;

    if (promo.type === 'BUY_X_GET_Y') {
      const text = (language === 'ar' ? promo.badgeTextAr : promo.badgeTextDe) || `${promo.buyQuantity || 2}+${promo.getYQuantity || 1} Gratis`;
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-black bg-promo-600 text-white shadow-xs tracking-tight">
          <Gift className="w-3 h-3" />
          {text}
        </span>
      );
    }

    if (promo.type === 'PRODUCT_DISCOUNT') {
      let text = (language === 'ar' ? promo.badgeTextAr : promo.badgeTextDe);
      if (!text) {
        if (promo.discountPercent) text = `-${promo.discountPercent}%`;
        else text = language === 'ar' ? 'عرض خاص' : 'Aktion';
      }
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-black bg-danger-600 text-white shadow-xs tracking-tight">
          <Sparkles className="w-3 h-3" />
          {text}
        </span>
      );
    }
    return null;
  };

  const getProductPrices = (product) => {
    const promo = promoMap.get(product.id);
    const basePrice = Number(product.b2bPrice);
    if (!promo || !promo.isActive) {
      return { basePrice, promoPrice: null, hasPromo: false, promoType: null };
    }

    if (promo.type === 'PRODUCT_DISCOUNT') {
      let promoPrice = basePrice;
      if (promo.promotionalPrice != null) {
        promoPrice = Number(promo.promotionalPrice);
      } else if (promo.discountPercent) {
        promoPrice = Number((basePrice * (1 - promo.discountPercent / 100)).toFixed(2));
      }
      return { basePrice, promoPrice, hasPromo: true, promoType: 'PRODUCT_DISCOUNT', promo };
    }

    if (promo.type === 'BUY_X_GET_Y') {
      return { basePrice, promoPrice: null, hasPromo: true, promoType: 'BUY_X_GET_Y', promo };
    }

    return { basePrice, promoPrice: null, hasPromo: false, promoType: null };
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  // Re-sync cart items against the live catalog once products load, so a cart
  // that's been sitting in localStorage for days doesn't show a stale price
  // or let a customer check out with an outdated total. Removes items whose
  // product was deleted or has since sold out, and clamps quantity to stock.
  useEffect(() => {
    if (products.length === 0) return;
    setCart((prev) => {
      let changed = false;
      const next = prev
        .map((item) => {
          const live = products.find((p) => p.id === item.productId);
          if (!live || live.stock <= 0) {
            changed = true;
            return null;
          }
          const clampedQty = Math.min(item.quantity, live.stock);
          if (live.b2bPrice !== item.price || live.stock !== item.stock || clampedQty !== item.quantity) {
            changed = true;
            return { ...item, price: live.b2bPrice, stock: live.stock, quantity: clampedQty };
          }
          return item;
        })
        .filter(Boolean);
      return changed ? next : prev;
    });
  }, [products]);

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        if (selectedCategory !== 'all') {
          const matchId = product.categoryId === selectedCategory || product.category?.id === selectedCategory;
          if (!matchId) return false;
        }

        if (stockFilter === 'inStock' && product.stock <= 0) return false;
        if (stockFilter === 'lowStock' && (product.stock <= 0 || product.stock > 15)) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = product.name && product.name.toLowerCase().includes(q);
          const matchNameDe = product.nameDe && product.nameDe.toLowerCase().includes(q);
          const matchNameAr = product.nameAr && product.nameAr.toLowerCase().includes(q);
          const matchSku = product.sku && product.sku.toLowerCase().includes(q);
          const matchDesc = product.description && product.description.toLowerCase().includes(q);
          const matchDescDe = product.descriptionDe && product.descriptionDe.toLowerCase().includes(q);
          const matchDescAr = product.descriptionAr && product.descriptionAr.toLowerCase().includes(q);

          if (!matchName && !matchNameDe && !matchNameAr && !matchSku && !matchDesc && !matchDescDe && !matchDescAr) {
            return false;
          }
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

  const countNum = settings?.googleReviewCount ?? 0;
  // Only trust a rating once there's at least one real review behind it —
  // same fix as TrustindexWidget.jsx: a bare `|| 5.0` fallback showed a
  // "perfect" 5.0 badge with "0 reviews" next to it, which reads as
  // fabricated rather than an honest "no reviews yet" state.
  const hasRealRating = countNum > 0 && Number.isFinite(settings?.googleRating);
  const ratingNum = hasRealRating ? settings.googleRating : null;

  const getStockBadge = (stock) => {
    if (stock <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-semibold bg-danger-50 text-danger-700 dark:bg-danger-950/60 dark:text-danger-400 border border-danger-200/80 dark:border-danger-900/60">
          <XCircle className="w-3 h-3" />
          <span>{t('outOfStock')}</span>
        </span>
      );
    }
    if (stock <= 15) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-semibold bg-warning-50 text-warning-700 dark:bg-warning-950/60 dark:text-warning-400 border border-warning-200/80 dark:border-warning-900/60">
          <AlertTriangle className="w-3 h-3" />
          <span>{t('lowStock')} ({stock})</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-400 border border-brand-200/80 dark:border-brand-900/60">
        <CheckCircle2 className="w-3 h-3" />
        <span>{t('inStock')}</span>
      </span>
    );
  };

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-gray-100 transition-colors duration-200 font-sans ${direction === 'rtl' ? 'rtl' : 'ltr'}`}>
      
      {/* 1. Header / Navbar */}
      <LandingHeader
        mobileMenuOpen={mobileMenuOpen}
        setCartOpen={setCartOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        totalCartCount={totalCartCount}
      />

      {/* 2. Hero Section */}
      <HeroSection countNum={countNum} hasRealRating={hasRealRating} ratingNum={ratingNum} />

      {/* 3. Product Catalog Section with View Switcher */}
      <CatalogSection
        addToCart={addToCart}
        categories={categories}
        error={error}
        fetchCatalog={fetchCatalog}
        filteredProducts={filteredProducts}
        getProductPrices={getProductPrices}
        getPromotionBadge={getPromotionBadge}
        getStockBadge={getStockBadge}
        handleViewChange={handleViewChange}
        loading={loading}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        setSearchQuery={setSearchQuery}
        setSelectedCategory={setSelectedCategory}
        setSelectedProduct={setSelectedProduct}
        setSortBy={setSortBy}
        setStockFilter={setStockFilter}
        sortBy={sortBy}
        stockFilter={stockFilter}
        viewMode={viewMode}
      />

      {/* 4. Customer Home Delivery Banner */}
      <DeliveryBanner />

      {/* 5. Google Reviews Showcase Section */}
      {settings?.showGoogleReviews !== false && (
        <section id="reviews" className="py-16 sm:py-20 bg-gradient-to-b from-slate-50/80 via-white to-slate-50/50 dark:from-gray-950 dark:via-gray-900/60 dark:to-gray-950 border-t border-slate-200/80 dark:border-gray-850">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <TrustindexWidget
              settings={settings}
              reviews={reviews}
            />
          </div>
        </section>
      )}

      {/* 6. Store Location & Contact Section */}
      <ContactSection />

      {/* 7. Footer */}
      <LandingFooter />

      {/* 8. Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          addToCart={addToCart}
          getProductPrices={getProductPrices}
          getPromotionBadge={getPromotionBadge}
          getStockBadge={getStockBadge}
          selectedProduct={selectedProduct}
          setSelectedProduct={setSelectedProduct}
        />
      )}

      {/* Floating Quick Cart Bar */}
      {totalCartCount > 0 && !cartOpen && (
        <aside 
          aria-label={language === 'ar' ? 'سلة التسوق السريعة' : 'Schneller Warenkorb'}
          className="fixed bottom-4 end-4 sm:bottom-6 sm:end-6 z-40 max-w-[calc(100vw-2rem)]"
        >
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-black text-xs sm:text-sm shadow-2xl shadow-brand-600/50 flex items-center gap-2 sm:gap-3 transition-transform hover:scale-105 cursor-pointer touch-manipulation"
          >
            <div className="relative">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute -top-2 -end-2 w-4 h-4 rounded-full bg-white text-brand-700 text-[10px] font-black flex items-center justify-center font-mono">
                {totalCartCount}
              </span>
            </div>
            <span className="truncate">{language === 'ar' ? 'سلة التوصيل' : 'Zur Kasse'}</span>
            <span className="font-mono bg-brand-800/60 px-2 py-0.5 rounded-lg text-xs shrink-0">
              €{Number(totalCartAmount).toFixed(2)}
            </span>
          </button>
        </aside>
      )}

      {/* Customer Cart Drawer */}
      <CustomerCartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        updateQuantity={updateCartQuantity}
        removeFromCart={removeFromCart}
        clearCart={clearCart}
      />

      {/* Add-to-cart confirmation toast (replaces auto-opening the cart drawer) */}
      {addedToast && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 bg-slate-900 dark:bg-gray-800 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg transition">
          <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0" />
          <span className="truncate max-w-[70vw]">
            {language === 'ar' ? `تمت إضافة "${addedToast}"` : `"${addedToast}" hinzugefügt`}
          </span>
        </div>
      )}

    </div>
  );
};

export default LandingPage;
