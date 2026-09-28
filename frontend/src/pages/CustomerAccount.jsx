import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import customerAxios from '../utils/customerAxios';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { getApiUrl } from '../utils/api';
import { printHtmlInHiddenIframe } from '../utils/printDocument';
import { buildCustomerOrderReportHtml } from '../utils/customerOrderReport';
import {
  sendPhoneVerificationCode,
  confirmPhoneVerificationCode,
  resetRecaptcha,
  isFirebasePhoneAuthConfigured
} from '../utils/firebaseClient';
import {
  Package,
  MapPin,
  AlertTriangle,
  Clock,
  Truck,
  CheckCircle2,
  XCircle
} from 'lucide-react';
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
  // Holds the Firebase confirmationResult between "send SMS code" and "confirm code"
  const [phoneConfirmationResult, setPhoneConfirmationResult] = useState(null);

  const PHONE_RECAPTCHA_CONTAINER_ID = 'firebase-phone-recaptcha-container';

  const resolvePhoneVerifyError = (err) => {
    if (err?.response?.data?.error) return err.response.data.error;
    const messages = {
      'auth/invalid-verification-code': isAr ? 'رمز التحقق غير صحيح' : 'Ungültiger Verifizierungscode',
      'auth/code-expired': isAr ? 'انتهت صلاحية الرمز، يرجى طلب رمز جديد' : 'Der Code ist abgelaufen, bitte fordern Sie einen neuen an',
      'auth/too-many-requests': isAr ? 'محاولات كثيرة جداً، حاول لاحقاً' : 'Zu viele Versuche, bitte später erneut versuchen',
      'auth/invalid-phone-number': isAr ? 'رقم الهاتف غير صالح' : 'Ungültige Telefonnummer',
      'auth/missing-phone-number': isAr ? 'رقم الهاتف مفقود' : 'Telefonnummer fehlt',
      'auth/captcha-check-failed': isAr ? 'فشل التحقق الأمني، حاول مرة أخرى' : 'Sicherheitsprüfung fehlgeschlagen, bitte erneut versuchen',
      'auth/quota-exceeded': isAr ? 'تم تجاوز الحد المسموح للرسائل، حاول لاحقاً' : 'SMS-Kontingent überschritten, bitte später erneut versuchen',
      'auth/operation-not-allowed': isAr ? 'التحقق من الهاتف غير مفعّل حالياً، يرجى المحاولة لاحقاً' : 'Telefonverifizierung ist derzeit nicht verfügbar, bitte später erneut versuchen'
    };
    return messages[err?.code] || err?.message || (isAr ? 'حدث خطأ أثناء التحقق من الهاتف' : 'Fehler bei der Telefonverifizierung');
  };

  useEffect(() => {
    if (authLoading) return; // wait for the initial session check to resolve
    if (!customer) {
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
  }, [authLoading, Boolean(customer)]);

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

  const fetchOrders = async (silent = false) => {
    try {
      if (!silent) setLoadingOrders(true);
      const apiUrl = getApiUrl();
      const res = await customerAxios.get(`${apiUrl}/api/orders/my-orders`);
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (err.response?.status !== 401) {
        console.error('Failed to load customer orders:', err);
      }
    } finally {
      if (!silent) setLoadingOrders(false);
    }
  };

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
      const apiUrl = getApiUrl();
      // The public catalog route — /api/products itself is admin-only.
      const catalogRes = await customerAxios.get(`${apiUrl}/api/products/catalog`);
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

    // Phone: Firebase sends the SMS directly to the customer's phone (no
    // backend call needed for this step) via an invisible reCAPTCHA check.
    if (!isFirebasePhoneAuthConfigured()) {
      setProfileError(isAr ? 'Telefonverifizierung ist derzeit nicht verfügbar.' : 'Telefonverifizierung ist derzeit nicht verfügbar.');
      return;
    }
    setVerifyingType('phone');
    setVerifyingLoading(true);
    try {
      const confirmation = await sendPhoneVerificationCode(customer.phone, PHONE_RECAPTCHA_CONTAINER_ID);
      setPhoneConfirmationResult(confirmation);
    } catch (err) {
      console.error('Firebase phone send error:', err);
      setVerifyingType(null);
      setProfileError(resolvePhoneVerifyError(err));
      resetRecaptcha();
    } finally {
      setVerifyingLoading(false);
    }
  };

  const handleCancelVerify = () => {
    if (verifyingType === 'phone') {
      resetRecaptcha();
      setPhoneConfirmationResult(null);
    }
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
        if (!phoneConfirmationResult) {
          throw new Error(isAr ? 'يرجى طلب رمز جديد.' : 'Bitte fordern Sie einen neuen Code an.');
        }
        const idToken = await confirmPhoneVerificationCode(phoneConfirmationResult, otpInput.trim());
        await verifyPhone(idToken);
        setPhoneConfirmationResult(null);
        resetRecaptcha();
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
      setProfileError(
        verifyingType === 'phone'
          ? resolvePhoneVerifyError(err)
          : (err.response?.data?.error || (isAr ? 'رمز التحقق غير صحيح' : 'Ungültiger Code'))
      );
    } finally {
      setVerifyingLoading(false);
    }
  };

  const handleCustomerResponse = async (orderId, action) => {
    try {
      setRespondingOrderId(orderId);
      setActionFeedback({ message: '', isError: false });
      const apiUrl = getApiUrl();
      await customerAxios.put(
        `${apiUrl}/api/orders/${orderId}/customer-response`,
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

  const getStatusBadge = (status) => {
    const normalized = (status || '').toLowerCase();
    switch (normalized) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-850">
            <Clock className="w-3.5 h-3.5" />
            {isAr ? 'قيد المراجعة والتحضير' : 'In Bearbeitung'}
          </span>
        );
      case 'pending_customer_approval':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-400 dark:border-amber-700 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            {isAr ? 'تعديل يتطلب موافقتك' : 'Änderung prüfen & bestätigen'}
          </span>
        );
      case 'confirmed':
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-850">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isAr ? 'تم تأكيد الطلب' : 'Bestätigt'}
          </span>
        );
      case 'out_for_delivery':
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-850 animate-pulse">
            <Truck className="w-3.5 h-3.5" />
            {isAr ? 'جاري التوصيل للمنزل' : 'In Zustellung'}
          </span>
        );
      case 'delivered':
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-850">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isAr ? 'تم التوصيل بنجاح' : 'Zugestellt'}
          </span>
        );
      case 'declined':
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-850">
            <XCircle className="w-3.5 h-3.5" />
            {isAr ? 'ملغي / مرفوض' : 'Storniert'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-gray-100 transition-colors">
      {/* Invisible reCAPTCHA host for Firebase Phone Auth; must stay mounted
          whenever a phone-verification attempt could start */}
      <div id={PHONE_RECAPTCHA_CONTAINER_ID} />
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
            phoneConfirmationResult={phoneConfirmationResult}
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
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
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
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
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
