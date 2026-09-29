import { useState, useEffect, useMemo } from 'react';
import axios from '../utils/adminAxios';
import { getApiUrl } from '../utils/api';
import { toDateInputValue } from '../utils/dates';
import { useLanguage } from '../context/LanguageContext';
import { Tag, Sparkles, Plus, Search } from 'lucide-react';
import { OfferModal } from './promotions/OfferModal';
import { CouponModal } from './promotions/CouponModal';
import { OffersTab } from './promotions/OffersTab';
import { CouponsTab } from './promotions/CouponsTab';
import { PromotionStats } from './promotions/PromotionStats';
import { useToast, useConfirm } from '../context/FeedbackContext';

export const Promotions = () => {
  const { t } = useLanguage();
  const toast = useToast();
  const confirm = useConfirm();
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
      startDate: toDateInputValue(coup.startDate),
      endDate: toDateInputValue(coup.endDate),
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
        // Sent as the picked calendar day; the backend makes it cover the
        // whole day in store time (start 00:00, end 23:59:59).
        startDate: couponForm.startDate || null,
        endDate: couponForm.endDate || null,
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
      toast.error(err.response?.data?.error || t('error'));
    }
  };

  const handleDeleteCoupon = async (id) => {
    if (!(await confirm({ message: t('confirmDeleteCoupon'), confirmText: t('delete'), variant: 'danger' }))) return;
    try {
      const apiUrl = getApiUrl();
      await axios.delete(`${apiUrl}/api/coupons/${id}`);
      setCoupons(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Delete coupon error:', err);
      toast.error(err.response?.data?.error || t('error'));
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
      startDate: toDateInputValue(off.startDate),
      endDate: toDateInputValue(off.endDate),
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
        startDate: offerForm.startDate || null,
        endDate: offerForm.endDate || null,
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
      toast.error(err.response?.data?.error || t('error'));
    }
  };

  const handleDeleteOffer = async (id) => {
    if (!(await confirm({ message: t('confirmDeleteOffer'), confirmText: t('delete'), variant: 'danger' }))) return;
    try {
      const apiUrl = getApiUrl();
      await axios.delete(`${apiUrl}/api/promotions/${id}`);
      setPromotions(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Delete promotion error:', err);
      toast.error(err.response?.data?.error || t('error'));
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
            <Sparkles className="w-7 h-7 text-warning-500" />
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
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm shadow-sm shadow-primary-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              {t('createCoupon')}
            </button>
          ) : (
            <button
              onClick={handleOpenCreateOffer}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-success-600 hover:bg-success-700 text-white font-medium text-sm shadow-sm shadow-success-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              {t('createOffer')} (z.B. 2+1)
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <PromotionStats
        activeCouponsCount={activeCouponsCount}
        activeOffersCount={activeOffersCount}
        coupons={coupons}
        promotions={promotions}
        totalCouponRedemptions={totalCouponRedemptions}
        twoPlusOneOffersCount={twoPlusOneOffersCount}
      />

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('coupons')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === 'coupons'
                ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20'
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
                ? 'bg-success-600 text-white shadow-sm shadow-success-600/20'
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
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* TAB 1: COUPONS */}
      {activeTab === 'coupons' && (
        <CouponsTab
          copiedCode={copiedCode}
          filteredCoupons={filteredCoupons}
          handleCopyCode={handleCopyCode}
          handleDeleteCoupon={handleDeleteCoupon}
          handleOpenCreateCoupon={handleOpenCreateCoupon}
          handleOpenEditCoupon={handleOpenEditCoupon}
          handleToggleCouponStatus={handleToggleCouponStatus}
          loading={loading}
        />
      )}

      {/* TAB 2: OFFERS & 2+1 */}
      {activeTab === 'offers' && (
        <OffersTab
          filteredOffers={filteredOffers}
          handleDeleteOffer={handleDeleteOffer}
          handleOpenCreateOffer={handleOpenCreateOffer}
          handleOpenEditOffer={handleOpenEditOffer}
          handleToggleOfferStatus={handleToggleOfferStatus}
          loading={loading}
        />
      )}

      {/* MODAL: COUPON CREATE / EDIT */}
      {showCouponModal && (
        <CouponModal
          couponError={couponError}
          couponForm={couponForm}
          couponSubmitting={couponSubmitting}
          editingCoupon={editingCoupon}
          handleSaveCoupon={handleSaveCoupon}
          setCouponForm={setCouponForm}
          setShowCouponModal={setShowCouponModal}
        />
      )}

      {/* MODAL: OFFER / 2+1 CREATE & EDIT */}
      {showOfferModal && (
        <OfferModal
          editingOffer={editingOffer}
          handleSaveOffer={handleSaveOffer}
          offerError={offerError}
          offerForm={offerForm}
          offerSubmitting={offerSubmitting}
          products={products}
          setOfferForm={setOfferForm}
          setShowOfferModal={setShowOfferModal}
        />
      )}
    </div>
  );
};
