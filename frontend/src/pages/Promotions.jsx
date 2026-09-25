import { useState, useEffect, useMemo } from 'react';
import axios from '../utils/adminAxios';
import { getApiUrl } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import {
  Tag,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Truck,
  Percent,
  Euro,
  AlertCircle,
  Copy,
  Check,
  Gift,
  Package,
  Layers,
  ShoppingBag
} from 'lucide-react';

export const Promotions = () => {
  const { t, language, direction } = useLanguage();
  const [activeTab, setActiveTab] = useState('coupons'); // 'coupons' or 'offers'

  // Data
  const [coupons, setCoupons] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState('');

  // Modals
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [couponSubmitting, setCouponSubmitting] = useState(false);
  const [couponError, setCouponError] = useState('');

  const [showOfferModal, setShowOfferModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [offerError, setOfferError] = useState('');

  // Coupon form state
  const [couponForm, setCouponForm] = useState({
    code: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    freeShipping: false,
    minOrderValue: '',
    maxDiscountAmount: '',
    usageLimit: '',
    usageLimitPerCustomer: 1,
    startDate: '',
    endDate: '',
    isActive: true
  });

  // Offer form state
  const [offerForm, setOfferForm] = useState({
    productId: '',
    type: 'BUY_X_GET_Y', // or 'PRODUCT_DISCOUNT'
    titleDe: '',
    titleAr: '',
    discountPercent: '',
    promotionalPrice: '',
    buyQuantity: 2,
    getYQuantity: 1,
    badgeTextDe: '',
    badgeTextAr: '',
    startDate: '',
    endDate: '',
    isActive: true
  });

  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const apiUrl = getApiUrl();

      const [coupRes, promoRes, prodRes] = await Promise.all([
        axios.get(`${apiUrl}/api/coupons`),
        axios.get(`${apiUrl}/api/promotions`),
        axios.get(`${apiUrl}/api/products`)
      ]);

      setCoupons(coupRes.data);
      setPromotions(promoRes.data);
      setProducts(prodRes.data);
    } catch (err) {
      console.error('Error fetching promotions & coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  // Coupon Handlers
  const handleOpenCreateCoupon = () => {
    setEditingCoupon(null);
    setCouponForm({
      code: '',
      description: '',
      discountType: 'PERCENTAGE',
      discountValue: '',
      freeShipping: false,
      minOrderValue: '',
      maxDiscountAmount: '',
      usageLimit: '',
      usageLimitPerCustomer: 1,
      startDate: '',
      endDate: '',
      isActive: true
    });
    setCouponError('');
    setShowCouponModal(true);
  };

  const handleOpenEditCoupon = (coup) => {
    setEditingCoupon(coup);
    setCouponForm({
      code: coup.code,
      description: coup.description || '',
      discountType: coup.discountType,
      discountValue: coup.discountValue,
      freeShipping: Boolean(coup.freeShipping),
      minOrderValue: coup.minOrderValue || '',
      maxDiscountAmount: coup.maxDiscountAmount || '',
      usageLimit: coup.usageLimit || '',
      usageLimitPerCustomer: coup.usageLimitPerCustomer || 1,
      startDate: coup.startDate ? coup.startDate.split('T')[0] : '',
      endDate: coup.endDate ? coup.endDate.split('T')[0] : '',
      isActive: coup.isActive
    });
    setCouponError('');
    setShowCouponModal(true);
  };

  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    setCouponSubmitting(true);
    setCouponError('');

    try {
      const apiUrl = getApiUrl();

      const payload = {
        code: couponForm.code.trim().toUpperCase(),
        description: couponForm.description.trim() || null,
        discountType: couponForm.discountType,
        discountValue: Number(couponForm.discountValue) || 0,
        freeShipping: Boolean(couponForm.freeShipping),
        minOrderValue: couponForm.minOrderValue ? Number(couponForm.minOrderValue) : 0,
        maxDiscountAmount: couponForm.maxDiscountAmount ? Number(couponForm.maxDiscountAmount) : null,
        usageLimit: couponForm.usageLimit ? parseInt(couponForm.usageLimit, 10) : null,
        usageLimitPerCustomer: couponForm.usageLimitPerCustomer ? parseInt(couponForm.usageLimitPerCustomer, 10) : 1,
        startDate: couponForm.startDate ? new Date(couponForm.startDate).toISOString() : null,
        endDate: couponForm.endDate ? new Date(couponForm.endDate).toISOString() : null,
        isActive: Boolean(couponForm.isActive)
      };

      if (editingCoupon) {
        await axios.put(`${apiUrl}/api/coupons/${editingCoupon.id}`, payload);
      } else {
        await axios.post(`${apiUrl}/api/coupons`, payload);
      }

      setShowCouponModal(false);
      fetchData();
    } catch (err) {
      setCouponError(err.response?.data?.error || err.message || 'Error saving coupon');
    } finally {
      setCouponSubmitting(false);
    }
  };

  const handleToggleCouponStatus = async (coup) => {
    try {
      const apiUrl = getApiUrl();
      await axios.put(
        `${apiUrl}/api/coupons/${coup.id}`,
        { isActive: !coup.isActive }
      );
      setCoupons(prev => prev.map(c => (c.id === coup.id ? { ...c, isActive: !c.isActive } : c)));
    } catch (err) {
      console.error('Toggle coupon status error:', err);
    }
  };

  const handleDeleteCoupon = async (id) => {
    if (!window.confirm('Möchten Sie diesen Gutschein wirklich löschen?')) return;
    try {
      const apiUrl = getApiUrl();
      await axios.delete(`${apiUrl}/api/coupons/${id}`);
      setCoupons(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Delete coupon error:', err);
    }
  };

  // Offer Handlers
  const handleOpenCreateOffer = () => {
    setEditingOffer(null);
    setOfferForm({
      productId: products[0]?.id || '',
      type: 'BUY_X_GET_Y',
      titleDe: '2+1 Gratis Aktion',
      titleAr: 'عرض 2+1 مجاناً',
      discountPercent: '',
      promotionalPrice: '',
      buyQuantity: 2,
      getYQuantity: 1,
      badgeTextDe: '2+1 Gratis',
      badgeTextAr: '2+1 مجاناً',
      startDate: '',
      endDate: '',
      isActive: true
    });
    setOfferError('');
    setShowOfferModal(true);
  };

  const handleOpenEditOffer = (off) => {
    setEditingOffer(off);
    setOfferForm({
      productId: off.productId,
      type: off.type,
      titleDe: off.titleDe || '',
      titleAr: off.titleAr || '',
      discountPercent: off.discountPercent || '',
      promotionalPrice: off.promotionalPrice || '',
      buyQuantity: off.buyQuantity || 2,
      getYQuantity: off.getYQuantity || 1,
      badgeTextDe: off.badgeTextDe || '',
      badgeTextAr: off.badgeTextAr || '',
      startDate: off.startDate ? off.startDate.split('T')[0] : '',
      endDate: off.endDate ? off.endDate.split('T')[0] : '',
      isActive: off.isActive
    });
    setOfferError('');
    setShowOfferModal(true);
  };

  const handleSaveOffer = async (e) => {
    e.preventDefault();
    setOfferSubmitting(true);
    setOfferError('');

    try {
      const apiUrl = getApiUrl();

      const payload = {
        productId: offerForm.productId,
        type: offerForm.type,
        titleDe: offerForm.titleDe.trim() || undefined,
        titleAr: offerForm.titleAr.trim() || undefined,
        discountPercent: offerForm.discountPercent ? Number(offerForm.discountPercent) : null,
        promotionalPrice: offerForm.promotionalPrice ? Number(offerForm.promotionalPrice) : null,
        buyQuantity: offerForm.buyQuantity ? parseInt(offerForm.buyQuantity, 10) : 2,
        getYQuantity: offerForm.getYQuantity ? parseInt(offerForm.getYQuantity, 10) : 1,
        badgeTextDe: offerForm.badgeTextDe.trim() || undefined,
        badgeTextAr: offerForm.badgeTextAr.trim() || undefined,
        startDate: offerForm.startDate ? new Date(offerForm.startDate).toISOString() : null,
        endDate: offerForm.endDate ? new Date(offerForm.endDate).toISOString() : null,
        isActive: Boolean(offerForm.isActive)
      };

      if (editingOffer) {
        await axios.put(`${apiUrl}/api/promotions/${editingOffer.id}`, payload);
      } else {
        await axios.post(`${apiUrl}/api/promotions`, payload);
      }

      setShowOfferModal(false);
      fetchData();
    } catch (err) {
      setOfferError(err.response?.data?.error || err.message || 'Error saving offer');
    } finally {
      setOfferSubmitting(false);
    }
  };

  const handleToggleOfferStatus = async (off) => {
    try {
      const apiUrl = getApiUrl();
      await axios.put(
        `${apiUrl}/api/promotions/${off.id}`,
        { isActive: !off.isActive }
      );
      setPromotions(prev => prev.map(p => (p.id === off.id ? { ...p, isActive: !p.isActive } : p)));
    } catch (err) {
      console.error('Toggle offer status error:', err);
    }
  };

  const handleDeleteOffer = async (id) => {
    if (!window.confirm('Möchten Sie dieses Angebot wirklich löschen?')) return;
    try {
      const apiUrl = getApiUrl();
      await axios.delete(`${apiUrl}/api/promotions/${id}`);
      setPromotions(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Delete promotion error:', err);
    }
  };

  // Filtered lists
  const filteredCoupons = useMemo(() => {
    if (!searchQuery) return coupons;
    const q = searchQuery.toLowerCase();
    return coupons.filter(c => c.code.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q)));
  }, [coupons, searchQuery]);

  const filteredOffers = useMemo(() => {
    if (!searchQuery) return promotions;
    const q = searchQuery.toLowerCase();
    return promotions.filter(
      p =>
        (p.product?.name && p.product.name.toLowerCase().includes(q)) ||
        (p.product?.sku && p.product.sku.toLowerCase().includes(q)) ||
        (p.badgeTextDe && p.badgeTextDe.toLowerCase().includes(q))
    );
  }, [promotions, searchQuery]);

  // KPIs
  const activeCouponsCount = coupons.filter(c => c.isActive).length;
  const totalCouponRedemptions = coupons.reduce((acc, c) => acc + (c.usedCount || 0), 0);
  const activeOffersCount = promotions.filter(p => p.isActive).length;
  const twoPlusOneOffersCount = promotions.filter(p => p.type === 'BUY_X_GET_Y').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Sparkles className="w-7 h-7 text-amber-500" />
            {t('promotions')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Verwalten Sie Gutscheine, Prozentrabatte, Gratis-Lieferung Kombis und 2+1 Produktangebote
          </p>
        </div>

        {/* Action Button */}
        <div>
          {activeTab === 'coupons' ? (
            <button
              onClick={handleOpenCreateCoupon}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-sm shadow-blue-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              {t('createCoupon')}
            </button>
          ) : (
            <button
              onClick={handleOpenCreateOffer}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-sm shadow-emerald-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              {t('createOffer')} (z.B. 2+1)
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Aktive Gutscheine
            </span>
            <Tag className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {activeCouponsCount} <span className="text-sm font-normal text-slate-400">/ {coupons.length}</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Gutschein-Einlösungen
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{totalCouponRedemptions}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Aktive Produkt-Angebote
            </span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {activeOffersCount} <span className="text-sm font-normal text-slate-400">/ {promotions.length}</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              2+1 Gratis Aktionen
            </span>
            <Gift className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{twoPlusOneOffersCount}</p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('coupons')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === 'coupons'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800'
            }`}
          >
            <Tag className="w-4 h-4" />
            {t('coupons')} ({coupons.length})
          </button>

          <button
            onClick={() => setActiveTab('offers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === 'offers'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {t('offers')} &amp; 2+1 ({promotions.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'coupons' ? 'Gutscheincode suchen...' : 'Produkt suchen...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* TAB 1: COUPONS */}
      {activeTab === 'coupons' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Laden...</div>
          ) : filteredCoupons.length === 0 ? (
            <div className="p-12 text-center">
              <Tag className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">Keine Gutscheine gefunden</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Erstellen Sie Ihren ersten Gutscheincode, um Ihren Kunden Rabatte oder kostenlose Lieferung zu bieten.
              </p>
              <button
                onClick={handleOpenCreateCoupon}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                Gutschein erstellen
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-gray-950/60 text-xs uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-100 dark:border-gray-800">
                  <tr>
                    <th className="py-3.5 px-4">Code</th>
                    <th className="py-3.5 px-4">Rabatttyp</th>
                    <th className="py-3.5 px-4">Vorteile / Perks</th>
                    <th className="py-3.5 px-4">Bedingung</th>
                    <th className="py-3.5 px-4">Einlösungen</th>
                    <th className="py-3.5 px-4">Gültigkeit</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-800/80">
                  {filteredCoupons.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-gray-850/50 transition">
                      <td className="py-3.5 px-4 font-medium">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-gray-800 text-slate-900 dark:text-white font-mono font-bold tracking-wider text-xs border border-slate-200 dark:border-gray-700">
                            {c.code}
                          </span>
                          <button
                            onClick={() => handleCopyCode(c.code)}
                            title="Code kopieren"
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                          >
                            {copiedCode === c.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {c.description && (
                          <div className="text-xs text-slate-400 mt-1 max-w-xs truncate">{c.description}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {c.discountType === 'PERCENTAGE' && (
                          <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                            <Percent className="w-3.5 h-3.5" />
                            {c.discountValue}% Rabatt
                            {c.maxDiscountAmount && (
                              <span className="text-xs font-normal text-slate-400">(max. €{c.maxDiscountAmount})</span>
                            )}
                          </span>
                        )}
                        {c.discountType === 'FIXED' && (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                            <Euro className="w-3.5 h-3.5" />€{Number(c.discountValue).toFixed(2)} Rabatt
                          </span>
                        )}
                        {c.discountType === 'COMBO' && (
                          <span className="inline-flex items-center gap-1 font-semibold text-purple-600 dark:text-purple-400">
                            <Gift className="w-3.5 h-3.5" />
                            Kombi {c.discountValue > 0 ? `(€${Number(c.discountValue).toFixed(2)})` : ''}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {c.freeShipping && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <Truck className="w-3 h-3" /> Gratis Lieferung
                            </span>
                          )}
                          {c.usageLimitPerCustomer && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-300">
                              Max {c.usageLimitPerCustomer}x / Kunde
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        {c.minOrderValue > 0 ? (
                          <span>Min. €{Number(c.minOrderValue).toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-400">Kein Mindestwert</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 dark:text-white">{c.usedCount}</span>
                        <span className="text-xs text-slate-400"> / {c.usageLimit ? c.usageLimit : '∞'}</span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {c.startDate || c.endDate ? (
                          <div>
                            {c.startDate && <div>Ab: {new Date(c.startDate).toLocaleDateString()}</div>}
                            {c.endDate && <div>Bis: {new Date(c.endDate).toLocaleDateString()}</div>}
                          </div>
                        ) : (
                          <span className="text-slate-400">Dauerhaft</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleCouponStatus(c)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                            c.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              c.isActive ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditCoupon(c)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-600 dark:text-slate-300 transition"
                            title="Bearbeiten"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCoupon(c.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 transition"
                            title="Löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OFFERS & 2+1 */}
      {activeTab === 'offers' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Laden...</div>
          ) : filteredOffers.length === 0 ? (
            <div className="p-12 text-center">
              <Sparkles className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">Keine Angebote gefunden</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Erstellen Sie ein Angebot für ein einzelnes Produkt oder eine beliebte 2+1 Gratis Aktion!
              </p>
              <button
                onClick={handleOpenCreateOffer}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition"
              >
                <Plus className="w-4 h-4" />
                Angebot erstellen
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-gray-950/60 text-xs uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-100 dark:border-gray-800">
                  <tr>
                    <th className="py-3.5 px-4">Produkt</th>
                    <th className="py-3.5 px-4">Angebotstyp</th>
                    <th className="py-3.5 px-4">Aktionsdetails</th>
                    <th className="py-3.5 px-4">Badge / Kennzeichnung</th>
                    <th className="py-3.5 px-4">Gültigkeit</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-800/80">
                  {filteredOffers.map((off) => (
                    <tr key={off.id} className="hover:bg-slate-50/70 dark:hover:bg-gray-850/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {off.product?.imageUrl ? (
                            <img
                              src={off.product.imageUrl}
                              alt=""
                              className="w-10 h-10 object-cover rounded-xl border border-slate-200 dark:border-gray-800 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                              <Package className="w-5 h-5 text-slate-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-white truncate">
                              {off.product?.nameDe || off.product?.name || 'Produkt'}
                            </p>
                            <p className="text-xs text-slate-400">
                              SKU: {off.product?.sku} &bull; Normal: €{Number(off.product?.b2bPrice || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {off.type === 'BUY_X_GET_Y' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            <Gift className="w-3.5 h-3.5" />
                            {off.buyQuantity}+{off.getYQuantity} Gratis Deal
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <Percent className="w-3.5 h-3.5" />
                            Einzelrabatt
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-medium">
                        {off.type === 'BUY_X_GET_Y' ? (
                          <span className="text-purple-600 dark:text-purple-400 font-semibold">
                            Kaufe {off.buyQuantity}, erhalte {off.getYQuantity} gratis
                          </span>
                        ) : off.promotionalPrice != null ? (
                          <div className="flex items-center gap-2">
                            <span className="line-through text-xs text-slate-400">
                              €{Number(off.product?.b2bPrice || 0).toFixed(2)}
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-base">
                              €{Number(off.promotionalPrice).toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">
                            -{off.discountPercent}% Rabatt
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          {off.badgeTextDe && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 w-max">
                              {off.badgeTextDe}
                            </span>
                          )}
                          {off.badgeTextAr && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-slate-300 w-max" dir="rtl">
                              {off.badgeTextAr}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {off.startDate || off.endDate ? (
                          <div>
                            {off.startDate && <div>Ab: {new Date(off.startDate).toLocaleDateString()}</div>}
                            {off.endDate && <div>Bis: {new Date(off.endDate).toLocaleDateString()}</div>}
                          </div>
                        ) : (
                          <span className="text-slate-400">Dauerhaft</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleOfferStatus(off)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                            off.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              off.isActive ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditOffer(off)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-600 dark:text-slate-300 transition"
                            title="Bearbeiten"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteOffer(off.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 transition"
                            title="Löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: COUPON CREATE / EDIT */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-gray-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue-600" />
                {editingCoupon ? t('editCoupon') : t('createCoupon')}
              </h2>
              <button
                onClick={() => setShowCouponModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {couponError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{couponError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCoupon} className="space-y-4 mt-4">
              {/* Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('couponCode')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="z.B. SOMMER10 oder WELCOME"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white uppercase focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Discount Type */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCouponForm({ ...couponForm, discountType: 'PERCENTAGE' })}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                    couponForm.discountType === 'PERCENTAGE'
                      ? 'border-blue-600 bg-blue-50/80 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                      : 'border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Percent className="w-4 h-4" />
                  Prozent (%)
                </button>
                <button
                  type="button"
                  onClick={() => setCouponForm({ ...couponForm, discountType: 'FIXED' })}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                    couponForm.discountType === 'FIXED'
                      ? 'border-emerald-600 bg-emerald-50/80 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Euro className="w-4 h-4" />
                  Betrag (€)
                </button>
                <button
                  type="button"
                  onClick={() => setCouponForm({ ...couponForm, discountType: 'COMBO', freeShipping: true })}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                    couponForm.discountType === 'COMBO'
                      ? 'border-purple-600 bg-purple-50/80 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                      : 'border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Gift className="w-4 h-4" />
                  Kombi Deal
                </button>
              </div>

              {/* Discount Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {couponForm.discountType === 'PERCENTAGE' ? 'Rabatt in %' : 'Rabatt in €'} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={couponForm.discountType === 'PERCENTAGE' ? '100' : '1000'}
                    required
                    placeholder={couponForm.discountType === 'PERCENTAGE' ? '10' : '5.00'}
                    value={couponForm.discountValue}
                    onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('minOrderValue')} (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={couponForm.minOrderValue}
                    onChange={(e) => setCouponForm({ ...couponForm, minOrderValue: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Free Shipping Checkbox (Combo perk) */}
              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={couponForm.freeShipping}
                  onChange={(e) => setCouponForm({ ...couponForm, freeShipping: e.target.checked })}
                  className="w-4 h-4 rounded-sm text-blue-600 focus:ring-blue-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-emerald-600" />
                    {t('includeFreeShipping')}
                  </span>
                  <p className="text-slate-500">Der Kunde zahlt keine Liefergebühr für diesen Auftrag.</p>
                </div>
              </label>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('usageLimit')} (Gesamt)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unbegrenzt"
                    value={couponForm.usageLimit}
                    onChange={(e) => setCouponForm({ ...couponForm, usageLimit: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('usageLimitPerCustomer')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={couponForm.usageLimitPerCustomer}
                    onChange={(e) => setCouponForm({ ...couponForm, usageLimitPerCustomer: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('validFrom')}
                  </label>
                  <input
                    type="date"
                    value={couponForm.startDate}
                    onChange={(e) => setCouponForm({ ...couponForm, startDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('validUntil')}
                  </label>
                  <input
                    type="date"
                    value={couponForm.endDate}
                    onChange={(e) => setCouponForm({ ...couponForm, endDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Interne Notiz / Beschreibung
                </label>
                <input
                  type="text"
                  placeholder="z.B. Willkommensgutschein für Neukunden"
                  value={couponForm.description}
                  onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Gutschein ist aktiv</span>
                <input
                  type="checkbox"
                  checked={couponForm.isActive}
                  onChange={(e) => setCouponForm({ ...couponForm, isActive: e.target.checked })}
                  className="w-5 h-5 rounded-sm text-blue-600 focus:ring-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowCouponModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-gray-800"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={couponSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm shadow-blue-600/30 transition disabled:opacity-50"
                >
                  {couponSubmitting ? 'Speichern...' : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: OFFER / 2+1 CREATE & EDIT */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-gray-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                {editingOffer ? t('editOffer') : t('createOffer')}
              </h2>
              <button
                onClick={() => setShowOfferModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {offerError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{offerError}</span>
              </div>
            )}

            <form onSubmit={handleSaveOffer} className="space-y-4 mt-4">
              {/* Target Product */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Produkt auswählen *
                </label>
                <select
                  required
                  value={offerForm.productId}
                  onChange={(e) => setOfferForm({ ...offerForm, productId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="" disabled>
                    -- Bitte Produkt wählen --
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameDe || p.name} (SKU: {p.sku} &bull; €{Number(p.b2bPrice).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Offer Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Angebotstyp *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setOfferForm({
                        ...offerForm,
                        type: 'BUY_X_GET_Y',
                        badgeTextDe: '2+1 Gratis',
                        badgeTextAr: '2+1 مجاناً'
                      })
                    }
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                      offerForm.type === 'BUY_X_GET_Y'
                        ? 'border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                        : 'border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Gift className="w-5 h-5" />
                    2+1 / Mengenrabatt
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setOfferForm({
                        ...offerForm,
                        type: 'PRODUCT_DISCOUNT',
                        badgeTextDe: 'Angebot',
                        badgeTextAr: 'عرض خاص'
                      })
                    }
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                      offerForm.type === 'PRODUCT_DISCOUNT'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                        : 'border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Percent className="w-5 h-5" />
                    Einzelprodukt-Rabatt
                  </button>
                </div>
              </div>

              {/* Type = BUY_X_GET_Y */}
              {offerForm.type === 'BUY_X_GET_Y' && (
                <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-3">
                  <p className="text-xs font-semibold text-purple-800 dark:text-purple-300">
                    Formel: Kaufe X Einheiten und erhalte Y Einheiten kostenlos (z.B. 2+1 Gratis = Kaufe 2, erhalte 1 gratis)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Kaufmenge (X)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={offerForm.buyQuantity}
                        onChange={(e) =>
                          setOfferForm({
                            ...offerForm,
                            buyQuantity: e.target.value,
                            badgeTextDe: `${e.target.value}+${offerForm.getYQuantity} Gratis`,
                            badgeTextAr: `${e.target.value}+${offerForm.getYQuantity} مجاناً`
                          })
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Gratismenge (Y)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={offerForm.getYQuantity}
                        onChange={(e) =>
                          setOfferForm({
                            ...offerForm,
                            getYQuantity: e.target.value,
                            badgeTextDe: `${offerForm.buyQuantity}+${e.target.value} Gratis`,
                            badgeTextAr: `${offerForm.buyQuantity}+${e.target.value} مجاناً`
                          })
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Type = PRODUCT_DISCOUNT */}
              {offerForm.type === 'PRODUCT_DISCOUNT' && (
                <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Fester Aktionspreis (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="z.B. 2.49"
                        value={offerForm.promotionalPrice}
                        onChange={(e) =>
                          setOfferForm({
                            ...offerForm,
                            promotionalPrice: e.target.value,
                            discountPercent: ''
                          })
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        ODER Rabatt in %
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        placeholder="z.B. 20"
                        value={offerForm.discountPercent}
                        onChange={(e) =>
                          setOfferForm({
                            ...offerForm,
                            discountPercent: e.target.value,
                            promotionalPrice: '',
                            badgeTextDe: e.target.value ? `-${e.target.value}%` : 'Angebot'
                          })
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Badge Text (German & Arabic) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Badge Deutsch
                  </label>
                  <input
                    type="text"
                    placeholder="2+1 Gratis"
                    value={offerForm.badgeTextDe}
                    onChange={(e) => setOfferForm({ ...offerForm, badgeTextDe: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Badge Arabisch
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    placeholder="2+1 مجاناً"
                    value={offerForm.badgeTextAr}
                    onChange={(e) => setOfferForm({ ...offerForm, badgeTextAr: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('validFrom')}
                  </label>
                  <input
                    type="date"
                    value={offerForm.startDate}
                    onChange={(e) => setOfferForm({ ...offerForm, startDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('validUntil')}
                  </label>
                  <input
                    type="date"
                    value={offerForm.endDate}
                    onChange={(e) => setOfferForm({ ...offerForm, endDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Angebot ist aktiv</span>
                <input
                  type="checkbox"
                  checked={offerForm.isActive}
                  onChange={(e) => setOfferForm({ ...offerForm, isActive: e.target.checked })}
                  className="w-5 h-5 rounded-sm text-emerald-600 focus:ring-emerald-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowOfferModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-gray-800"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={offerSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 transition disabled:opacity-50"
                >
                  {offerSubmitting ? 'Speichern...' : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
