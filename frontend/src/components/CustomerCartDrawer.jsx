import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Trash2,
  Truck,
  AlertCircle,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { getApiUrl } from '../utils/api';
import { getCsrfToken } from '../utils/csrf';
import {
  todayIso,
  buildDeliverySlot,
  fetchActiveDeliveryWindows,
  getAvailableWindowsForDate,
  getEarliestAvailableDate
} from '../utils/deliverySlot';
import { useCouponCode } from './cart/useCouponCode';
import { CartCheckoutFooter } from './cart/CartCheckoutFooter';
import { DeliveryDetailsForm } from './cart/DeliveryDetailsForm';
import { LoginToCheckoutPrompt } from './cart/LoginToCheckoutPrompt';
import { CartItemList } from './cart/CartItemList';
import { EmptyCart } from './cart/EmptyCart';
import { OrderPlacedConfirmation } from './cart/OrderPlacedConfirmation';

export const CustomerCartDrawer = ({
  isOpen,
  onClose,
  cart,
  updateQuantity,
  removeFromCart,
  clearCart
}) => {
  const { customer, isAuthenticated } = useCustomerAuth();
  const { language } = useLanguage();
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
  const coupon = useCouponCode({ cart, isAr });
  const { appliedCoupon, setAppliedCoupon } = coupon;

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
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-200 dark:border-brand-900/40 shrink-0">
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
                className="p-1.5 sm:p-2 text-slate-400 hover:text-danger-600 dark:hover:text-danger-400 rounded-xl hover:bg-danger-50 dark:hover:bg-danger-950/40 transition cursor-pointer touch-manipulation"
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
            <OrderPlacedConfirmation
              isAr={isAr}
              navigate={navigate}
              onClose={onClose}
              placedOrder={placedOrder}
              setPlacedOrder={setPlacedOrder}
            />
          ) : cart.length === 0 ? (
            /* Empty Cart View */
            <EmptyCart isAr={isAr} />
          ) : (
            /* Items List & Checkout Form */
            <div className="space-y-6">
              
              {/* Product items */}
              <CartItemList
                cartWithPromos={cartWithPromos}
                isAr={isAr}
                removeFromCart={removeFromCart}
                updateQuantity={updateQuantity}
              />

              {/* Zero-Payment note */}
              <div className="flex items-center gap-2 text-[11px] font-semibold text-brand-700 dark:text-brand-400">
                <Truck className="w-3.5 h-3.5 shrink-0" />
                <span>{isAr ? 'الدفع عند الاستلام فقط (نقداً أو بالبطاقة)' : 'Zahlung erst bei Lieferung (Bar oder Karte)'}</span>
              </div>

              {error && (
                <div className="p-3.5 rounded-2xl bg-danger-50 dark:bg-danger-950/50 border border-danger-200 dark:border-danger-900/50 text-danger-700 dark:text-danger-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Checkout Auth Condition */}
              {!isAuthenticated ? (
                /* Unauthenticated prompt */
                <LoginToCheckoutPrompt isAr={isAr} navigate={navigate} onClose={onClose} />
              ) : (
                /* Authenticated Customer Delivery Form */
                <DeliveryDetailsForm
                  allowedPostalCodes={allowedPostalCodes}
                  deliveryAddress={deliveryAddress}
                  deliveryDate={deliveryDate}
                  deliveryNotes={deliveryNotes}
                  deliveryWindows={deliveryWindows}
                  distanceInfo={distanceInfo}
                  isAr={isAr}
                  isPostalCodeAllowed={isPostalCodeAllowed}
                  onClose={onClose}
                  selectedWindow={selectedWindow}
                  setDeliveryAddress={setDeliveryAddress}
                  setDeliveryDate={setDeliveryDate}
                  setDeliveryNotes={setDeliveryNotes}
                  setSelectedWindow={setSelectedWindow}
                />
              )}

            </div>
          )}

        </div>

        {/* Drawer Footer / Checkout Button */}
        {cart.length > 0 && !placedOrder && (
          <CartCheckoutFooter
            ArrowIcon={ArrowIcon}
            amountUntilFreeDelivery={amountUntilFreeDelivery}
            baseServiceFee={baseServiceFee}
            belowMinOrder={belowMinOrder}
            coupon={coupon}
            couponDiscount={couponDiscount}
            deliveryFee={deliveryFee}
            distanceInfo={distanceInfo}
            distanceLoading={distanceLoading}
            handlePlaceOrder={handlePlaceOrder}
            isAr={isAr}
            isFreeDeliveryApplied={isFreeDeliveryApplied}
            isVerified={isVerified}
            minOrderValue={minOrderValue}
            rawSubtotal={rawSubtotal}
            submitting={submitting}
            totalAmount={totalAmount}
            totalPromoSavings={totalPromoSavings}
          />
        )}

      </div>
    </div>
  );
};
