import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import customerAxios from '../utils/customerAxios';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { LanguageSelector } from '../components/LanguageSelector';
import { ThemeToggle } from '../components/ThemeToggle';
import { OrderProgressTimeline } from '../components/OrderProgressTimeline';
import { getApiUrl } from '../utils/api';
import { formatDeliverySlot } from '../utils/deliverySlot';
import { strongPasswordHint } from '../utils/validation';
import { isPushSupported, enablePushNotifications, getPushSubscriptionStatus } from '../utils/pushNotifications';
import {
  sendPhoneVerificationCode,
  confirmPhoneVerificationCode,
  resetRecaptcha,
  isFirebasePhoneAuthConfigured
} from '../utils/firebaseClient';
import {
  User, 
  Package, 
  MapPin, 
  Phone, 
  Mail, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  LogOut, 
  Save, 
  ShoppingBag,
  RotateCcw,
  Sparkles,
  Lock,
  Calendar,
  Printer,
  FileText,
  Tag,
  X,
  Navigation,
  Bell,
  BellOff
} from 'lucide-react';

export const CustomerAccount = () => {
  const { customer, loading: authLoading, logout, updateProfile, verifyEmail, verifyPhone, resendOtp, refreshProfile } = useCustomerAuth();
  const { t, direction, language } = useLanguage();
  const { getStoreName } = useStoreSettings();
  const navigate = useNavigate();

  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'profile'
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Push notification opt-in ('checking' | 'not-subscribed' | 'subscribed' | 'denied' | 'unsupported')
  const [pushStatus, setPushStatus] = useState('checking');
  const [enablingPush, setEnablingPush] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) {
      setPushStatus('unsupported');
      return;
    }
    getPushSubscriptionStatus().then(setPushStatus);
  }, []);

  const handleEnablePush = async () => {
    setEnablingPush(true);
    const result = await enablePushNotifications();
    setPushStatus(result === 'granted' ? 'subscribed' : result);
    setEnablingPush(false);
  };

  // Modification response & Order Report Modal state
  const [reportOrder, setReportOrder] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [respondingOrderId, setRespondingOrderId] = useState(null);
  const [actionFeedback, setActionFeedback] = useState({ message: '', isError: false });

  const reportDeliveryFee = reportOrder
    ? Math.max(0, Number(reportOrder.totalAmount) - (reportOrder.orderItems || []).reduce(
        (sum, item) => sum + Number(item.subtotal ?? item.price * item.quantity), 0
      ))
    : 0;

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
      setProfileForm(prev => ({ ...prev, password: '', currentPassword: '' }));
      setSaveSuccess(isAr ? 'تم تحديث بياناتك بنجاح!' : 'Profildaten erfolgreich aktualisiert!');
    } catch (err) {
      console.error('Update profile error:', err);
      setProfileError(err.response?.data?.error || (isAr ? 'فشل تحديث البيانات' : 'Fehler beim Speichern'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleStartVerify = async (type) => {
    setProfileError('');
    setOtpInput('');

    if (type === 'email') {
      setVerifyingType('email');
      try {
        await resendOtp('email');
      } catch (err) {}
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
    const isArabic = language === 'ar';
    const dir = isArabic ? 'rtl' : 'ltr';
    const storeName = getStoreName();
    const itemsSubtotal = Number(order.itemsSubtotal) || (order.orderItems || []).reduce(
      (sum, item) => sum + Number(item.subtotal ?? item.price * item.quantity), 0
    );
    const promotionDiscount = Number(order.promotionDiscount || 0);
    const couponDiscount = Number(order.couponDiscount || 0);
    const deliveryFeeCharged = Number(order.deliveryFee ?? Math.max(0, Number(order.totalAmount) - (itemsSubtotal - promotionDiscount - couponDiscount)));

    const escapeHtml = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const itemsHtml = (order.orderItems || []).map((item, idx) => {
      const rawName = (isArabic ? item.product?.nameAr : item.product?.nameDe) || item.product?.name || item.productId;
      const name = escapeHtml(rawName);
      const sku = escapeHtml(item.product?.sku || '—');
      const subtotal = Number(item.subtotal || item.price * item.quantity);
      const unitPrice = item.quantity > 0 ? subtotal / item.quantity : 0;
      return `
        <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
          <td style="padding: 9px 12px; font-weight: 600;">
            ${name}
            ${sku !== '—' ? `<span style="display:block;font-size:10px;color:#94a3b8;font-family:monospace;">Art.-Nr. ${sku}</span>` : ''}
          </td>
          <td style="padding: 9px 8px; text-align: center; font-weight: 700;">${item.quantity}×</td>
          <td style="padding: 9px 8px; text-align: ${isArabic ? 'left' : 'right'}; font-family: monospace;">€${unitPrice.toFixed(2)}</td>
          <td style="padding: 9px 12px; text-align: ${isArabic ? 'left' : 'right'}; font-family: monospace; font-weight: 800;">€${subtotal.toFixed(2)}</td>
        </tr>`;
    }).join('');

    const statusMap = {
      pending:                   { de: 'Eingegangen', ar: 'قيد المراجعة' },
      accepted:                  { de: 'Bestätigt & In Vorbereitung', ar: 'تم تأكيد الطلب' },
      preparing:                 { de: 'In Vorbereitung', ar: 'جاري التجهيز' },
      out_for_delivery:          { de: 'Unterwegs zur Haustür', ar: 'في طريق التوصيل' },
      shipped:                   { de: 'Versendet', ar: 'تم الشحن' },
      delivered:                 { de: 'Zugestellt', ar: 'تم التوصيل' },
      declined:                  { de: 'Storniert', ar: 'ملغي' },
      cancelled:                 { de: 'Storniert', ar: 'ملغي' },
      pending_customer_approval: { de: 'Änderung offen', ar: 'بانتظار الموافقة' }
    };

    const statusText = (statusMap[order.status?.toLowerCase()] || {})[isArabic ? 'ar' : 'de'] || order.status;
    const orderNum = order.id.slice(0, 8).toUpperCase();
    const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString(isArabic ? 'ar-EG' : 'de-DE', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '';

    const html = `<!DOCTYPE html>
<html lang="${language}" dir="${dir}">
<head>
  <meta charset="UTF-8"/>
  <title>Bestellbericht – #${orderNum}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: ${isArabic ? "'Noto Sans Arabic', Arial, sans-serif" : "Arial, sans-serif"}; font-size: 12px; color: #1e293b; background: #fff; direction: ${dir}; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 2px solid #16a34a; margin-bottom: 16px; }
    .brand { font-size: 20px; font-weight: 800; color: #166534; }
    .brand-sub { color: #64748b; font-size: 11px; margin-top: 3px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; }
    .meta-box h4 { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
    .meta-box p { font-size: 12px; line-height: 1.6; color: #1e293b; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; border-radius: 8px; overflow: hidden; }
    thead tr { background: #166534; color: #fff; }
    thead th { padding: 9px 12px; font-size: 11px; font-weight: 700; text-align: ${isArabic ? 'right' : 'left'}; }
    thead th.center { text-align: center; }
    thead th.end { text-align: ${isArabic ? 'left' : 'right'}; }
    .totals { display: flex; justify-content: flex-end; margin-top: 10px; }
    .totals-box { width: 260px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; font-size: 12px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 12px; }
    .totals-row:not(:last-child) { border-bottom: 1px solid #f1f5f9; }
    .totals-row.total { background: #166534; color: #fff; font-weight: 800; font-size: 14px; }
    .footer-note { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8; }
    @media print {
      body { padding: 0; }
      @page { size: A4 portrait; margin: 12mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">${escapeHtml(storeName)}</div>
      <div class="brand-sub">${isArabic ? 'خدمة التوصيل المنزلي السريع' : 'Lieferservice &amp; Hauszustellung'}</div>
      <div class="brand-sub" style="margin-top: 4px; font-weight: 700;">${isArabic ? 'تقرير الطلب الرسمي' : 'Offizieller Bestellbericht'} #${orderNum}</div>
    </div>
    <div style="text-align: ${isArabic ? 'left' : 'right'};">
      <div class="badge">${escapeHtml(statusText)}</div>
      <div style="color: #64748b; font-size: 11px; margin-top: 6px;">${orderDate}</div>
      <div style="color: #16a34a; font-weight: 700; font-size: 11px; margin-top: 2px;">${isArabic ? 'الدفع عند الاستلام' : 'Barzahlung bei Lieferung'}</div>
    </div>
  </div>

  <div class="meta">
    <div class="meta-box">
      <h4>${isArabic ? 'بيانات العميل' : 'Kunde'}</h4>
      <p><strong>${escapeHtml(order.customerName || order.customer?.name || customer?.name || '—')}</strong></p>
      ${(order.customerPhone || customer?.phone) ? `<p>Tel: ${escapeHtml(order.customerPhone || customer?.phone)}</p>` : ''}
      ${(order.customerEmail || customer?.email) ? `<p>E-Mail: ${escapeHtml(order.customerEmail || customer?.email)}</p>` : ''}
    </div>
    <div class="meta-box">
      <h4>${isArabic ? 'عنوان التسليم والتعليمات' : 'Lieferadresse &amp; Hinweise'}</h4>
      <p>${escapeHtml(order.deliveryAddress || '—')}</p>
      ${order.deliverySlot && formatDeliverySlot(order.deliverySlot, isArabic) ? `<p style="margin-top:4px;"><strong>${isArabic ? 'موعد التوصيل:' : 'Lieferzeitfenster:'}</strong> ${escapeHtml(formatDeliverySlot(order.deliverySlot, isArabic))}</p>` : ''}
      ${order.deliveryNotes ? `<p style="font-style:italic;color:#475569;margin-top:4px;"><strong>${isArabic ? 'ملاحظة:' : 'Hinweis:'}</strong> ${escapeHtml(order.deliveryNotes)}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>${isArabic ? 'المنتج' : 'Artikel'}</th>
        <th class="center">${isArabic ? 'الكمية' : 'Menge'}</th>
        <th class="end">${isArabic ? 'سعر الوحدة' : 'Einzelpreis'}</th>
        <th class="end">${isArabic ? 'الإجمالي' : 'Gesamt'}</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      ${itemsSubtotal > 0 && (promotionDiscount > 0 || couponDiscount > 0) ? `
      <div class="totals-row">
        <span>${isArabic ? 'المجموع الفرعي:' : 'Zwischensumme:'}</span>
        <span style="font-family: monospace;">€${itemsSubtotal.toFixed(2)}</span>
      </div>` : ''}
      ${promotionDiscount > 0 ? `
      <div class="totals-row" style="color:#e11d48">
        <span>${isArabic ? 'خصم العروض:' : 'Aktionsrabatt:'}</span>
        <span style="font-family: monospace;">-€${promotionDiscount.toFixed(2)}</span>
      </div>` : ''}
      ${couponDiscount > 0 ? `
      <div class="totals-row" style="color:#7c3aed">
        <span>${isArabic ? 'كوبون الخصم:' : 'Gutschein:'} ${order.couponCode ? `(${escapeHtml(order.couponCode)})` : ''}</span>
        <span style="font-family: monospace;">-€${couponDiscount.toFixed(2)}</span>
      </div>` : ''}
      <div class="totals-row">
        <span>${isArabic ? 'رسوم التوصيل:' : 'Liefergebühr:'}</span>
        <strong style="color:#16a34a;">${deliveryFeeCharged > 0 ? `€${deliveryFeeCharged.toFixed(2)}` : (isArabic ? 'مجاناً (0.00 €)' : 'Kostenlos (0,00 €)')}</strong>
      </div>
      <div class="totals-row total">
        <span>${isArabic ? 'المجموع عند الاستلام:' : 'Gesamtbetrag:'}</span>
        <span>€${Number(order.totalAmount).toFixed(2)}</span>
      </div>
    </div>
  </div>

  <div class="footer-note">
    ${isArabic 
      ? `تم إصدار هذا التقرير تلقائياً من ${escapeHtml(storeName)} كإيصال رسمي للطلب والتوصيل.`
      : `Dieser Beleg wurde automatisch von ${escapeHtml(storeName)} als offizieller Bestell- &amp; Lieferschein erstellt.`}
  </div>
</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;visibility:hidden';
    document.body.appendChild(iframe);
    iframe.contentDocument.open();
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();
    iframe.contentWindow.onafterprint = () => {
      try { document.body.removeChild(iframe); } catch {}
    };
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 300);
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
      <header className="px-3 xs:px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-slate-200/80 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-30">
        <Link to="/" className="flex items-center gap-1.5 sm:gap-3 group min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-105 transition">
            <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <span className="font-extrabold text-xs sm:text-base md:text-lg text-slate-900 dark:text-white block leading-tight truncate max-w-[110px] xs:max-w-[160px] sm:max-w-none">
              {getStoreName()}
            </span>
            <span className="text-[9px] xs:text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 block truncate">
              {isAr ? 'حساب العميل والطلبات' : 'Kundenkonto & Bestellungen'}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <Link
            to="/"
            className="hidden sm:flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs transition"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{isAr ? 'متابعة التسوق' : 'Zum Shop'}</span>
          </Link>
          <LanguageSelector />
          <ThemeToggle />
          <button
            onClick={() => { logout(); navigate('/customer/login'); }}
            className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition cursor-pointer touch-manipulation"
            title={isAr ? 'تسجيل الخروج' : 'Abmelden'}
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-3 xs:px-4 sm:px-6 py-4 sm:py-8">
        
        {/* Customer Welcome Header */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-800 p-4 sm:p-6 md:p-8 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl sm:text-2xl shadow-lg shadow-emerald-600/20">
              {customer?.name?.charAt(0)?.toUpperCase() || 'C'}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white truncate">
                {customer?.name || (isAr ? 'عزيزي العميل' : 'Kunde')}
              </h1>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                {/* Email badge */}
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${customer?.emailVerified ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200'}`}>
                  <Mail className="w-3.5 h-3.5" />
                  <span>{customer?.email}</span>
                  {customer?.emailVerified ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <button
                      onClick={() => handleStartVerify('email')}
                      className="underline font-bold text-amber-800 hover:text-amber-900 ms-1 cursor-pointer"
                    >
                      {isAr ? 'تحقق الآن' : 'Bestätigen'}
                    </button>
                  )}
                </span>

                {/* Phone badge */}
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${customer?.phoneVerified ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200'}`}>
                  <Phone className="w-3.5 h-3.5" />
                  <span>{customer?.phone}</span>
                  {customer?.phoneVerified ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <>
                      <button
                        onClick={() => handleStartVerify('phone')}
                        className="underline font-bold text-amber-800 hover:text-amber-900 ms-1 cursor-pointer"
                      >
                        {isAr ? 'تحقق الآن' : 'Bestätigen'}
                      </button>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center w-full md:w-auto">
            <Link
              to="/"
              className="w-full md:w-auto px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 touch-manipulation"
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span>{isAr ? 'طلب جديد للتوصيل' : 'Neue Bestellung aufgeben'}</span>
            </Link>
          </div>
        </div>

        {/* Verification Modal Triggered */}
        {verifyingType && (
          <div className="mb-6 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 shadow-sm">
            <div className="flex items-center justify-between mb-3 gap-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" />
                <span>
                  {isAr 
                    ? `إدخال رمز التحقق لـ ${verifyingType === 'email' ? 'البريد الإلكتروني' : 'رقم الهاتف'}` 
                    : `Verifizierungscode für ${verifyingType === 'email' ? 'E-Mail' : 'Telefon'} eingeben`}
                </span>
              </h3>
              <button
                onClick={handleCancelVerify}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer touch-manipulation"
              >
                {isAr ? 'إلغاء' : 'Abbrechen'}
              </button>
            </div>

            {profileError && (
              <div className="text-xs bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 px-3 py-1.5 rounded-lg mb-3">
                {profileError}
              </div>
            )}

            {verifyingType === 'phone' && !phoneConfirmationResult ? (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {verifyingLoading
                  ? (isAr ? 'جارٍ إرسال رمز عبر الرسائل القصيرة...' : 'SMS-Code wird gesendet...')
                  : (isAr ? 'تعذر إرسال الرمز.' : 'Code konnte nicht gesendet werden.')}
              </p>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="123456"
                  className="w-full sm:w-48 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-700 font-mono tracking-widest text-center font-bold text-base outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={handleSubmitVerifyOtp}
                  disabled={verifyingLoading || otpInput.length < 6}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 touch-manipulation"
                >
                  {verifyingLoading ? '...' : (isAr ? 'تأكيد الرمز' : 'Code bestätigen')}
                </button>
              </div>
            )}
          </div>
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
          <div className="space-y-4">
            {/* Push Notification Opt-in Banner */}
            {pushStatus === 'not-subscribed' && (
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 text-blue-800 dark:text-blue-200 text-xs sm:text-sm">
                  <Bell className="w-4 h-4 shrink-0" />
                  <span>{isAr ? 'فعّل الإشعارات لتصلك تحديثات حالة طلبك فور حدوثها' : 'Aktivieren Sie Benachrichtigungen, um Bestellstatus-Updates sofort zu erhalten'}</span>
                </div>
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={enablingPush}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0 cursor-pointer disabled:opacity-50 touch-manipulation"
                >
                  {enablingPush ? '...' : (isAr ? 'تفعيل' : 'Aktivieren')}
                </button>
              </div>
            )}
            {pushStatus === 'denied' && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800 flex items-center gap-2.5 text-slate-500 dark:text-gray-400 text-xs">
                <BellOff className="w-4 h-4 shrink-0" />
                <span>{isAr ? 'تم رفض إذن الإشعارات من إعدادات المتصفح' : 'Benachrichtigungen wurden in den Browser-Einstellungen blockiert'}</span>
              </div>
            )}

            {/* Action Feedback Banner */}
            {actionFeedback.message && (
              <div className={`p-4 rounded-2xl text-xs sm:text-sm flex items-start gap-3 ${actionFeedback.isError ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200 border border-rose-300' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-300'}`}>
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="font-semibold">{actionFeedback.message}</span>
              </div>
            )}

            {loadingOrders ? (
              <div className="py-12 text-center text-slate-400">
                <div className="w-8 h-8 mx-auto border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
                <p className="text-xs">{isAr ? 'جارٍ تحميل الطلبات...' : 'Bestellungen werden geladen...'}</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 p-12 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 mb-4">
                  <ShoppingBag className="w-8 h-8 opacity-75" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                  {isAr ? 'لا توجد طلبات سابقة حتى الآن' : 'Noch keine Bestellungen aufgegeben'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                  {isAr 
                    ? 'تصفح قائمة المنتجات واطلب التوصيل إلى باب منزلك مع الدفع نقداً أو بالبطاقة عند الاستلام.' 
                    : 'Stöbern Sie durch unsere Produkte und bestellen Sie bequem nach Hause.'}
                </p>
                <Link
                  to="/"
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{isAr ? 'تصفح المنتجات الآن' : 'Jetzt einkaufen'}</span>
                </Link>
              </div>
            ) : (
              orders.map((order) => {
                const isPendingApproval = order.status === 'pending_customer_approval';

                return (
                  <div
                    key={order.id}
                    className={`bg-white dark:bg-gray-900 rounded-3xl border p-5 sm:p-6 shadow-sm transition hover:shadow-md ${isPendingApproval ? 'border-amber-400 dark:border-amber-700 ring-2 ring-amber-400/20' : 'border-slate-200/80 dark:border-gray-800'}`}
                  >
                    {/* Pending Approval Customer Alert Banner */}
                    {isPendingApproval && (
                      <div className="mb-5 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-xs sm:text-sm space-y-3">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm sm:text-base">
                              {isAr ? 'تعديل في الطلب بسبب عدم توفر بعض المنتجات' : 'Bestelländerung durch Supermarkt (Artikel nicht vorrätig)'}
                            </h4>
                            <p className="text-amber-800 dark:text-amber-300 mt-1 text-xs leading-relaxed">
                              {isAr 
                                ? 'نعتذر، لم تكن بعض المنتجات متوفرة وتم تعديل الطلب. يرجى مراجعة القائمة والموافقة على التعديل للمتابعة في التوصيل:'
                                : 'Einzelne Artikel waren leider vergriffen. Die Bestellung wurde angepasst. Bitte prüfen und bestätigen Sie die Änderung:'}
                            </p>
                            {order.modificationReason && (
                              <div className="mt-2 p-2.5 bg-white/80 dark:bg-gray-900/80 rounded-xl border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs font-medium">
                                <strong>{isAr ? 'ملاحظة المتجر:' : 'Hinweis der Filiale:'}</strong> {order.modificationReason}
                              </div>
                            )}
                            {order.originalTotalAmount && (
                              <div className="mt-2 flex items-center gap-3 text-xs flex-wrap">
                                <span className="text-slate-500">{isAr ? 'المبلغ الأصلي:' : 'Vorheriger Betrag:'} <del className="font-mono">€{Number(order.originalTotalAmount).toFixed(2)}</del></span>
                                <span className="font-bold text-emerald-700 dark:text-emerald-300">{isAr ? 'المبلغ الجديد المطلوب:' : 'Neuer Betrag:'} <span className="font-mono text-sm">€{Number(order.totalAmount).toFixed(2)}</span></span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Customer Decision Buttons */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-amber-200 dark:border-amber-800/60">
                          <button
                            type="button"
                            onClick={() => handleCustomerResponse(order.id, 'accept')}
                            disabled={respondingOrderId === order.id}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
                          >
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>{isAr ? 'قبول التعديل ومتابعة التوصيل' : 'Änderung akzeptieren & liefern'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(isAr ? 'هل أنت متأكد من رغبتك في إلغاء هذا الطلب بالكامل؟' : 'Möchten Sie diese Bestellung wirklich stornieren?')) {
                                handleCustomerResponse(order.id, 'decline');
                              }
                            }}
                            disabled={respondingOrderId === order.id}
                            className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-900/60 transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
                          >
                            <XCircle className="w-4 h-4 shrink-0" />
                            <span>{isAr ? 'إلغاء الطلب بالكامل' : 'Bestellung stornieren'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Order Top Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-gray-800 gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2 truncate">
                            <span>{isAr ? 'طلب رقم' : 'Bestellung'} #{order.id.slice(0, 8).toUpperCase()}</span>
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{new Date(order.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'de-DE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 sm:gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-50 dark:border-gray-800/50">
                        {Number(order.promotionDiscount) > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[11px] font-bold border border-rose-200/80 dark:border-rose-900/50">
                            <Sparkles className="w-3 h-3 text-rose-500" />
                            <span>{isAr ? 'عروض' : 'Aktion'}: -€{Number(order.promotionDiscount).toFixed(2)}</span>
                          </span>
                        )}
                        {Number(order.couponDiscount) > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[11px] font-bold border border-purple-200/80 dark:border-purple-900/50">
                            <Tag className="w-3 h-3 text-purple-500" />
                            <span>{order.couponCode || (isAr ? 'كوبون' : 'Gutschein')}: -€{Number(order.couponDiscount).toFixed(2)}</span>
                          </span>
                        )}
                        {getStatusBadge(order.status)}
                        <div className="text-end">
                          <div className="text-xs text-slate-400">{isAr ? 'الإجمالي' : 'Gesamt'}</div>
                          <div className="font-extrabold text-base sm:text-lg text-emerald-600 dark:text-emerald-400 font-mono">
                            €{Number(order.totalAmount).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Live Progress Timeline */}
                    {!isPendingApproval && (
                      <OrderProgressTimeline status={order.status} language={language} />
                    )}

                    {/* Delivery Details Snapshot */}
                    <div className="py-3 text-xs text-slate-600 dark:text-gray-300 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 dark:bg-gray-950 p-3 rounded-2xl my-3">
                      <div>
                        <strong className="block text-slate-400 text-[11px] uppercase tracking-wider">{isAr ? 'عنوان التوصيل' : 'Lieferadresse'}</strong>
                        <span className="font-medium break-words">{order.deliveryAddress || 'Adresse'}</span>
                      </div>
                      {order.deliverySlot && formatDeliverySlot(order.deliverySlot, isAr) && (
                        <div>
                          <strong className="block text-slate-400 text-[11px] uppercase tracking-wider flex items-center gap-1">
                            <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>{isAr ? 'موعد التوصيل' : 'Liefer-Zeitfenster'}</span>
                          </strong>
                          <span className="font-bold text-emerald-700 dark:text-emerald-300">
                            {formatDeliverySlot(order.deliverySlot, isAr)}
                          </span>
                        </div>
                      )}
                      {order.deliveryDistanceKm != null && Number(order.deliveryDistanceKm) > 0 && (
                        <div>
                          <strong className="block text-slate-400 text-[11px] uppercase tracking-wider flex items-center gap-1">
                            <Navigation className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>{isAr ? 'المسافة والتوصيل' : 'Distanz & Lieferung'}</span>
                          </strong>
                          <span className="font-semibold text-slate-700 dark:text-gray-300">
                            ~{order.deliveryDistanceKm} km {Number(order.deliveryFee) > 0 ? `(€${Number(order.deliveryFee).toFixed(2)})` : `(${isAr ? 'مجاناً' : 'Kostenlos'})`}
                          </span>
                        </div>
                      )}
                      <div>
                        <strong className="block text-slate-400 text-[11px] uppercase tracking-wider">{isAr ? 'طريقة الدفع' : 'Zahlung'}</strong>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {isAr ? 'الدفع عند الاستلام (نقداً أو بالبطاقة)' : 'Barzahlung / Kartenzahlung an der Haustür'}
                        </span>
                      </div>
                      {order.deliveryNotes && (
                        <div className="sm:col-span-2">
                          <strong className="block text-slate-400 text-[11px] uppercase tracking-wider">{isAr ? 'ملاحظة السائق' : 'Lieferhinweis'}</strong>
                          <span className="italic break-words">{order.deliveryNotes}</span>
                        </div>
                      )}
                    </div>

                    {/* Ordered Items List */}
                    <div className="space-y-2 pt-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {isAr ? 'المنتجات المطلوبة:' : 'Bestellte Artikel:'}
                      </span>
                      <div className="divide-y divide-slate-100 dark:divide-gray-800">
                        {(order.orderItems || []).map((item) => (
                          <div key={item.id} className="py-2 flex items-center justify-between text-xs sm:text-sm gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-6 h-6 shrink-0 rounded-lg bg-slate-100 dark:bg-gray-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-gray-300">
                                {item.quantity}x
                              </span>
                              <span className="font-medium text-slate-800 dark:text-gray-200 truncate">
                                {language === 'ar' && item.product?.nameAr ? item.product.nameAr : item.product?.name}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0">
                              €{Number(item.subtotal || item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer Actions: Print/View Order Report */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-gray-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleOpenReport(order)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 text-xs font-semibold transition cursor-pointer touch-manipulation"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{isAr ? 'عرض تقرير الطلب الرسمي (طباعة)' : 'Bestellbericht anzeigen / drucken'}</span>
                      </button>

                      <span className="text-[11px] text-slate-400 text-center sm:text-end">
                        {order.orderItems?.length || 0} {isAr ? 'منتجات' : 'Positionen'}
                      </span>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: Profile & Home Delivery Address */}
        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-800 p-4 sm:p-6 md:p-10 shadow-sm">
            
            <div className="mb-6">
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" />
                <span>{isAr ? 'تعديل البيانات وعنوان التوصيل' : 'Profil & Lieferadresse bearbeiten'}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                {isAr 
                  ? 'يمكنك تغيير اسمك أو رقم هاتفك أو بريدك وعنوان التوصيل المعتمد لطلباتك القادمة.' 
                  : 'Hier können Sie Ihre persönlichen Daten und die Standardadresse für Lieferungen ändern.'}
              </p>
            </div>

            {profileError && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{profileError}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{saveSuccess}</span>
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-6">
              {/* Contact Data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    {isAr ? 'الاسم الكامل' : 'Vollständiger Name'}
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileChange}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>{isAr ? 'رقم الهاتف' : 'Telefonnummer'}</span>
                    {customer?.phoneVerified ? (
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {isAr ? 'مؤكد' : 'Verifiziert'}
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-600 font-bold">
                        {isAr ? 'غير مؤكد' : 'Nicht verifiziert'}
                      </span>
                    )}
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={profileForm.phone}
                    onChange={handleProfileChange}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>{isAr ? 'البريد الإلكتروني' : 'E-Mail-Adresse'}</span>
                    {customer?.emailVerified ? (
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {isAr ? 'مؤكد' : 'Verifiziert'}
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-600 font-bold">
                        {isAr ? 'غير مؤكد (مطلوب للطلب)' : 'Nicht verifiziert (für Bestellung nötig)'}
                      </span>
                    )}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={profileForm.email}
                    onChange={handleProfileChange}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    {isAr ? 'تغيير كلمة المرور (اختياري)' : 'Neues Passwort (optional)'}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={profileForm.password}
                    onChange={handleProfileChange}
                    placeholder={isAr ? 'اتركه فارغاً للإبقاء على الحالية' : 'Leer lassen, um beizubehalten'}
                    minLength={8}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {profileForm.password && (
                    <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">
                      {strongPasswordHint(isAr)}
                    </p>
                  )}
                </div>

                {(Boolean(profileForm.password) || profileForm.email !== (customer?.email || '') || profileForm.phone !== (customer?.phone || '')) && (
                  <div className="sm:col-span-2 p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 transition-all">
                    <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span>{isAr ? 'كلمة المرور الحالية (لتأكيد الهوية)' : 'Aktuelles Passwort (Sicherheitsbestätigung)'}</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={profileForm.currentPassword || ''}
                      onChange={handleProfileChange}
                      required
                      placeholder={isAr ? 'أدخل كلمة المرور الحالية لتأكيد التغييرات' : 'Aktuelles Passwort eingeben, um Änderungen zu bestätigen'}
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
                      {isAr ? 'مطلوبة لتأكيد تغيير كلمة المرور أو البريد الإلكتروني أو رقم الهاتف.' : 'Erforderlich zur Bestätigung von Passwort-, E-Mail- oder Telefonänderungen.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Delivery Address Section */}
              <div className="pt-4 border-t border-slate-100 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {isAr ? 'عنوان التوصيل المعتمد للمنزل' : 'Standard-Lieferadresse'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">
                      {isAr ? 'اسم الشارع' : 'Straße'}
                    </label>
                    <input
                      type="text"
                      name="street"
                      value={profileForm.street}
                      onChange={handleProfileChange}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">
                      {isAr ? 'رقم المنزل' : 'Hausnummer'}
                    </label>
                    <input
                      type="text"
                      name="houseNumber"
                      value={profileForm.houseNumber}
                      onChange={handleProfileChange}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">
                      {isAr ? 'الرمز البريدي (PLZ)' : 'Postleitzahl'}
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      value={profileForm.postalCode}
                      onChange={handleProfileChange}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">
                      {isAr ? 'المدينة' : 'Stadt'}
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={profileForm.city}
                      onChange={handleProfileChange}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">
                      {isAr ? 'الطابق / رقم الشقة' : 'Stock / Tür'}
                    </label>
                    <input
                      type="text"
                      name="floorApartment"
                      value={profileForm.floorApartment}
                      onChange={handleProfileChange}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">
                      {isAr ? 'ملاحظات للسائق (اختياري)' : 'Lieferhinweis für den Fahrer'}
                    </label>
                    <input
                      type="text"
                      name="deliveryNotes"
                      value={profileForm.deliveryNotes}
                      onChange={handleProfileChange}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 touch-manipulation"
                >
                  <Save className="w-4 h-4 shrink-0" />
                  <span>{savingProfile ? (isAr ? 'جارٍ الحفظ...' : 'Wird gespeichert...') : (isAr ? 'حفظ التعديلات' : 'Änderungen speichern')}</span>
                </button>
              </div>

            </form>
          </div>
        )}

        {/* ── Printable Order Report (Bestellbericht) Modal ── */}
        {showReportModal && reportOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
            <div className="relative w-full max-w-2xl max-h-[90dvh] overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-gray-800 p-4 sm:p-6 md:p-8 my-auto text-slate-900 dark:text-gray-100">
              {/* Modal Top Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-gray-800 mb-4 sm:mb-6 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white truncate">
                      {isAr ? 'تقرير الطلب الرسمي وإيصال التوصيل' : 'Offizieller Bestellbericht & Lieferschein'}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono truncate">
                      #{reportOrder.id.slice(0, 8).toUpperCase()} &bull; {getStoreName()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => printReceipt(reportOrder)}
                    className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition cursor-pointer touch-manipulation"
                  >
                    <Printer className="w-4 h-4 shrink-0" />
                    <span>{isAr ? 'طباعة' : 'Drucken'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 transition cursor-pointer touch-manipulation"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Body Content */}
              <div className="space-y-4 sm:space-y-6 text-xs sm:text-sm">
                {/* Meta details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-gray-950 border border-slate-200/80 dark:border-gray-800">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {isAr ? 'بيانات المستلم والتوصيل:' : 'Empfänger & Adresse:'}
                    </span>
                    <p className="font-bold text-slate-900 dark:text-white break-words">{reportOrder.customerName || reportOrder.customer?.name || customer?.name}</p>
                    <p className="text-slate-600 dark:text-gray-300 font-mono mt-0.5 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{reportOrder.customerPhone || customer?.phone}</span>
                    </p>
                    <p className="text-slate-600 dark:text-gray-300 mt-1 break-words">{reportOrder.deliveryAddress || 'Adresse'}</p>
                    {reportOrder.deliveryNotes && (
                      <p className="text-slate-500 italic mt-1 break-words">{isAr ? 'ملاحظة للسائق:' : 'Hinweis:'} {reportOrder.deliveryNotes}</p>
                    )}
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {isAr ? 'تفاصيل الطلب والحالة:' : 'Bestellstatus & Details:'}
                    </span>
                    <div className="mb-2">{getStatusBadge(reportOrder.status)}</div>
                    <p className="text-slate-600 dark:text-gray-300">
                      <strong>{isAr ? 'تاريخ الطلب:' : 'Bestelldatum:'}</strong> {new Date(reportOrder.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-emerald-700 dark:text-emerald-300 font-semibold mt-1">
                      {isAr ? 'طريقة الدفع: الدفع عند الاستلام (نقداً أو بالبطاقة عند الباب)' : 'Zahlungsart: Barzahlung / Kartenzahlung an der Haustür'}
                    </p>
                  </div>
                </div>

                {/* Items Table with horizontal scrolling on small screens */}
                <div className="border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden overflow-x-auto">
                  <div className="bg-slate-100 dark:bg-gray-800 px-4 py-2.5 font-bold text-xs text-slate-700 dark:text-gray-300">
                    {isAr ? 'المنتجات المسجلة في الطلب:' : 'Bestellte Artikel (Aufstellung):'}
                  </div>
                  <table className="w-full min-w-[340px] text-xs text-start">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-gray-800 text-slate-500 dark:text-gray-400 font-semibold text-[11px]">
                        <th className="p-2.5 sm:p-3 text-start">{isAr ? 'المنتج' : 'Artikel'}</th>
                        <th className="p-2.5 sm:p-3 text-center">{isAr ? 'الكمية' : 'Menge'}</th>
                        <th className="p-2.5 sm:p-3 text-end">{isAr ? 'سعر الوحدة' : 'Einzelpreis'}</th>
                        <th className="p-2.5 sm:p-3 text-end">{isAr ? 'الإجمالي' : 'Gesamt'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-gray-800/60">
                      {(reportOrder.orderItems || []).map((item) => {
                        const prodName = (language === 'ar' ? item.product?.nameAr : item.product?.nameDe) 
                          || item.product?.name 
                          || item.productId;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30">
                            <td className="p-2.5 sm:p-3 font-medium text-slate-800 dark:text-gray-200">
                              <div className="break-words max-w-[150px] sm:max-w-none">{prodName}</div>
                              {item.product?.sku && (
                                <span className="text-[10px] text-slate-400 font-mono block">Art.-Nr. {item.product.sku}</span>
                              )}
                            </td>
                            <td className="p-2.5 sm:p-3 text-center font-bold text-slate-900 dark:text-white whitespace-nowrap">{item.quantity}x</td>
                            <td className="p-2.5 sm:p-3 text-end font-mono text-slate-600 dark:text-gray-300 whitespace-nowrap">€{Number(item.price).toFixed(2)}</td>
                            <td className="p-2.5 sm:p-3 text-end font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              €{Number(item.subtotal || item.price * item.quantity).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      {Number(reportOrder.itemsSubtotal) > 0 && (Number(reportOrder.couponDiscount) > 0 || Number(reportOrder.promotionDiscount) > 0) && (
                        <tr className="border-t border-slate-200 dark:border-gray-800 bg-slate-50/60 dark:bg-gray-950/40">
                          <td colSpan="3" className="p-2.5 sm:p-3 text-end font-medium text-slate-500">
                            {isAr ? 'المجموع الفرعي:' : 'Zwischensumme:'}
                          </td>
                          <td className="p-2.5 sm:p-3 text-end font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            €{Number(reportOrder.itemsSubtotal).toFixed(2)}
                          </td>
                        </tr>
                      )}
                      {Number(reportOrder.promotionDiscount) > 0 && (
                        <tr className="border-t border-slate-200 dark:border-gray-800 bg-rose-50/40 dark:bg-rose-950/20">
                          <td colSpan="3" className="p-2.5 sm:p-3 text-end font-medium text-rose-600 dark:text-rose-400">
                            {isAr ? 'خصم العروض الترويجية:' : 'Aktionsrabatt:'}
                          </td>
                          <td className="p-2.5 sm:p-3 text-end font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            -€{Number(reportOrder.promotionDiscount).toFixed(2)}
                          </td>
                        </tr>
                      )}
                      {Number(reportOrder.couponDiscount) > 0 && (
                        <tr className="border-t border-slate-200 dark:border-gray-800 bg-purple-50/40 dark:bg-purple-950/20">
                          <td colSpan="3" className="p-2.5 sm:p-3 text-end font-medium text-purple-600 dark:text-purple-400">
                            {isAr ? 'كوبون الخصم:' : 'Gutschein:'} {reportOrder.couponCode ? `(${reportOrder.couponCode})` : ''}
                          </td>
                          <td className="p-2.5 sm:p-3 text-end font-mono font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                            -€{Number(reportOrder.couponDiscount).toFixed(2)}
                          </td>
                        </tr>
                      )}
                      <tr className="border-t border-slate-200 dark:border-gray-800 bg-slate-50/60 dark:bg-gray-950/40">
                        <td colSpan="3" className="p-2.5 sm:p-3 text-end font-medium text-slate-500">
                          {isAr ? 'رسوم التوصيل للمنزل' : 'Lieferkosten (Haustür)'}
                          {reportOrder.deliveryDistanceKm != null && Number(reportOrder.deliveryDistanceKm) > 0 && (
                            <span className="text-[10px] text-slate-400 block font-normal">
                              (~{reportOrder.deliveryDistanceKm} km {isAr ? 'من المتجر' : 'vom Supermarkt'})
                            </span>
                          )}:
                        </td>
                        <td className="p-2.5 sm:p-3 text-end font-bold text-emerald-600 whitespace-nowrap">
                          {Number(reportOrder.deliveryFee) > 0 ? `€${Number(reportOrder.deliveryFee).toFixed(2)}` : (isAr ? 'مجاناً (0.00 €)' : 'Kostenlos (0,00 €)')}
                        </td>
                      </tr>
                      <tr className="border-t-2 border-slate-200 dark:border-gray-700 bg-slate-100/80 dark:bg-gray-800/80">
                        <td colSpan="3" className="p-2.5 sm:p-3 text-end font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                          {isAr ? 'المجموع الإجمالي عند الاستلام:' : 'Gesamtbetrag bei Lieferung:'}
                        </td>
                        <td className="p-2.5 sm:p-3 text-end font-mono font-black text-sm sm:text-base text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          €{Number(reportOrder.totalAmount).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  {isAr 
                    ? 'هذا التقرير هو إيصال رسمي لتأكيد تفاصيل طلبك والتسليم عند باب منزلك مع الدفع عند الاستلام.' 
                    : 'Dieser Bestellbericht dient als offizieller Beleg für Ihre Bestellung und den Lieferumfang an Ihrer Haustür.'}
                </p>
              </div>

              {/* Modal Footer */}
              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-100 dark:border-gray-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 font-bold text-xs transition cursor-pointer touch-manipulation"
                >
                  {isAr ? 'إغلاق' : 'Schließen'}
                </button>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
};
