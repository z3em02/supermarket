import React, { useState, useEffect, useMemo } from 'react';
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
  AlertTriangle,
  ShieldCheck,
  Lock,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  ExternalLink,
  Mail,
  Store,
  Clock,
  Tag,
  Gift,
  Check,
  Percent,
  Sparkles,
  CalendarDays,
  Navigation
} from 'lucide-react';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { getApiUrl } from '../utils/api';
import { getCsrfToken } from '../utils/csrf';
import {
  todayIso,
  tomorrowIso,
  maxDeliveryDateIso,
  buildDeliverySlot,
  formatDeliverySlot,
  windowLabel,
  fetchActiveDeliveryWindows,
  isWindowAvailableForDate,
  getAvailableWindowsForDate,
  getEarliestAvailableDate
} from '../utils/deliverySlot';

export const CustomerCartDrawer = ({
  isOpen,
  onClose,
  cart,
  updateQuantity,
  removeFromCart,
  clearCart
}) => {
  const { customer, isAuthenticated } = useCustomerAuth();
  const { t, direction, language } = useLanguage();
  const { settings } = useStoreSettings();
  const navigate = useNavigate();

  const isAr = language === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(todayIso());
  const [deliveryWindows, setDeliveryWindows] = useState([]);
  const [selectedWindow, setSelectedWindow] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null);

  // Distance calculation state
  const [distanceInfo, setDistanceInfo] = useState({
    distanceKm: 0,
    baseFee: Number(settings?.deliveryFee ?? 2.0),
    perKmRate: Number(settings?.deliveryFeePerKm ?? 0.10),
    distanceFee: 0,
    totalDeliveryFee: Number(settings?.deliveryFee ?? 2.0),
    isWithinMaxDistance: true,
    maxDeliveryDistanceKm: Number(settings?.maxDeliveryDistanceKm ?? 0)
  });
  const [distanceLoading, setDistanceLoading] = useState(false);

  // Promotions & Coupon state
  const [activePromos, setActivePromos] = useState([]);
  const [showCouponField, setShowCouponField] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Fetch active promotions
  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const apiUrl = getApiUrl();
        const res = await fetch(`${apiUrl}/api/promotions/active`);
        if (res.ok) {
          const data = await res.json();
          setActivePromos(data);
        }
      } catch (err) {
        console.error('Cart drawer active promos error:', err);
      }
    };
    if (isOpen) {
      fetchPromos();
    }
  }, [isOpen]);

  // Fetch admin-configured active delivery time windows
  useEffect(() => {
    if (!isOpen) return;
    fetchActiveDeliveryWindows()
      .then((windows) => {
        setDeliveryWindows(windows);
        // Smart earliest date: if all windows for today have closed, pick tomorrow!
        const earliestDate = getEarliestAvailableDate(windows);
        setDeliveryDate((prevDate) => {
          if (!prevDate || prevDate < todayIso()) return earliestDate;
          const availableForPrev = getAvailableWindowsForDate(windows, prevDate);
          if (availableForPrev.length === 0) return earliestDate;
          return prevDate;
        });
      })
      .catch((err) => console.error('Cart drawer delivery windows error:', err));
  }, [isOpen]);

  // Keep selectedWindow synced with available windows for chosen date
  useEffect(() => {
    const available = getAvailableWindowsForDate(deliveryWindows, deliveryDate);
    setSelectedWindow((prev) => {
      if (prev && available.some((w) => w.startHour === prev.startHour && w.endHour === prev.endHour)) {
        return prev;
      }
      return available[0] || null;
    });
  }, [deliveryDate, deliveryWindows]);

  // Initialize address from customer profile when customer changes
  useEffect(() => {
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

  // Debounced distance calculation whenever destination address changes
  useEffect(() => {
    if (!isOpen) return;

    const targetAddress = deliveryAddress.trim() || [
      customer?.street && `${customer.street} ${customer.houseNumber || ''}`.trim(),
      customer?.postalCode && customer?.city && `${customer.postalCode} ${customer.city}`.trim()
    ].filter(Boolean).join(', ');

    if (!targetAddress) {
      setDistanceInfo({
        distanceKm: 0,
        baseFee: Number(settings?.deliveryFee ?? 2.0),
        perKmRate: Number(settings?.deliveryFeePerKm ?? 0.10),
        distanceFee: 0,
        totalDeliveryFee: Number(settings?.deliveryFee ?? 2.0),
        isWithinMaxDistance: true,
        maxDeliveryDistanceKm: Number(settings?.maxDeliveryDistanceKm ?? 0)
      });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setDistanceLoading(true);
        const apiUrl = getApiUrl();
        const res = await fetch(`${apiUrl}/api/delivery-distance/calculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: targetAddress,
            postalCode: customer?.postalCode
          })
        });
        if (res.ok) {
          const data = await res.json();
          setDistanceInfo(data);
        }
      } catch (err) {
        console.error('Cart drawer distance calc error:', err);
      } finally {
        setDistanceLoading(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [isOpen, deliveryAddress, customer?.street, customer?.postalCode, customer?.city, settings?.deliveryFee, settings?.deliveryFeePerKm, settings?.maxDeliveryDistanceKm]);

  const promoMap = useMemo(() => {
    return new Map(activePromos.map(p => [p.productId, p]));
  }, [activePromos]);

  // Calculate cart items with promotions applied
  const cartWithPromos = useMemo(() => {
    return cart.map((item) => {
      const promo = promoMap.get(item.productId);
      let freeUnits = 0;
      let effectivePrice = Number(item.price);
      let itemSavings = 0;
      let lineTotal = Number(item.price) * item.quantity;
      let badge = null;

      if (promo && promo.isActive) {
        if (promo.type === 'BUY_X_GET_Y') {
          const buyQty = promo.buyQuantity || 2;
          const getYQty = promo.getYQuantity || 1;
          const groupSize = buyQty + getYQty;
          freeUnits = Math.floor(item.quantity / groupSize) * getYQty;
          const paidUnits = Math.max(0, item.quantity - freeUnits);
          lineTotal = paidUnits * Number(item.price);
          itemSavings = freeUnits * Number(item.price);
          badge = isAr ? promo.badgeTextAr || `${buyQty}+${getYQty} مجاناً` : promo.badgeTextDe || `${buyQty}+${getYQty} Gratis`;
        } else if (promo.type === 'PRODUCT_DISCOUNT') {
          if (promo.promotionalPrice != null) {
            effectivePrice = Number(promo.promotionalPrice);
            lineTotal = effectivePrice * item.quantity;
            itemSavings = Math.max(0, (Number(item.price) - effectivePrice) * item.quantity);
          } else if (promo.discountPercent) {
            const pct = Number(promo.discountPercent);
            effectivePrice = Number((Number(item.price) * (1 - pct / 100)).toFixed(2));
            lineTotal = effectivePrice * item.quantity;
            itemSavings = Math.max(0, (Number(item.price) - effectivePrice) * item.quantity);
          }
          badge = isAr ? promo.badgeTextAr || 'عرض خاص' : promo.badgeTextDe || 'Angebot';
        }
      }

      return {
        ...item,
        promo,
        freeUnits,
        effectivePrice,
        itemSavings,
        lineTotal,
        badge
      };
    });
  }, [cart, promoMap, isAr]);

  const rawSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalPromoSavings = cartWithPromos.reduce((sum, item) => sum + item.itemSavings, 0);
  const itemsSubtotal = Math.max(0, Number((rawSubtotal - totalPromoSavings).toFixed(2)));
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Coupon Validation Handler
  const handleApplyCoupon = async (e) => {
    if (e) e.preventDefault();
    const clean = couponInput.trim().toUpperCase();
    if (!clean) return;

    try {
      setValidatingCoupon(true);
      setCouponError('');
      const apiUrl = getApiUrl();

      const res = await fetch(`${apiUrl}/api/coupons/validate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() || '' },
        body: JSON.stringify({
          code: clean,
          items: cart.map(i => ({ productId: i.productId, quantity: i.quantity }))
        })
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        throw new Error(data.error || (isAr ? 'رمز الكوبون غير صالح' : 'Ungültiger Gutscheincode'));
      }

      setAppliedCoupon({
        code: data.coupon.code,
        discountType: data.coupon.discountType,
        discountValue: data.coupon.discountValue,
        discountAmount: data.discountAmount,
        isFreeShipping: data.isFreeShipping
      });
      setCouponInput('');
    } catch (err) {
      setCouponError(err.message || 'Gutschein konnte nicht angewendet werden');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  // Revalidate coupon when cart items change
  useEffect(() => {
    if (appliedCoupon && cart.length > 0) {
      const apiUrl = getApiUrl();

      fetch(`${apiUrl}/api/coupons/validate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() || '' },
        body: JSON.stringify({
          code: appliedCoupon.code,
          items: cart.map(i => ({ productId: i.productId, quantity: i.quantity }))
        })
      })
        .then(r => r.json())
        .then(data => {
          if (data.valid) {
            setAppliedCoupon(prev => ({
              ...prev,
              discountAmount: data.discountAmount,
              isFreeShipping: data.isFreeShipping
            }));
          } else {
            setAppliedCoupon(null);
            setCouponError(data.error);
          }
        })
        .catch(() => {});
    }
  }, [cart]);

  const allowedPostalCodes = useMemo(() => {
    const raw = settings?.allowedPostalCodes;
    if (!raw || raw === 'null') return [];
    return raw.split(/[,;\s]+/).map(c => c.trim()).filter(c => c && c !== 'null');
  }, [settings?.allowedPostalCodes]);

  const isPostalCodeAllowed = useMemo(() => {
    if (allowedPostalCodes.length === 0) return true;
    const custPostal = (customer?.postalCode || '').trim();
    const addr = String(deliveryAddress || '').trim();
    if (custPostal && allowedPostalCodes.includes(custPostal)) return true;
    return allowedPostalCodes.some((code) => {
      const regex = new RegExp(`(^|[^0-9])${code}([^0-9]|$)`);
      return regex.test(addr);
    });
  }, [allowedPostalCodes, customer?.postalCode, deliveryAddress]);

  if (!isOpen) return null;

  const minOrderValue = Number(settings?.minOrderValue) || 0;
  const freeDeliveryThreshold = Number(settings?.freeDeliveryThreshold) || 0;

  const baseServiceFee = Number(distanceInfo.baseFee ?? (settings?.deliveryFee ?? 2.0));
  const rawDeliveryFee = Number(distanceInfo.totalDeliveryFee ?? baseServiceFee);

  // Free shipping perk from combo coupon or threshold
  const isFreeDeliveryApplied = Boolean(appliedCoupon?.isFreeShipping) || (freeDeliveryThreshold > 0 && itemsSubtotal >= freeDeliveryThreshold);
  const deliveryFee = isFreeDeliveryApplied ? 0 : rawDeliveryFee;

  const amountUntilFreeDelivery = !isFreeDeliveryApplied && rawDeliveryFee > 0 && freeDeliveryThreshold > 0 && itemsSubtotal < freeDeliveryThreshold
    ? freeDeliveryThreshold - itemsSubtotal
    : 0;

  const couponDiscount = appliedCoupon?.discountAmount || 0;
  const finalItemsTotal = Math.max(0, Number((itemsSubtotal - couponDiscount).toFixed(2)));
  const totalAmount = Number((finalItemsTotal + deliveryFee).toFixed(2));
  const belowMinOrder = minOrderValue > 0 && itemsSubtotal < minOrderValue;

  const isVerified = Boolean(customer?.emailVerified && customer?.phoneVerified);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/customer/login');
      return;
    }

    if (!customer?.emailVerified) {
      setError(
        isAr
          ? 'يجب تأكيد بريدك الإلكتروني أولاً لتتمكن من تقديم الطلب.'
          : 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse, um eine Bestellung aufgeben zu können.'
      );
      return;
    }

    if (!customer?.phoneVerified) {
      setError(
        isAr
          ? 'يجب تأكيد رقم هاتفك أولاً لتتمكن من تقديم الطلب.'
          : 'Bitte bestätigen Sie zuerst Ihre Telefonnummer, um eine Bestellung aufgeben zu können.'
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

    if (deliveryWindows.length > 0 && !selectedWindow) {
      setError(
        isAr
          ? 'يرجى اختيار وقت توصيل متاح للمتابعة.'
          : 'Bitte wählen Sie ein verfügbares Liefer-Zeitfenster aus.'
      );
      return;
    }

    if (!isPostalCodeAllowed) {
      setError(
        isAr
          ? `عذراً، نوصل حالياً فقط إلى الرموز البريدية التالية: ${allowedPostalCodes.join(', ')}`
          : `Wir liefern derzeit nur an folgende Postleitzahlen: ${allowedPostalCodes.join(', ')}`
      );
      return;
    }

    if (!distanceInfo.isWithinMaxDistance) {
      setError(
        isAr
          ? `عنوان التوصيل على بعد ${distanceInfo.distanceKm} كم. أقصى مسافة توصيل متاحة هي ${distanceInfo.maxDeliveryDistanceKm} كم.`
          : `Die Lieferadresse ist ${distanceInfo.distanceKm} km entfernt. Unsere maximale Lieferdistanz beträgt ${distanceInfo.maxDeliveryDistanceKm} km.`
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
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken() || ''
        },
        body: JSON.stringify({
          orderItems: cart.map(i => ({ productId: i.productId, quantity: i.quantity })),
          couponCode: appliedCoupon?.code || undefined,
          deliveryAddress: deliveryAddress.trim() || undefined,
          deliveryNotes: deliveryNotes.trim() || undefined,
          notes: deliveryNotes.trim() || undefined,
          deliverySlot: buildDeliverySlot(deliveryDate, selectedWindow?.startHour, selectedWindow?.endHour)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      setPlacedOrder(data);
      setAppliedCoupon(null);
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
                {placedOrder.deliverySlot && formatDeliverySlot(placedOrder.deliverySlot, isAr) && (
                  <div>
                    <span className="text-slate-400 block">{isAr ? 'موعد التوصيل:' : 'Lieferzeitfenster:'}</span>
                    <span className="font-bold text-slate-800 dark:text-gray-200">{formatDeliverySlot(placedOrder.deliverySlot, isAr)}</span>
                  </div>
                )}
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
                {cartWithPromos.map((item) => {
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
                        <div className="min-w-0 space-y-0.5">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate" title={localizedName}>
                            {localizedName}
                          </h4>
                          
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              €{Number(item.effectivePrice).toFixed(2)}
                            </span>
                            {item.effectivePrice < item.price && (
                              <span className="line-through text-[10px] text-slate-400">
                                €{Number(item.price).toFixed(2)}
                              </span>
                            )}
                          </div>

                          {/* Promotion Badges on Line Item */}
                          {item.freeUnits > 0 && (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 text-[10px] font-bold border border-purple-200 dark:border-purple-800">
                              <Gift className="w-3 h-3" />
                              <span>{item.freeUnits}x {isAr ? 'مجاناً (عرض 2+1)' : 'GRATIS (2+1 Aktion)'}</span>
                            </div>
                          )}

                          {item.freeUnits === 0 && item.badge && (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                              <Sparkles className="w-3 h-3" />
                              <span>{item.badge}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quantity Controls — buttons sized for a real touch
                          target (min ~40px), not just the visual icon size,
                          since this is the most-repeated tap in the cart. */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center border border-slate-200 dark:border-gray-800 rounded-xl bg-slate-50 dark:bg-gray-900 p-0.5">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, -1)}
                            className="min-w-10 min-h-10 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-gray-800 text-slate-600 dark:text-gray-300 transition cursor-pointer touch-manipulation"
                            aria-label={isAr ? 'تقليل الكمية' : 'Menge verringern'}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-7 text-center font-bold text-xs text-slate-800 dark:text-gray-200 font-mono">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, 1)}
                            disabled={item.quantity >= item.stock}
                            className="min-w-10 min-h-10 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-gray-800 text-slate-600 dark:text-gray-300 disabled:opacity-30 transition cursor-pointer touch-manipulation"
                            aria-label={isAr ? 'زيادة الكمية' : 'Menge erhöhen'}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId)}
                          className="min-w-10 min-h-10 flex items-center justify-center text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer touch-manipulation"
                          aria-label={isAr ? 'حذف' : 'Entfernen'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Zero-Payment note */}
              <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                <Truck className="w-3.5 h-3.5 shrink-0" />
                <span>{isAr ? 'الدفع عند الاستلام فقط (نقداً أو بالبطاقة)' : 'Zahlung erst bei Lieferung (Bar oder Karte)'}</span>
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
                <div className="pt-2 border-t border-slate-100 dark:border-gray-800 space-y-3">
                  {/* Verification warning (combined if both missing) */}
                  {(!customer?.emailVerified || !customer?.phoneVerified) && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-850 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="truncate">
                          {!customer?.emailVerified && !customer?.phoneVerified
                            ? (isAr ? 'البريد الإلكتروني ورقم الهاتف غير مؤكدين' : 'E-Mail & Telefon nicht bestätigt')
                            : !customer?.emailVerified
                              ? (isAr ? 'البريد الإلكتروني غير مؤكد' : 'E-Mail-Adresse nicht bestätigt')
                              : (isAr ? 'رقم الهاتف غير مؤكد' : 'Telefonnummer nicht bestätigt')}
                        </span>
                      </div>
                      <Link
                        to="/account"
                        onClick={onClose}
                        className="font-bold underline text-amber-900 dark:text-amber-200 shrink-0"
                      >
                        {isAr ? 'تأكيد الآن' : 'Jetzt bestätigen'}
                      </Link>
                    </div>
                  )}

                  {/* Delivery details card */}
                  <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50/60 dark:bg-gray-950/40 divide-y divide-slate-200/70 dark:divide-gray-800">
                    <div className="p-3.5 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isAr ? 'تفاصيل التوصيل' : 'Lieferdetails'}</span>
                      </span>
                      <Link
                        to="/account"
                        onClick={onClose}
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
                      >
                        <span>{isAr ? 'تعديل الحساب' : 'Konto anpassen'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    <div className="p-3.5">
                      <textarea
                        rows={2}
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder={isAr ? 'الشارع، رقم المنزل، الرمز البريدي، المدينة، الطابق...' : 'Straße, Hausnummer, PLZ, Ort, Stock/Tür'}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      {!isPostalCodeAllowed && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                          <div>
                            <p className="font-bold">
                              {isAr ? 'عذراً، هذا العنوان خارج نطاق التوصيل حالياً.' : 'Lieferadresse liegt außerhalb des aktuellen Liefergebiets.'}
                            </p>
                            <p className="text-[11px] mt-0.5 text-amber-700 dark:text-amber-300">
                              {isAr
                                ? `الرموز البريدية المتاحة حالياً: ${allowedPostalCodes.join(', ')}`
                                : `Wir liefern aktuell nur an: ${allowedPostalCodes.join(', ')}`}
                            </p>
                          </div>
                        </div>
                      )}
                      {!distanceInfo.isWithinMaxDistance && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                          <div>
                            <p className="font-bold">
                              {isAr ? 'عذراً، العنوان بعيد جداً عن السوبرماركت.' : 'Lieferadresse ist zu weit entfernt.'}
                            </p>
                            <p className="text-[11px] mt-0.5 text-rose-700 dark:text-rose-300">
                              {isAr
                                ? `المسافة الحالية تقريباً ${distanceInfo.distanceKm} كم (الحد الأقصى المسموح: ${distanceInfo.maxDeliveryDistanceKm} كم).`
                                : `Entfernung ca. ${distanceInfo.distanceKm} km (Maximale Lieferdistanz: ${distanceInfo.maxDeliveryDistanceKm} km).`}
                            </p>
                          </div>
                        </div>
                      )}
                      {distanceInfo.distanceKm > 0 && distanceInfo.isWithinMaxDistance && (
                        <div className="mt-2 text-[11px] text-slate-500 dark:text-gray-400 flex items-center gap-1.5 font-medium">
                          <Navigation className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>
                            {distanceInfo.isExactAddress
                              ? (isAr
                                  ? `مسافة التوصيل لعنوانك: ${distanceInfo.distanceKm} كم`
                                  : `Fahrtstrecke zu Ihrer Adresse: ${distanceInfo.distanceKm} km`)
                              : (isAr
                                  ? `المسافة التقديرية: ~${distanceInfo.distanceKm} كم`
                                  : `Geschätzte Entfernung: ~${distanceInfo.distanceKm} km`)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-3.5 space-y-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          <span>{isAr ? 'التاريخ' : 'Datum'}</span>
                        </label>
                        <input
                          type="date"
                          value={deliveryDate}
                          min={todayIso()}
                          max={maxDeliveryDateIso()}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-lg bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{isAr ? 'الوقت' : 'Zeitfenster'}</span>
                        </label>
                        {deliveryWindows.length === 0 ? (
                          <p className="text-[11px] text-slate-400 dark:text-gray-500">
                            {isAr ? 'لا توجد أوقات توصيل متاحة حالياً' : 'Derzeit keine Zeitfenster verfügbar'}
                          </p>
                        ) : getAvailableWindowsForDate(deliveryWindows, deliveryDate).length === 0 ? (
                          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs space-y-1.5">
                            <p>
                              {isAr
                                ? 'عذراً، انتهت أوقات التوصيل المتاحة لهذا اليوم.'
                                : 'Für das gewählte Datum sind keine Lieferfenster mehr verfügbar.'}
                            </p>
                            <button
                              type="button"
                              onClick={() => setDeliveryDate(tomorrowIso())}
                              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 underline hover:text-emerald-800 dark:hover:text-emerald-300 cursor-pointer block"
                            >
                              {isAr ? '← التبديل إلى يوم الغد' : '→ Auf morgen wechseln'}
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {getAvailableWindowsForDate(deliveryWindows, deliveryDate).map((w) => (
                              <button
                                key={w.id}
                                type="button"
                                onClick={() => setSelectedWindow(w)}
                                className={`px-3 py-2 rounded-lg border text-[11px] font-bold transition cursor-pointer touch-manipulation ${
                                  selectedWindow?.id === w.id
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                    : 'bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-300 hover:border-emerald-400'
                                }`}
                              >
                                {windowLabel(w.startHour, w.endHour, isAr)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5">
                      <input
                        type="text"
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        placeholder={isAr ? 'ملاحظات للسائق (اختياري)' : 'Lieferhinweis für den Fahrer (optional)'}
                        className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Drawer Footer / Checkout Button */}
        {cart.length > 0 && !placedOrder && (
          <div className="p-5 sm:p-6 border-t border-slate-100 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-950/70 space-y-3 shrink-0">
            {/* Coupon Code Input & Applied Pill */}
            <div className="space-y-2">
              {!appliedCoupon ? (
                showCouponField ? (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        autoFocus
                        type="text"
                        placeholder={isAr ? 'أدخل رمز الكوبون...' : 'Gutscheincode eingeben...'}
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold uppercase bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-900 dark:text-white placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={validatingCoupon || !couponInput.trim()}
                      className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-gray-800 dark:hover:bg-gray-700 text-white disabled:opacity-40 transition cursor-pointer shrink-0"
                    >
                      {validatingCoupon ? '...' : (isAr ? 'تطبيق' : 'Anwenden')}
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCouponField(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>{isAr ? 'لديك رمز كوبون؟' : 'Gutscheincode hinzufügen'}</span>
                  </button>
                )
              ) : (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Tag className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="min-w-0 truncate">
                      <span className="font-mono font-bold text-emerald-900 dark:text-emerald-300">
                        {appliedCoupon.code}
                      </span>
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400 ml-1.5">
                        (-€{Number(appliedCoupon.discountAmount).toFixed(2)})
                        {appliedCoupon.isFreeShipping && ` + ${isAr ? 'شحن مجاني' : 'Gratis Lieferung'}`}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg text-emerald-800 dark:text-emerald-300 transition cursor-pointer shrink-0"
                    title={isAr ? 'إزالة الكوبون' : 'Gutschein entfernen'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {couponError && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{couponError}</span>
                </p>
              )}
            </div>

            {amountUntilFreeDelivery > 0 && (
              <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 rounded-xl px-3 py-1.5 text-center">
                {isAr
                  ? `أضف منتجات بقيمة €${amountUntilFreeDelivery.toFixed(2)} أخرى للحصول على توصيل مجاني!`
                  : `Noch €${amountUntilFreeDelivery.toFixed(2)} bis zur kostenlosen Lieferung!`}
              </div>
            )}

            {belowMinOrder && (
              <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 rounded-xl px-3 py-1.5 text-center">
                {isAr
                  ? `الحد الأدنى للطلب هو €${minOrderValue.toFixed(2)}.`
                  : `Der Mindestbestellwert beträgt €${minOrderValue.toFixed(2)}.`}
              </div>
            )}

            {/* Price Breakdown */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-gray-800 text-xs text-slate-500 dark:text-gray-400">
              <div className="flex items-center justify-between">
                <span>{isAr ? 'المجموع الفرعي' : 'Zwischensumme'}</span>
                <span className="font-medium text-slate-800 dark:text-gray-200">
                  €{Number(rawSubtotal).toFixed(2)}
                </span>
              </div>

              {totalPromoSavings > 0 && (
                <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Gift className="w-3 h-3" />
                    {isAr ? 'توفير العروض (2+1 / تخفيضات)' : 'Aktions-Ersparnis (2+1 / Rabatt)'}
                  </span>
                  <span>-€{Number(totalPromoSavings).toFixed(2)}</span>
                </div>
              )}

              {couponDiscount > 0 && (
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {isAr ? `خصم الكوبون (${appliedCoupon.code})` : `Gutschein-Rabatt (${appliedCoupon.code})`}
                  </span>
                  <span>-€{Number(couponDiscount).toFixed(2)}</span>
                </div>
              )}

              {/* Distance Fee Itemization if applicable */}
              {distanceInfo.distanceKm > 0 && !isFreeDeliveryApplied && (
                <>
                  <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
                    <span>{isAr ? 'رسوم الخدمة الأساسية' : 'Servicepauschale (Basis)'}</span>
                    <span>€{baseServiceFee.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      {isAr
                        ? `رسوم المسافة (${distanceInfo.distanceKm} كم × €${(distanceInfo.perKmRate || 0.10).toFixed(2)}/كم)`
                        : `Entfernungsgebühr (${distanceInfo.distanceKm} km × €${(distanceInfo.perKmRate || 0.10).toFixed(2)}/km)`}
                    </span>
                    <span>+€{(distanceInfo.distanceFee || 0).toFixed(2)}</span>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-gray-300">{isAr ? 'رسوم التوصيل الإجمالية' : 'Liefergebühr gesamt'}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {distanceLoading ? (
                    <span className="text-xs text-slate-400 animate-pulse">{isAr ? 'جارٍ الحساب...' : 'Berechne...'}</span>
                  ) : deliveryFee > 0 ? (
                    `€${deliveryFee.toFixed(2)}`
                  ) : isFreeDeliveryApplied ? (
                    <span className="inline-flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      {isAr ? 'مجاناً' : 'Kostenlos'}
                    </span>
                  ) : (
                    isAr ? 'مجاناً' : 'Kostenlos'
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-gray-800 text-base font-extrabold text-slate-900 dark:text-white">
              <span>{isAr ? 'الإجمالي عند الاستلام' : 'Gesamtbetrag bei Erhalt'}</span>
              <span className="font-mono text-xl text-emerald-600 dark:text-emerald-400">
                €{Number(totalAmount).toFixed(2)}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-gray-500 text-end -mt-1.5">
              {isAr ? 'شامل الضريبة، والدفع نقداً أو بالبطاقة عند الباب' : 'inkl. MwSt., Zahlung bar oder mit Karte beim Fahrer'}
            </p>

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
