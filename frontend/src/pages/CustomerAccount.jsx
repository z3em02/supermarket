import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import customerAxios from '../utils/customerAxios';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { printHtmlInHiddenIframe } from '../utils/printDocument';
import { buildCustomerOrderReportHtml } from '../utils/customerOrderReport';
import {
  Package,
  MapPin
} from 'lucide-react';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { OrderReportModal } from './account/OrderReportModal';
import { ProfileTab } from './account/ProfileTab';
import { OrdersTab } from './account/OrdersTab';
import { VerifyContactModal } from './account/VerifyContactModal';
import { WelcomeHeader } from './account/WelcomeHeader';
import { AccountHeader } from './account/AccountHeader';
import { usePushOptIn } from './account/usePushOptIn';

export const CustomerAccount = () => {
  const { customer, loading: authLoading, updateProfile, verifyEmail, verifyPhone, resendOtp, refreshProfile } = useCustomerAuth();
  const { language, setLanguage } = useLanguage();
  const { getStoreName } = useStoreSettings();
  const navigate = useNavigate();

  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'profile'
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [reorderingOrderId, setReorderingOrderId] = useState(null);

  const pushOptIn = usePushOptIn();
  const { pushStatus, enablingPush, handleEnablePush } = pushOptIn;

  // Modification response & Order Report Modal state
  const [reportOrder, setReportOrder] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [respondingOrderId, setRespondingOrderId] = useState(null);
  const [actionFeedback, setActionFeedback] = useState({ message: '', isError: false });

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    street: customer?.street || '',
    houseNumber: customer?.houseNumber || '',
    postalCode: customer?.postalCode || '',
    city: customer?.city || '',
    floorApartment: customer?.floorApartment || '',
    deliveryNotes: customer?.deliveryNotes || '',
    preferredLanguage: customer?.preferredLanguage || 'de',
    password: '',
    currentPassword: ''
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Inline Verification Modals / State
  const [verifyingType, setVerifyingType] = useState(null); // 'email' | 'phone' | null
  const [otpInput, setOtpInput] = useState('');
  const [verifyingLoading, setVerifyingLoading] = useState(false);
  // False while the WhatsApp code is still being sent
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);

  const isAuthenticated = Boolean(customer);

  // Stable (closes over nothing that changes), so it's a safe effect dep.
  const fetchOrders = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoadingOrders(true);
      const res = await customerAxios.get(`/api/orders/my-orders`);
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (err.response?.status !== 401) {
        console.error('Failed to load customer orders:', err);
      }
    } finally {
      if (!silent) setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return; // wait for the initial session check to resolve
    if (!isAuthenticated) {
      navigate('/customer/login');
      return;
    }
    fetchOrders();

    // #37 fix: stop polling once the session is gone (cookie-based now —
    // customer becomes null via refreshProfile/logout, not a stored token).
    const pollId = setInterval(() => {
      fetchOrders(true);
    }, 15000);
    return () => clearInterval(pollId);
  }, [authLoading, isAuthenticated, navigate, fetchOrders]);

  useEffect(() => {
    if (customer) {
      setProfileForm({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        street: customer.street || '',
        houseNumber: customer.houseNumber || '',
        postalCode: customer.postalCode || '',
        city: customer.city || '',
        floorApartment: customer.floorApartment || '',
        deliveryNotes: customer.deliveryNotes || '',
        preferredLanguage: customer.preferredLanguage || 'de',
        password: '',
        currentPassword: ''
      });
    }
  }, [customer]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      setProfileError('');
      setSaveSuccess('');

      await updateProfile(profileForm);
      if (profileForm.preferredLanguage && (profileForm.preferredLanguage === 'de' || profileForm.preferredLanguage === 'ar')) {
        setLanguage(profileForm.preferredLanguage);
      }
      setProfileForm(prev => ({ ...prev, password: '', currentPassword: '' }));
      setSaveSuccess(isAr ? 'تم تحديث بياناتك ولغة الحساب بنجاح!' : 'Profildaten und bevorzugte Sprache erfolgreich aktualisiert!');
    } catch (err) {
      console.error('Update profile error:', err);
      setProfileError(err.response?.data?.error || (isAr ? 'فشل تحديث البيانات' : 'Fehler beim Speichern'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleReorderOrder = async (order) => {
    if (!order?.orderItems?.length) return;
    try {
      setReorderingOrderId(order.id);
      // The public catalog route — /api/products itself is admin-only.
      const catalogRes = await customerAxios.get(`/api/products/catalog`);
      const availableProducts = Array.isArray(catalogRes.data) ? catalogRes.data : [];
      const productMap = new Map(availableProducts.map(p => [p.id, p]));

      let existingCart = [];
      try {
        const saved = localStorage.getItem('customer_cart');
        existingCart = saved ? JSON.parse(saved) : [];
      } catch {
        existingCart = [];
      }

      let addedCount = 0;
      let outOfStockCount = 0;

      for (const item of order.orderItems) {
        const liveProduct = productMap.get(item.productId);
        if (!liveProduct || liveProduct.stock <= 0) {
          outOfStockCount++;
          continue;
        }

        const existingIdx = existingCart.findIndex(c => c.productId === item.productId);
        const desiredQty = item.quantity || 1;
        if (existingIdx >= 0) {
          const newQty = Math.min(liveProduct.stock, existingCart[existingIdx].quantity + desiredQty);
          existingCart[existingIdx] = {
            ...existingCart[existingIdx],
            quantity: newQty,
            stock: liveProduct.stock,
            price: liveProduct.b2bPrice
          };
        } else {
          existingCart.push({
            productId: liveProduct.id,
            name: liveProduct.name,
            nameDe: liveProduct.nameDe,
            nameAr: liveProduct.nameAr,
            price: liveProduct.b2bPrice,
            imageUrl: liveProduct.imageUrl,
            stock: liveProduct.stock,
            quantity: Math.min(liveProduct.stock, desiredQty)
          });
        }
        addedCount++;
      }

      localStorage.setItem('customer_cart', JSON.stringify(existingCart));

      if (addedCount > 0) {
        const msg = isAr
          ? `تمت إضافة منتجات الطلب إلى سلة التسوق! (${addedCount} متوفر${outOfStockCount > 0 ? `، ${outOfStockCount} غير متوفر` : ''})`
          : `Artikel wurden in den Warenkorb gelegt! (${addedCount} verfügbar${outOfStockCount > 0 ? `, ${outOfStockCount} nicht vorrätig` : ''})`;
        setActionFeedback({ message: msg, isError: false });
        setTimeout(() => navigate('/'), 1200);
      } else {
        const msg = isAr
          ? 'عذراً، جميع منتجات هذا الطلب نفدت من المخزون حالياً.'
          : 'Leider sind derzeit alle Artikel dieser Bestellung vergriffen.';
        setActionFeedback({ message: msg, isError: true });
      }
    } catch (err) {
      console.error('Failed to reorder:', err);
      setActionFeedback({
        message: isAr ? 'فشلت إعادة إضافة الطلب إلى السلة' : 'Fehler beim Übernehmen der Bestellung',
        isError: true
      });
    } finally {
      setReorderingOrderId(null);
    }
  };

  const handleStartVerify = async (type) => {
    setProfileError('');
    setOtpInput('');

    if (type === 'email') {
      setVerifyingType('email');
      try {
        await resendOtp('email');
      } catch {}
      return;
    }

    // Phone: the backend sends the code via WhatsApp.
    setVerifyingType('phone');
    setPhoneCodeSent(false);
    setVerifyingLoading(true);
    try {
      await resendOtp('phone');
      setPhoneCodeSent(true);
    } catch (err) {
      setVerifyingType(null);
      setProfileError(err.response?.data?.error || (isAr ? 'تعذر إرسال الرمز عبر واتساب' : 'Code konnte nicht per WhatsApp gesendet werden'));
    } finally {
      setVerifyingLoading(false);
    }
  };

  const handleCancelVerify = () => {
    setPhoneCodeSent(false);
    setVerifyingType(null);
    setOtpInput('');
    setProfileError('');
  };

  const handleSubmitVerifyOtp = async () => {
    if (!otpInput.trim()) return;
    try {
      setVerifyingLoading(true);
      setProfileError('');
      if (verifyingType === 'email') {
        await verifyEmail(otpInput.trim());
      } else {
        await verifyPhone(otpInput.trim());
        setPhoneCodeSent(false);
      }
      setVerifyingType(null);
      setOtpInput('');
      setSaveSuccess(
        isAr
          ? `تم تأكيد ${verifyingType === 'email' ? 'البريد' : 'الهاتف'} بنجاح!`
          : `${verifyingType === 'email' ? 'E-Mail' : 'Telefon'} erfolgreich bestätigt!`
      );
      refreshProfile();
    } catch (err) {
      setProfileError(err.response?.data?.error || (isAr ? 'رمز التحقق غير صحيح' : 'Ungültiger Code'));
    } finally {
      setVerifyingLoading(false);
    }
  };

  const handleCustomerResponse = async (orderId, action) => {
    try {
      setRespondingOrderId(orderId);
      setActionFeedback({ message: '', isError: false });
      await customerAxios.put(
        `/api/orders/${orderId}/customer-response`,
        { action }
      );
      setActionFeedback({
        message: isAr 
          ? (action === 'accept' ? 'تم تأكيد موافقتك على تعديل الطلب بنجاح! جاري تحضيره للتوصيل.' : 'تم إلغاء الطلب بناءً على طلبك.')
          : (action === 'accept' ? 'Änderung erfolgreich akzeptiert! Ihre Lieferung wird nun vorbereitet.' : 'Bestellung wurde erfolgreich storniert.'),
        isError: false
      });
      await fetchOrders();
    } catch (err) {
      console.error('Error responding to modification:', err);
      setActionFeedback({
        message: err.response?.data?.error || (isAr ? 'فشل معالجة الرد' : 'Fehler beim Bestätigen'),
        isError: true
      });
    } finally {
      setRespondingOrderId(null);
    }
  };

  const handleOpenReport = (order) => {
    setReportOrder(order);
    setShowReportModal(true);
  };

  const printReceipt = (order) => {
    if (!order) return;
    printHtmlInHiddenIframe(buildCustomerOrderReportHtml(order, { language, storeName: getStoreName(), customer }));
  };

  const getStatusBadge = (status) => <OrderStatusBadge status={status} audience="customer" />;


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-gray-100 transition-colors">
      {/* Navigation Header */}
      <AccountHeader isAr={isAr} navigate={navigate} />

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-3 xs:px-4 sm:px-6 py-4 sm:py-8">
        
        {/* Customer Welcome Header */}
        <WelcomeHeader handleStartVerify={handleStartVerify} isAr={isAr} />

        {/* Verification Modal Triggered */}
        {verifyingType && (
          <VerifyContactModal
            handleCancelVerify={handleCancelVerify}
            handleSubmitVerifyOtp={handleSubmitVerifyOtp}
            isAr={isAr}
            otpInput={otpInput}
            phoneCodeSent={phoneCodeSent}
            profileError={profileError}
            setOtpInput={setOtpInput}
            verifyingLoading={verifyingLoading}
            verifyingType={verifyingType}
          />
        )}

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-gray-800 mb-6 gap-2 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-3 px-3 sm:px-4 font-bold text-xs sm:text-sm transition border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 touch-manipulation ${
              activeTab === 'orders'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'
            }`}
          >
            <Package className="w-4 h-4 shrink-0" />
            <span>{isAr ? 'طلباتي السابقة' : 'Meine Bestellungen'}</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300">
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 px-3 sm:px-4 font-bold text-xs sm:text-sm transition border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 touch-manipulation ${
              activeTab === 'profile'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'
            }`}
          >
            <MapPin className="w-4 h-4 shrink-0" />
            <span>{isAr ? 'تعديل البيانات وعنوان التوصيل' : 'Daten & Lieferadresse'}</span>
          </button>
        </div>

        {/* TAB 1: Orders History */}
        {activeTab === 'orders' && (
          <OrdersTab
            actionFeedback={actionFeedback}
            enablingPush={enablingPush}
            getStatusBadge={getStatusBadge}
            handleCustomerResponse={handleCustomerResponse}
            handleEnablePush={handleEnablePush}
            handleOpenReport={handleOpenReport}
            handleReorderOrder={handleReorderOrder}
            isAr={isAr}
            loadingOrders={loadingOrders}
            orders={orders}
            pushStatus={pushStatus}
            reorderingOrderId={reorderingOrderId}
            respondingOrderId={respondingOrderId}
          />
        )}

        {/* TAB 2: Profile & Home Delivery Address */}
        {activeTab === 'profile' && (
          <ProfileTab
            handleProfileChange={handleProfileChange}
            handleProfileSubmit={handleProfileSubmit}
            isAr={isAr}
            profileError={profileError}
            profileForm={profileForm}
            saveSuccess={saveSuccess}
            savingProfile={savingProfile}
          />
        )}

        {/* ── Printable Order Report (Bestellbericht) Modal ── */}
        {showReportModal && reportOrder && (
          <OrderReportModal
            getStatusBadge={getStatusBadge}
            isAr={isAr}
            printReceipt={printReceipt}
            reportOrder={reportOrder}
            setShowReportModal={setShowReportModal}
          />
        )}

      </main>
    </div>
  );
};
