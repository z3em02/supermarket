import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageSelector } from '../components/LanguageSelector';
import { 
  LayoutGrid, 
  List, 
  TableProperties,
  Search, 
  Package, 
  Store, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Eye, 
  X,
  ArrowRight,
  ArrowLeft,
  SlidersHorizontal,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Star,
  ExternalLink,
  ShieldCheck,
  Truck,
  Building2,
  Clock,
  Menu,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  LogIn,
  UserPlus,
  Gift,
  Sparkles,
  Tag
} from 'lucide-react';
import { getApiUrl } from '../utils/api';
import TrustindexWidget from '../components/TrustindexWidget';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { CustomerCartDrawer } from '../components/CustomerCartDrawer';

export const LandingPage = () => {
  const { t, direction, language } = useLanguage();
  const { user } = useAuth();
  const { customer, isAuthenticated: isCustomerLoggedIn } = useCustomerAuth();
  const { settings, getStoreName, reviews } = useStoreSettings();

  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('customer_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('customer_cart', JSON.stringify(cart));
  }, [cart]);

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
    setCartOpen(true);
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
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const apiUrl = getApiUrl();
      const [prodRes, catRes, promoRes] = await Promise.all([
        fetch(`${apiUrl}/api/products/catalog`, { headers }),
        fetch(`${apiUrl}/api/categories`, { headers }),
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-black bg-purple-600 text-white shadow-xs tracking-tight">
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-black bg-rose-600 text-white shadow-xs tracking-tight">
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

  const ratingNum = settings?.googleRating || 5.0;
  const countNum = settings?.googleReviewCount ?? 0;

  const getStockBadge = (stock) => {
    if (stock <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60">
          <XCircle className="w-3 h-3" />
          <span>{t('outOfStock')}</span>
        </span>
      );
    }
    if (stock <= 15) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/60">
          <AlertTriangle className="w-3 h-3" />
          <span>{t('lowStock')} ({stock})</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-900/60">
        <CheckCircle2 className="w-3 h-3" />
        <span>{t('inStock')}</span>
      </span>
    );
  };

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-gray-100 transition-colors duration-200 font-sans ${direction === 'rtl' ? 'rtl' : 'ltr'}`}>
      
      {/* 1. Header / Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-gray-800 transition-colors shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
            {settings?.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={getStoreName(language)}
                className="w-8 h-8 sm:w-11 sm:h-11 object-contain rounded-xl bg-slate-50 dark:bg-gray-850 p-1 border border-slate-200 dark:border-gray-750 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200 shrink-0">
                <Store className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-sm sm:text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white block leading-tight truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none">
                {getStoreName(language) || 'Hajar Supermarkt'}
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hidden xs:block truncate">
                {language === 'ar' ? 'سوبرماركت وخدمة التوصيل المنزلي' : 'Supermarkt & Lieferservice'}
              </span>
            </div>
          </Link>

          {/* Center Navigation Links (Desktop lg+) */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-gray-300">
            <a href="#catalog" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {t('catalog')}
            </a>
            <a href="#reviews" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {t('googleReviewsTitle') || 'Google Reviews'}
            </a>
            <a href="#contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {t('contactAndLocation')}
            </a>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Desktop / Tablet switches (hidden on phone, available inside mobile menu) */}
            <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
              <ThemeToggle />
              <LanguageSelector />
            </div>

            {/* Cart Button (Always visible on phone & desktop) */}
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm shadow-emerald-600/20 transition cursor-pointer touch-manipulation shrink-0"
              aria-label={language === 'ar' ? 'سلة المشتريات' : 'Warenkorb'}
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden md:inline">{language === 'ar' ? 'السلة' : 'Warenkorb'}</span>
              {totalCartCount > 0 && (
                <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white text-emerald-700 text-[10px] sm:text-[11px] font-black flex items-center justify-center font-mono">
                  {totalCartCount}
                </span>
              )}
            </button>

            {/* Desktop / Tablet Customer Auth */}
            <div className="hidden sm:flex items-center">
              {isCustomerLoggedIn ? (
                <Link
                  to="/account"
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-slate-800 dark:text-gray-100 text-xs sm:text-sm font-bold transition touch-manipulation"
                >
                  <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden md:inline">{customer?.name || (language === 'ar' ? 'حسابي' : 'Mein Konto')}</span>
                </Link>
              ) : (
                <div className="flex items-center gap-1">
                  <Link
                    to="/customer/login"
                    className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-slate-800 dark:text-gray-100 text-xs sm:text-sm font-bold transition touch-manipulation"
                  >
                    <LogIn className="w-4 h-4" />
                    <span className="hidden md:inline">{language === 'ar' ? 'دخول' : 'Anmelden'}</span>
                  </Link>
                  <Link
                    to="/customer/register"
                    className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-850 text-xs sm:text-sm font-bold transition"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{language === 'ar' ? 'تسجيل' : 'Registrieren'}</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Trigger (Phones & Tablets < lg) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 border border-slate-200/80 dark:border-gray-800 touch-manipulation cursor-pointer transition shrink-0"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Nav Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-gray-800 bg-white/98 dark:bg-gray-900/98 backdrop-blur-lg px-4 py-4 space-y-3 shadow-xl animate-in slide-in-from-top-2 duration-150">
            {/* Phone Controls: Language Selector & Theme Toggle */}
            <div className="sm:hidden flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-gray-850 border border-slate-200/80 dark:border-gray-800">
              <span className="text-xs font-bold text-slate-600 dark:text-gray-400">
                {language === 'ar' ? 'اللغة والمظهر' : 'Sprache & Design'}
              </span>
              <div className="flex items-center gap-2">
                <LanguageSelector />
                <ThemeToggle />
              </div>
            </div>

            {/* Customer Account / Auth Box */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60">
              {isCustomerLoggedIn ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm shadow-emerald-600/30">
                      {customer?.name?.charAt(0)?.toUpperCase() || 'C'}
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-slate-900 dark:text-white truncate">
                        {customer?.name || (language === 'ar' ? 'العميل' : 'Kunde')}
                      </span>
                      <span className="block text-[11px] text-emerald-700 dark:text-emerald-400 font-medium truncate">
                        {customer?.phone || customer?.email}
                      </span>
                    </div>
                  </div>
                  <Link
                    to="/account"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shrink-0 touch-manipulation shadow-sm"
                  >
                    {language === 'ar' ? 'حسابي' : 'Mein Konto'}
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700 dark:text-gray-300">
                    {language === 'ar' ? 'خدمة التوصيل السريع للمنزل' : 'Lieferservice & Kundenkonto'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/customer/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-900 dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition touch-manipulation shadow-2xs"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'تسجيل الدخول' : 'Anmelden'}</span>
                    </Link>
                    <Link
                      to="/customer/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition touch-manipulation shadow-2xs"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'حساب جديد' : 'Registrieren'}</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Anchor Links */}
            <div className="space-y-1 pt-1">
              <a
                href="#catalog"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-800 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition touch-manipulation"
              >
                <Package className="w-4 h-4 text-emerald-600" />
                <span>{t('catalog')}</span>
              </a>
              <a
                href="#reviews"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-800 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition touch-manipulation"
              >
                <Star className="w-4 h-4 text-amber-500" />
                <span>{t('googleReviewsTitle') || 'Google Reviews'}</span>
              </a>
              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-800 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition touch-manipulation"
              >
                <MapPin className="w-4 h-4 text-blue-500" />
                <span>{t('contactAndLocation')}</span>
              </a>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-slate-50 to-white dark:from-gray-900 dark:via-gray-950 dark:to-gray-950 pt-8 pb-12 sm:pt-16 sm:pb-24 border-b border-slate-200/70 dark:border-gray-850">
        {/* Decorative background glows */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -start-24 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-emerald-300/30 dark:bg-emerald-600/10 blur-3xl" />
          <div className="absolute -bottom-32 -end-16 w-72 h-72 sm:w-[28rem] sm:h-[28rem] rounded-full bg-blue-300/30 dark:bg-blue-600/10 blur-3xl" />
          <div className="absolute top-1/3 start-1/2 w-56 h-56 sm:w-72 sm:h-72 rounded-full bg-amber-200/25 dark:bg-amber-500/10 blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-4 sm:space-y-6">
            
            {/* Google Rating Trust Badge */}
            <div className="inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 px-3 sm:px-4 py-1.5 rounded-full bg-white dark:bg-gray-850 border border-slate-200/80 dark:border-gray-750 shadow-xs text-xs max-w-full">
              <div className="flex items-center gap-0.5 sm:gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="font-extrabold text-slate-900 dark:text-white">
                {ratingNum ? ratingNum.toFixed(1) : '5.0'}
              </span>
              <span className="text-slate-400 dark:text-slate-500 hidden xs:inline">•</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs">
                {countNum === 1
                  ? (language === 'ar' ? 'تقييم حقيقي واحد على Google' : '1 verifizierte Google-Bewertung')
                  : `${countNum} ${language === 'ar' ? (countNum <= 10 ? 'تقييمات حقيقية على Google' : 'تقييم حقيقي على Google') : 'verifizierte Google-Bewertungen'}`}
              </span>
              {settings?.googleReviewsUrl && (
                <a
                  href={settings.googleReviewsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 font-bold ms-1"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Main Headline */}
            <h1 className="text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.18] sm:leading-[1.15]">
              {t('heroTitle')}
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto px-2">
              {t('heroSubtitle')}
            </p>

            {/* Hero CTAs */}
            <div className="pt-2 flex flex-col xs:flex-row flex-wrap items-center justify-center gap-2.5 sm:gap-4 w-full">
              <a
                href="#catalog"
                className="w-full xs:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base shadow-sm hover:shadow transition-all cursor-pointer touch-manipulation"
              >
                <span>{t('exploreProducts')}</span>
                {direction === 'rtl' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </a>

              {isCustomerLoggedIn ? (
                <Link
                  to="/account"
                  className="w-full xs:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-gray-850 hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-800 dark:text-white font-bold text-sm sm:text-base border border-slate-200 dark:border-gray-750 shadow-2xs transition-all cursor-pointer touch-manipulation"
                >
                  <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{language === 'ar' ? 'حسابي وطلباتي' : 'Mein Konto & Bestellungen'}</span>
                </Link>
              ) : (
                <Link
                  to="/customer/login"
                  className="w-full xs:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-gray-850 hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-800 dark:text-white font-bold text-sm sm:text-base border border-slate-200 dark:border-gray-750 shadow-2xs transition-all cursor-pointer touch-manipulation"
                >
                  <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{language === 'ar' ? 'دخول العملاء / تسجيل' : 'Kunden-Login / Registrieren'}</span>
                </Link>
              )}
            </div>

            {/* 3 Core Value Cards */}
            <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-start">
              <div className="p-4 rounded-2xl bg-white/80 dark:bg-gray-850/80 border border-slate-200/80 dark:border-gray-850 shadow-2xs backdrop-blur-xs">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  {t('b2bFeatureTitle1')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                  {t('b2bFeatureDesc1')}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/80 dark:bg-gray-850/80 border border-slate-200/80 dark:border-gray-850 shadow-2xs backdrop-blur-xs">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                  <Star className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  {t('b2bFeatureTitle2')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                  {t('b2bFeatureDesc2')}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/80 dark:bg-gray-850/80 border border-slate-200/80 dark:border-gray-850 shadow-2xs backdrop-blur-xs">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                  <Truck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  {t('b2bFeatureTitle3')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                  {t('b2bFeatureDesc3')}
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. Product Catalog Section with View Switcher */}
      <section id="catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-6">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-xs font-bold tracking-wide uppercase mb-2">
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
            <div className="inline-flex items-center bg-white dark:bg-gray-900 p-1 rounded-xl border border-slate-200 dark:border-gray-800 shadow-2xs">
              <button
                type="button"
                onClick={() => handleViewChange('grid')}
                title={t('gridView')}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white shadow-xs'
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
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white shadow-xs'
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
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'compact'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TableProperties className="w-4 h-4" />
                <span className="hidden sm:inline">{t('compactView')}</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 dark:text-gray-500 -mt-2">
          {t('pricesInclVatNotice')}
        </p>

        {/* Filter Controls Bar */}
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
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-850 p-8 shadow-2xs">
            <Package className="w-12 h-12 text-slate-400 dark:text-gray-500 mx-auto mb-3" />
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
                    {/* Media Area */}
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
                        <span className="absolute top-2 start-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/95 dark:bg-gray-900/90 text-slate-700 dark:text-gray-300 shadow-2xs backdrop-blur-xs border border-slate-200/50 dark:border-gray-800 line-clamp-1 max-w-[55%]">
                          {localizedCategory}
                        </span>
                      )}

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
                      {(() => {
                        const priceInfo = getProductPrices(product);
                        return (
                          <div className="flex flex-col">
                            {priceInfo.promoPrice != null ? (
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 tracking-tight leading-none">
                                  €{priceInfo.promoPrice.toFixed(2)}
                                </span>
                                <span className="line-through text-xs text-slate-400">
                                  €{priceInfo.basePrice.toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none">
                                €{priceInfo.basePrice.toFixed(2)}
                              </span>
                            )}
                            {priceInfo.promoType === 'BUY_X_GET_Y' && (
                              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-0.5">
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
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white transition-all shadow-2xs cursor-pointer"
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
        )}

        {/* -------------------- VIEW 2: LIST VIEW -------------------- */}
        {!loading && !error && filteredProducts.length > 0 && viewMode === 'list' && (
          <div className="space-y-3">
            {filteredProducts.map((product) => {
              const localizedName = (language === 'ar' ? product.nameAr : product.nameDe) || product.name;
              const localizedDesc = (language === 'ar' ? product.descriptionAr : product.descriptionDe) || product.description;
              const localizedCategory = product.category ? (language === 'ar' ? product.category.nameAr : product.category.nameDe) : null;

              return (
                <div
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="group bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-850 p-3 sm:p-4 shadow-2xs hover:shadow-md hover:border-blue-500/40 dark:hover:border-blue-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
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
                        <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
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
                                <span className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400">
                                  €{priceInfo.promoPrice.toFixed(2)}
                                </span>
                                <span className="line-through text-xs text-slate-400">
                                  €{priceInfo.basePrice.toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
                                €{priceInfo.basePrice.toFixed(2)}
                              </span>
                            )}
                            {priceInfo.promoType === 'BUY_X_GET_Y' && (
                              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
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
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white transition-all cursor-pointer shadow-sm"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>{product.stock <= 0 ? t('outOfStock') : (language === 'ar' ? 'أضف للسلة' : 'In den Warenkorb')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* -------------------- VIEW 3: COMPACT WHOLESALE VIEW -------------------- */}
        {!loading && !error && filteredProducts.length > 0 && viewMode === 'compact' && (
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
                        className="hover:bg-blue-50/40 dark:hover:bg-gray-800/40 transition-colors cursor-pointer"
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
                                <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
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
                                <span className="font-black text-rose-600 dark:text-rose-400">
                                  €{priceInfo.promoPrice.toFixed(2)}
                                </span>
                                <span className="line-through text-xs text-slate-400">
                                  €{priceInfo.basePrice.toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <span className="font-black text-emerald-600 dark:text-emerald-400">
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
                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white transition-colors cursor-pointer"
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
        )}

      </section>

      {/* 4. Customer Home Delivery Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 text-white p-8 sm:p-12 shadow-md">
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
              <Truck className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'خدمة التوصيل المنزلي' : 'Lieferservice direkt nach Hause'}</span>
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              {language === 'ar' ? 'اطلب الآن وادفع عند استلام مشترياتك عند الباب' : 'Jetzt bestellen & erst bei Erhalt an der Haustür bezahlen'}
            </h2>
            <p className="text-sm sm:text-base text-emerald-100 leading-relaxed">
              {language === 'ar' ? 'نوفر لكم تشكيلة واسعة من المواد الغذائية الطازجة والمنتجات الشرقية والعالمية مع توصيل سريع وموثوق إلى عنوانكم.' : 'Genießen Sie frische orientalische und internationale Spezialitäten, zuverlässig und bequem zu Ihnen nach Hause geliefert.'}
            </p>
            <div className="pt-2">
              <Link
                to={isCustomerLoggedIn ? "/account" : "/customer/register"}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 font-black text-sm shadow-sm transition-all cursor-pointer"
              >
                <span>{isCustomerLoggedIn ? (language === 'ar' ? 'عرض حسابي وطلباتي' : 'Mein Konto & Bestellungen') : (language === 'ar' ? 'إنشاء حساب عميل مجاني' : 'Kostenloses Kundenkonto erstellen')}</span>
                {direction === 'rtl' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </Link>
            </div>
          </div>
        </div>
      </section>

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
      <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-200/80 dark:border-gray-850">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
            <MapPin className="w-3.5 h-3.5" />
            <span>{t('contactAndLocation')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {language === 'ar' ? 'تفضلوا بزيارتنا أو تواصلوا معنا' : 'Besuchen Sie uns vor Ort oder kontaktieren Sie uns'}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Contact Details Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-6">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {getStoreName(language) || 'Hajar Supermarkt'}
            </h3>

            <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className="block font-bold text-slate-900 dark:text-white">{t('addressLabel')}</span>
                  <span>{settings?.address || 'Koppreitergasse 8, 1120 Wien'}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <span className="block font-bold text-slate-900 dark:text-white">{t('phoneLabel')}</span>
                  <a href={`tel:${settings?.phone || '0681 20800852'}`} className="hover:text-blue-600">
                    {settings?.phone || '0681 20800852'}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <span className="block font-bold text-slate-900 dark:text-white">{t('emailLabel')}</span>
                  <a href={`mailto:${settings?.email || 'info@hajar-supermarkt.at'}`} className="hover:text-blue-600">
                    {settings?.email || 'info@hajar-supermarkt.at'}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="block font-bold text-slate-900 dark:text-white">{t('businessHours')}</span>
                  <span>{t('businessHoursValue')}</span>
                </div>
              </div>
            </div>

            {settings?.mapUrl && (
              <a
                href={settings.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-slate-800 dark:text-white text-xs font-bold transition-all"
              >
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>{t('viewOnMap')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Interactive Google Map Embed */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-850 p-4 sm:p-6 shadow-2xs flex flex-col justify-between overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'موقع مركزي في فيينا' : 'Zentrale Lage in Wien'}</span>
                </span>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
                  {settings?.address || 'Koppreitergasse 8, 1120 Wien'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {settings?.mapUrl && (
                  <a
                    href={settings.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{t('viewOnMap')}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {settings?.googleReviewsUrl && (
                  <a
                    href={settings.googleReviewsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-slate-700 dark:text-white font-bold text-xs transition-colors"
                  >
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>{t('writeGoogleReview')}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Live Google Maps Iframe */}
            {settings?.mapEmbedUrl ? (
              <div className="w-full h-80 sm:h-96 rounded-xl overflow-hidden border border-slate-200 dark:border-gray-800 shadow-inner">
                <iframe
                  title="Store Google Maps Location"
                  src={settings.mapEmbedUrl}
                  className="w-full h-full border-0"
                  loading="lazy"
                  allowFullScreen
                />
              </div>
            ) : null}
          </div>

        </div>
      </section>

      {/* 7. Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-slate-200/80 dark:border-gray-850">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Store className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {getStoreName(language) || 'Hajar Supermarkt'}
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-gray-400 text-center">
            © {new Date().getFullYear()} {getStoreName(language)}. {language === 'ar' ? 'جميع الحقوق محفوظة.' : 'Alle Rechte vorbehalten.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-500 dark:text-gray-400">
            <a href="#catalog" className="hover:text-blue-600">{t('catalog')}</a>
            <a href="#reviews" className="hover:text-blue-600">{t('googleReviewsTitle')}</a>
            <Link to="/impressum" className="hover:text-blue-600">{t('impressum')}</Link>
            <Link to="/datenschutz" className="hover:text-blue-600">{t('datenschutz')}</Link>
            <Link to={isCustomerLoggedIn ? "/account" : "/customer/login"} className="hover:text-blue-600">
              {isCustomerLoggedIn ? (language === 'ar' ? 'حسابي' : 'Mein Konto') : (language === 'ar' ? 'دخول العملاء' : 'Kunden-Login')}
            </Link>
          </div>
        </div>
      </footer>

      {/* 8. Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-gray-800 space-y-4 sm:space-y-6 max-h-[90dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                {selectedProduct.category ? (language === 'ar' ? selectedProduct.category.nameAr : selectedProduct.category.nameDe) : t('allCategories')}
              </span>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors cursor-pointer touch-manipulation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Image */}
            <div className="w-full h-44 sm:h-56 rounded-2xl bg-slate-50 dark:bg-gray-950 border border-slate-100 dark:border-gray-800 overflow-hidden flex items-center justify-center">
              {selectedProduct.imageUrl ? (
                <img
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  className="w-full h-full object-contain"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <Package className="w-12 h-12 sm:w-16 sm:h-16 text-blue-600 dark:text-blue-400" />
              )}
            </div>

            {/* Modal Content */}
            <div className="space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    {(language === 'ar' ? selectedProduct.nameAr : selectedProduct.nameDe) || selectedProduct.name}
                  </h3>
                  {getPromotionBadge(selectedProduct.id)}
                </div>
                <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-400 dark:text-gray-500 font-mono flex-wrap">
                  <span>SKU: {selectedProduct.sku}</span>
                  <span>•</span>
                  <div>{getStockBadge(selectedProduct.stock)}</div>
                </div>
              </div>

              {((language === 'ar' ? selectedProduct.descriptionAr : selectedProduct.descriptionDe) || selectedProduct.description) && (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-300 leading-relaxed">
                  {(language === 'ar' ? selectedProduct.descriptionAr : selectedProduct.descriptionDe) || selectedProduct.description}
                </p>
              )}

              <div className="pt-4 border-t border-slate-100 dark:border-gray-800 flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-3">
                <div>
                  <span className="block text-[11px] text-slate-400 font-semibold">{isAr ? 'السعر للتوصيل' : 'Preis für Hauszustellung'}</span>
                  {(() => {
                    const priceInfo = getProductPrices(selectedProduct);
                    return (
                      <div>
                        {priceInfo.promoPrice != null ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
                              €{priceInfo.promoPrice.toFixed(2)}
                            </span>
                            <span className="line-through text-xs text-slate-400 font-mono">
                              €{priceInfo.basePrice.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                            €{priceInfo.basePrice.toFixed(2)}
                          </span>
                        )}
                        {priceInfo.promoType === 'BUY_X_GET_Y' && (
                          <span className="text-xs text-purple-600 dark:text-purple-400 font-bold block mt-0.5">
                            {language === 'ar' ? 'عرض 2+1 مجاناً: أضف 3 وحدات للسلة وادفع ثمن 2 فقط!' : '2+1 Gratis Aktion: 3 Stück in den Warenkorb legen und 1 geschenkt bekommen!'}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  <span className="block text-[10px] text-slate-400 dark:text-gray-500 mt-0.5">
                    {t('pricesInclVatNotice')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    addToCart(selectedProduct);
                    setSelectedProduct(null);
                  }}
                  disabled={selectedProduct.stock <= 0}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer touch-manipulation"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{selectedProduct.stock <= 0 ? t('outOfStock') : (language === 'ar' ? 'أضف للسلة والتوصيل' : 'In den Warenkorb')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
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
            className="px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-2xl shadow-emerald-600/50 flex items-center gap-2 sm:gap-3 transition-transform hover:scale-105 cursor-pointer touch-manipulation"
          >
            <div className="relative">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute -top-2 -end-2 w-4 h-4 rounded-full bg-white text-emerald-700 text-[10px] font-black flex items-center justify-center font-mono">
                {totalCartCount}
              </span>
            </div>
            <span className="truncate">{language === 'ar' ? 'سلة التوصيل' : 'Zur Kasse'}</span>
            <span className="font-mono bg-emerald-800/60 px-2 py-0.5 rounded-lg text-xs shrink-0">
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

    </div>
  );
};

export default LandingPage;
