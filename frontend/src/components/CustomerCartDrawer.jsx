import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  X,
  Trash2,
  Plus,
  Minus,
  Truck,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Lock,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  ExternalLink,
  Phone,
  Mail,
  Store,
  Clock
} from 'lucide-react';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { getApiUrl } from '../utils/api';

const DELIVERY_SLOTS = [
  { value: 'today_16_18', labelDe: 'Heute, 16–18 Uhr', labelAr: 'اليوم، 16–18' },
  { value: 'tomorrow_10_12', labelDe: 'Morgen, 10–12 Uhr', labelAr: 'غداً، 10–12' },
  { value: 'tomorrow_16_18', labelDe: 'Morgen, 16–18 Uhr', labelAr: 'غداً، 16–18' }
];

export const CustomerCartDrawer = ({
  isOpen,
  onClose,
  cart,
  updateQuantity,
  removeFromCart,
  clearCart
}) => {
  const { customer, isAuthenticated, token } = useCustomerAuth();
  const { t, direction, language } = useLanguage();
  const { settings } = useStoreSettings();
  const navigate = useNavigate();

  const isAr = language === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliverySlot, setDeliverySlot] = useState(DELIVERY_SLOTS[0].value);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null);

  // Initialize address from customer profile when customer changes
  React.useEffect(() => {
    if (customer) {
      const parts = [
        customer.street && `${customer.street} ${customer.houseNumber || ''}`.trim(),
        customer.postalCode && customer.city && `${customer.postalCode} ${customer.city}`.trim(),
        customer.floorApartment && `Apt/Floor: ${customer.floorApartment}`
      ].filter(Boolean);
      setDeliveryAddress(parts.join(', '));
      setDeliveryNotes(customer.deliveryNotes || '');
    }
  }, [customer]);

  if (!isOpen) return null;

  const itemsSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const minOrderValue = Number(settings?.minOrderValue) || 0;
  const deliveryFeeSetting = Number(settings?.deliveryFee) || 0;
  const freeDeliveryThreshold = Number(settings?.freeDeliveryThreshold) || 0;
  const deliveryFee = deliveryFeeSetting <= 0
    ? 0
    : (freeDeliveryThreshold > 0 && itemsSubtotal >= freeDeliveryThreshold ? 0 : deliveryFeeSetting);
  const amountUntilFreeDelivery = deliveryFeeSetting > 0 && freeDeliveryThreshold > 0 && itemsSubtotal < freeDeliveryThreshold
    ? freeDeliveryThreshold - itemsSubtotal
    : 0;
  const totalAmount = itemsSubtotal + deliveryFee;
  const belowMinOrder = minOrderValue > 0 && itemsSubtotal < minOrderValue;

  const isVerified = Boolean(customer?.emailVerified);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/customer/login');
      return;
    }

    if (!isVerified) {
      setError(
        isAr
          ? 'يجب تأكيد بريدك الإلكتروني أولاً لتتمكن من تقديم الطلب.'
          : 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse, um eine Bestellung aufgeben zu können.'
      );
      return;
    }

    if (belowMinOrder) {
      setError(
        isAr
          ? `الحد الأدنى للطلب هو €${minOrderValue.toFixed(2)}. يرجى إضافة المزيد من المنتجات.`
          : `Der Mindestbestellwert beträgt €${minOrderValue.toFixed(2)}. Bitte fügen Sie weitere Artikel hinzu.`
      );
      return;
    }

    if (cart.length === 0) return;

    try {
      setSubmitting(true);
      setError('');
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          orderItems: cart.map(i => ({ productId: i.productId, quantity: i.quantity })),
          deliveryAddress: deliveryAddress.trim() || undefined,
          deliveryNotes: deliveryNotes.trim() || undefined,
          notes: deliveryNotes.trim() || undefined,
          deliverySlot
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      setPlacedOrder(data);
      clearCart();
    } catch (err) {
      console.error('Order checkout error:', err);
      setError(err.message || 'Error creating order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fadeIn">
      {/* Drawer Container */}
      <div 
        className="w-full sm:max-w-md md:max-w-lg bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col justify-between overflow-hidden border-s border-slate-200 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-5 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between bg-slate-50/50 dark:bg-gray-950/50 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-900/40 shrink-0">
              <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                {isAr ? 'سلة التوصيل المنزلي' : 'Liefer-Warenkorb'}
              </h2>
              <span className="text-xs text-slate-500 dark:text-gray-400">
                {cart.length > 0 ? `${totalItemsCount} ${isAr ? 'منتجات' : 'Artikel'}` : (isAr ? 'السلة فارغة' : 'Warenkorb ist leer')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {cart.length > 0 && !placedOrder && (
              <button
                type="button"
                onClick={clearCart}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer touch-manipulation"
                title={isAr ? 'تفريغ السلة' : 'Warenkorb leeren'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 transition cursor-pointer touch-manipulation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">

          {/* If an Order was successfully placed */}
          {placedOrder ? (
            <div className="py-8 text-center space-y-5">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-300 dark:border-emerald-800 shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {isAr ? 'تم استلام طلبك بنجاح' : 'Bestellung erfolgreich eingegangen!'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  {isAr 
                    ? `رقم طلبك #${placedOrder.id.slice(0, 8).toUpperCase()}. جارٍ تجهيز طلبك وسيتم تسليمه إلى باب منزلك مع الدفع نقداً أو بالبطاقة عند الاستلام.` 
                    : `Bestellnummer #${placedOrder.id.slice(0, 8).toUpperCase()}. Ihre Bestellung wird vorbereitet und bequem zu Ihnen nach Hause geliefert.`}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-850 text-start text-xs space-y-2">
                <div>
                  <span className="text-slate-400 block">{isAr ? 'عنوان التوصيل:' : 'Lieferadresse:'}</span>
                  <span className="font-bold text-slate-800 dark:text-gray-200">{placedOrder.deliveryAddress}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-emerald-200/50 dark:border-emerald-850">
                  <span className="text-slate-400">{isAr ? 'المطلوب سداده عند الاستلام:' : 'Betrag bei Lieferung:'}</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                    €{Number(placedOrder.totalAmount).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/account');
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{isAr ? 'متابعة الطلب في حسابي' : 'Bestellung im Kundenkonto ansehen'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlacedOrder(null);
                    onClose();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-slate-700 dark:text-gray-300 font-bold text-xs transition cursor-pointer"
                >
                  {isAr ? 'متابعة التسوق' : 'Weiter einkaufen'}
                </button>
              </div>
            </div>
          ) : cart.length === 0 ? (
            /* Empty Cart View */
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-50 dark:bg-gray-950 text-slate-300 dark:text-gray-600 flex items-center justify-center border border-slate-200 dark:border-gray-800">
                <ShoppingCart className="w-8 h-8 opacity-60" />
              </div>
              <div>
                <p className="font-extrabold text-slate-800 dark:text-gray-200 text-sm">
                  {isAr ? 'سلة التسوق فارغة حالياً' : 'Ihr Warenkorb ist noch leer'}
                </p>
                <p className="text-xs text-slate-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">
                  {isAr 
                    ? 'اختر المنتجات الغذائية والمستلزمات المفضلة لديك وأضفها إلى السلة للتوصيل إلى منزلك.' 
                    : 'Fügen Sie gewünschte Produkte aus unserem Sortiment hinzu, um die Lieferung zu starten.'}
                </p>
              </div>
            </div>
          ) : (
            /* Items List & Checkout Form */
            <div className="space-y-6">
              
              {/* Product items */}
              <div className="space-y-3">
                {cart.map((item) => {
                  const localizedName = (language === 'ar' ? item.nameAr : item.nameDe) || item.name;
                  return (
                    <div 
                      key={item.productId}
                      className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-gray-800 bg-white dark:bg-gray-950/60 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200/60 dark:border-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={localizedName} className="w-full h-full object-cover" />
                          ) : (
                            <ShoppingCart className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate" title={localizedName}>
                            {localizedName}
                          </h4>
                          <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            €{Number(item.price).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center border border-slate-200 dark:border-gray-800 rounded-xl bg-slate-50 dark:bg-gray-900 p-0.5">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, -1)}
                            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-800 text-slate-600 dark:text-gray-300 transition cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center font-bold text-xs text-slate-800 dark:text-gray-200 font-mono">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, 1)}
                            disabled={item.quantity >= item.stock}
                            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-800 text-slate-600 dark:text-gray-300 disabled:opacity-30 transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Zero-Payment Badge */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-850 flex items-start gap-3">
                <Truck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900 dark:text-emerald-200">
                  <strong className="block font-bold">
                    {isAr ? 'الدفع عند الاستلام فقط (نقداً أو بالبطاقة عند الباب)' : 'Zahlung an der Haustür (Bar oder Karte)'}
                  </strong>
                  <span className="text-[11px] opacity-90 block mt-0.5">
                    {isAr 
                      ? 'لا داعي لإدخال أي بطاقة دفع الآن. ستدفع للمندوب مباشرة عند استلام مشترياتك.' 
                      : 'Keine Online-Zahlung nötig. Sie bezahlen den Fahrer erst bei der Zustellung.'}
                  </span>
                </div>
              </div>

              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Checkout Auth Condition */}
              {!isAuthenticated ? (
                /* Unauthenticated prompt */
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-center space-y-3">
                  <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      {isAr ? 'تسجيل الدخول مطلوب لإتمام التوصيل' : 'Kunden-Login für Hauszustellung erforderlich'}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-1">
                      {isAr 
                        ? 'يرجى تسجيل الدخول أو إنشاء حساب جديد لتأكيد عنوانك ورقم هاتفك.' 
                        : 'Bitte anmelden oder registrieren, um Adresse und Telefonnummer zu hinterlegen.'}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => { onClose(); navigate('/customer/login'); }}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                    >
                      {isAr ? 'تسجيل الدخول' : 'Anmelden'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { onClose(); navigate('/customer/register'); }}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-slate-200 dark:bg-gray-800 hover:bg-slate-300 text-slate-800 dark:text-gray-200 font-bold text-xs transition cursor-pointer"
                    >
                      {isAr ? 'حساب جديد' : 'Registrieren'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Authenticated Customer Delivery Form */
                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-gray-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <span>{isAr ? 'تأكيد عنوان التوصيل' : 'Lieferadresse bestätigen'}</span>
                    </span>
                    <Link
                      to="/account"
                      onClick={onClose}
                      className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <span>{isAr ? 'تعديل الحساب' : 'Konto anpassen'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>

                  {/* Verification badges warning */}
                  {!isVerified && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-850 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span>{isAr ? 'البريد الإلكتروني غير مؤكد' : 'E-Mail-Adresse nicht bestätigt'}</span>
                      </div>
                      <Link
                        to="/account"
                        onClick={onClose}
                        className="font-bold underline text-amber-900 dark:text-amber-200"
                      >
                        {isAr ? 'تأكيد الآن' : 'Jetzt bestätigen'}
                      </Link>
                    </div>
                  )}

                  {/* Optional phone verification hint (not required to order) */}
                  {isVerified && !customer?.phoneVerified && (
                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-blue-700 dark:text-blue-300 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{isAr ? 'رقم الهاتف غير مؤكد (اختياري)' : 'Telefonnummer nicht bestätigt (optional)'}</span>
                      </div>
                      <Link
                        to="/account"
                        onClick={onClose}
                        className="font-bold underline"
                      >
                        {isAr ? 'تأكيد لاحقاً' : 'Später bestätigen'}
                      </Link>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-gray-400 mb-1">
                      {isAr ? 'عنوان التوصيل الفعلي للمنزل *' : 'Lieferadresse *'}
                    </label>
                    <textarea
                      rows={2}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder={isAr ? 'الشارع، رقم المنزل، الرمز البريدي، المدينة، الطابق...' : 'Straße, Hausnummer, PLZ, Ort, Stock/Tür'}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-gray-400 mb-1">
                      {isAr ? 'ملاحظات للسائق (اختياري)' : 'Lieferhinweis für den Fahrer (optional)'}
                    </label>
                    <input
                      type="text"
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder={isAr ? 'مثال: يرجى الاتصال عند الوصول، الجرس باسم...' : 'z.B. Bitte bei Schmidt klingeln'}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{isAr ? 'اختر موعد التوصيل' : 'Lieferzeitfenster wählen'}</span>
                    </label>
                    <div className="grid grid-cols-1 xs:grid-cols-3 gap-2">
                      {DELIVERY_SLOTS.map((slot) => (
                        <button
                          key={slot.value}
                          type="button"
                          onClick={() => setDeliverySlot(slot.value)}
                          className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer touch-manipulation ${
                            deliverySlot === slot.value
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                              : 'bg-slate-50 dark:bg-gray-950 border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-300 hover:border-emerald-400'
                          }`}
                        >
                          {isAr ? slot.labelAr : slot.labelDe}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

        {/* Drawer Footer / Checkout Button */}
        {cart.length > 0 && !placedOrder && (
          <div className="p-6 border-t border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-950/50 space-y-3">
            {amountUntilFreeDelivery > 0 && (
              <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 rounded-xl px-3 py-2 text-center">
                {isAr
                  ? `أضف منتجات بقيمة €${amountUntilFreeDelivery.toFixed(2)} أخرى للحصول على توصيل مجاني!`
                  : `Noch €${amountUntilFreeDelivery.toFixed(2)} bis zur kostenlosen Lieferung!`}
              </div>
            )}

            {belowMinOrder && (
              <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 rounded-xl px-3 py-2 text-center">
                {isAr
                  ? `الحد الأدنى للطلب هو €${minOrderValue.toFixed(2)}.`
                  : `Der Mindestbestellwert beträgt €${minOrderValue.toFixed(2)}.`}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
              <span>{isAr ? 'رسوم التوصيل' : 'Liefergebühr'}</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {deliveryFee > 0 ? `€${deliveryFee.toFixed(2)}` : (isAr ? 'مجاناً' : 'Kostenlos')}
              </span>
            </div>

            <div className="flex items-center justify-between text-base font-extrabold text-slate-900 dark:text-white">
              <span>{isAr ? 'الإجمالي عند الاستلام' : 'Gesamtbetrag bei Erhalt'}</span>
              <span className="font-mono text-xl text-emerald-600 dark:text-emerald-400">
                €{Number(totalAmount).toFixed(2)}
              </span>
            </div>

            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={submitting || (isAuthenticated && (!isVerified || belowMinOrder))}
              className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm shadow-xl shadow-emerald-600/25 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <span>{isAr ? 'جارٍ إرسال الطلب...' : 'Bestellung wird gesendet...'}</span>
              ) : (
                <>
                  <Truck className="w-5 h-5" />
                  <span>
                    {isAr ? 'تأكيد طلب التوصيل للمنزل' : 'Jetzt verbindlich für Lieferung bestellen'}
                  </span>
                  <ArrowIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
