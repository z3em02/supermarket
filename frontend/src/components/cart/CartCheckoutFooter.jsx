import {
  Tag,
  X,
  AlertCircle,
  Gift,
  MapPin,
  Truck
} from 'lucide-react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

export const CartCheckoutFooter = ({
  ArrowIcon,
  amountUntilFreeDelivery,
  baseServiceFee,
  addressMissing,
  belowMinOrder,
  coupon,
  couponDiscount,
  deliveryFee,
  distanceInfo,
  distanceLoading,
  handlePlaceOrder,
  isAr,
  isFreeDeliveryApplied,
  isVerified,
  minOrderValue,
  rawSubtotal,
  submitting,
  totalAmount,
  totalPromoSavings
}) => {
  const { isAuthenticated } = useCustomerAuth();
  const {
    appliedCoupon,
    showCouponField,
    handleApplyCoupon,
    couponInput,
    setCouponInput,
    validatingCoupon,
    setShowCouponField,
    handleRemoveCoupon,
    couponError
  } = coupon;

  return (
    <div className="p-5 sm:p-6 border-t border-slate-100 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-950/70 space-y-3 shrink-0">
      {/* Coupon Code Input & Applied Pill */}
      <div className="space-y-2">
        {!appliedCoupon ? (
          showCouponField ? (
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  autoFocus
                  type="text"
                  placeholder={isAr ? 'أدخل رمز الكوبون...' : 'Gutscheincode eingeben...'}
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold uppercase bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-900 dark:text-white placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
              className="flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>{isAr ? 'لديك رمز كوبون؟' : 'Gutscheincode hinzufügen'}</span>
            </button>
          )
        ) : (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Tag className="w-4 h-4 text-brand-600 shrink-0" />
              <div className="min-w-0 truncate">
                <span className="font-mono font-bold text-brand-900 dark:text-brand-300">
                  {appliedCoupon.code}
                </span>
                <span className="text-[11px] text-brand-700 dark:text-brand-400 ml-1.5">
                  (-€{Number(appliedCoupon.discountAmount).toFixed(2)})
                  {appliedCoupon.isFreeShipping && ` + ${isAr ? 'شحن مجاني' : 'Gratis Lieferung'}`}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveCoupon}
              className="p-1 hover:bg-brand-100 dark:hover:bg-brand-900/50 rounded-lg text-brand-800 dark:text-brand-300 transition cursor-pointer shrink-0"
              title={isAr ? 'إزالة الكوبون' : 'Gutschein entfernen'}
              aria-label={isAr ? 'إزالة الكوبون' : 'Gutschein entfernen'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {couponError && (
          <p className="text-[11px] text-danger-600 dark:text-danger-400 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{couponError}</span>
          </p>
        )}
      </div>

      {amountUntilFreeDelivery > 0 && (
        <div className="text-[11px] font-semibold text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900/40 rounded-xl px-3 py-1.5 text-center">
          {isAr
            ? `أضف منتجات بقيمة €${amountUntilFreeDelivery.toFixed(2)} أخرى للحصول على توصيل مجاني!`
            : `Noch €${amountUntilFreeDelivery.toFixed(2)} bis zur kostenlosen Lieferung!`}
        </div>
      )}

      {addressMissing && (
        <div role="alert" className="text-[11px] font-semibold text-danger-800 dark:text-danger-300 bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-900/40 rounded-xl px-3 py-1.5 text-center">
          {isAr ? 'أدخل عنوان التوصيل للمتابعة.' : 'Bitte Lieferadresse eingeben, um zu bestellen.'}
        </div>
      )}

      {belowMinOrder && (
        <div className="text-[11px] font-semibold text-warning-800 dark:text-warning-300 bg-warning-50 dark:bg-warning-950/40 border border-warning-200 dark:border-warning-900/40 rounded-xl px-3 py-1.5 text-center">
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
          <div className="flex items-center justify-between text-promo-600 dark:text-promo-400 font-medium">
            <span className="flex items-center gap-1">
              <Gift className="w-3 h-3" />
              {isAr ? 'توفير العروض (2+1 / تخفيضات)' : 'Aktions-Ersparnis (2+1 / Rabatt)'}
            </span>
            <span>-€{Number(totalPromoSavings).toFixed(2)}</span>
          </div>
        )}

        {couponDiscount > 0 && (
          <div className="flex items-center justify-between text-brand-600 dark:text-brand-400 font-medium">
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
                <MapPin className="w-3 h-3 text-brand-600 dark:text-brand-400" />
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
          <span className="font-bold text-brand-600 dark:text-brand-400">
            {distanceLoading ? (
              <span className="text-xs text-slate-500 animate-pulse">{isAr ? 'جارٍ الحساب...' : 'Berechne...'}</span>
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
        <span className="font-mono text-xl text-brand-600 dark:text-brand-400">
          €{Number(totalAmount).toFixed(2)}
        </span>
      </div>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 text-end -mt-1.5">
        {isAr ? 'شامل الضريبة، والدفع نقداً أو بالبطاقة عند الباب' : 'inkl. MwSt., Zahlung bar oder mit Karte beim Fahrer'}
      </p>

      <button
        type="button"
        onClick={handlePlaceOrder}
        disabled={submitting || (isAuthenticated && (!isVerified || belowMinOrder || addressMissing))}
        className="w-full py-4 px-6 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-black text-sm shadow-lg shadow-brand-600/25 transition flex items-center justify-center gap-2 cursor-pointer"
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
  );
};
