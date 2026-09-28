import {
  Clock,
  UserCheck,
  Banknote,
  CreditCard,
  Phone,
  MapPin,
  Navigation,
  AlertCircle,
  Package,
  ChevronUp,
  ChevronDown,
  Truck,
  CheckCircle2
} from 'lucide-react';
import { formatDeliverySlot } from '../../utils/deliverySlot';

export const DriverOrderCard = ({
  activeDisplayName,
  badge,
  index,
  isAr,
  isUpdating,
  itemsExpanded,
  openMaps,
  order,
  setConfirmModal,
  setDeliveredCashCollected,
  toggleExpandItems
}) => {
  const isOutForDelivery = ['out_for_delivery', 'shipped'].includes((order.status || '').toLowerCase());
  const isDelivered = (order.status || '').toLowerCase() === 'delivered';
  // Parse customer delivery address & contact details
  const customerName = order.customerName || order.customer?.name || (isAr ? 'عميل' : 'Kunde');
  const customerPhone = order.customerPhone || order.customer?.phone;
  const deliveryAddress = order.deliveryAddress || order.customer?.address || '';
  const deliveryNotes = order.deliveryNotes || order.notes;
  const slotFormatted = order.deliverySlot ? formatDeliverySlot(order.deliverySlot, isAr) : null;
  const totalAmount = typeof order.totalAmount === 'number' ? order.totalAmount.toFixed(2) : '0.00';
  const isCash = order.paymentMethod === 'cash_on_delivery' || !order.paymentMethod;

  return (
    <article 
      className={`bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md ${
        isOutForDelivery
          ? 'border-amber-400/80 dark:border-amber-500/60 ring-2 ring-amber-400/20'
          : isDelivered
          ? 'border-slate-200/80 dark:border-gray-800 opacity-80'
          : 'border-slate-200/90 dark:border-gray-800'
      }`}
    >
      {/* Top card banner */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-gray-900/50">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-gray-300 font-black text-xs flex items-center justify-center">
            #{index + 1}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                #{order.id.slice(0, 8).toUpperCase()}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${badge.bg}`}>
                {badge.label}
              </span>
            </div>
            {slotFormatted && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{slotFormatted}</span>
              </div>
            )}
            {order.assignedDriverName && (
              <div className={`flex items-center gap-1.5 text-xs font-bold mt-0.5 ${
                order.assignedDriverName === activeDisplayName
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-400 dark:text-gray-500'
              }`}>
                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {order.assignedDriverName === activeDisplayName
                    ? (isAr ? 'مُعيَّن لك' : 'Dir zugewiesen')
                    : (isAr ? `مُعيَّن لـ ${order.assignedDriverName}` : `Zugewiesen an ${order.assignedDriverName}`)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Price & Cash Badge */}
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
            isCash 
              ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/70 dark:border-amber-800 dark:text-amber-200' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/70 dark:border-emerald-800 dark:text-emerald-200'
          }`}>
            {isCash ? <Banknote className="w-4 h-4 text-amber-600 dark:text-amber-400" /> : <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            <div className="text-right rtl:text-left">
              <div className="text-xs font-medium leading-none">
                {isCash 
                  ? (isAr ? 'الدفع نقداً عند الاستلام' : 'Barzahlung bei Erhalt') 
                  : (isAr ? 'مدفوع إلكترونياً' : 'Bereits bezahlt')}
              </div>
              <div className="text-sm font-black mt-0.5">
                €{totalAmount}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body: Recipient & Location */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Customer Name & Direct Call */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {isAr ? 'المستلم' : 'Empfänger'}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
              {customerName}
            </h2>
          </div>

          {customerPhone ? (
            <a
              href={`tel:${customerPhone}`}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm transition active:scale-95 shrink-0"
              title={isAr ? 'اتصال بالعميل' : 'Kunde anrufen'}
            >
              <Phone className="w-4 h-4" />
              <span>{isAr ? 'اتصال' : 'Anrufen'}</span>
            </a>
          ) : (
            <span className="text-xs text-slate-400 dark:text-gray-500 italic">
              {isAr ? 'بدون رقم هاتف' : 'Keine Telefonnummer'}
            </span>
          )}
        </div>

        {/* Address with One-Tap Maps Button */}
        <div className="bg-slate-50 dark:bg-gray-800/60 rounded-2xl p-3.5 border border-slate-200/70 dark:border-gray-750 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <MapPin className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                {deliveryAddress || (isAr ? 'العنوان غير محدد' : 'Keine Adresse hinterlegt')}
              </p>
              {order.customer?.floorApartment && (
                <p className="text-xs font-semibold text-slate-600 dark:text-gray-300 mt-0.5">
                  {isAr ? `الطابق / الشقة: ${order.customer.floorApartment}` : `Stock / Tür: ${order.customer.floorApartment}`}
                </p>
              )}
            </div>
          </div>

          {deliveryAddress && (
            <button
              type="button"
              onClick={() => openMaps(deliveryAddress)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-xs transition active:scale-95 shrink-0"
            >
              <Navigation className="w-4 h-4" />
              <span>{isAr ? 'فتح في خرائط جوجل' : 'In Google Maps öffnen'}</span>
            </button>
          )}
        </div>

        {/* Delivery Notes for Driver */}
        {deliveryNotes && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl p-3 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block">
                {isAr ? 'ملاحظة خاصة للتوصيل:' : 'Wichtiger Lieferhinweis:'}
              </span>
              <p className="text-xs text-amber-900 dark:text-amber-200 font-medium whitespace-pre-line mt-0.5">
                {deliveryNotes}
              </p>
            </div>
          </div>
        )}

        {/* Collapsible Order Items Checklist */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => toggleExpandItems(order.id)}
            className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            <span className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-slate-400" />
              <span>
                {isAr 
                  ? `محتويات الطلب (${order.orderItems?.length || 0} صنف)` 
                  : `Warenliste (${order.orderItems?.length || 0} Artikel)`}
              </span>
            </span>
            {itemsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {itemsExpanded && (
            <div className="mt-2 divide-y divide-slate-100 dark:divide-gray-800 rounded-xl bg-slate-50/70 dark:bg-gray-800/40 p-2 border border-slate-200/60 dark:border-gray-800">
              {order.orderItems && order.orderItems.length > 0 ? (
                order.orderItems.map((item, idx) => (
                  <div key={item.id || idx} className="py-1.5 px-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        {item.quantity}x
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-gray-200">
                        {isAr && item.product?.nameAr ? item.product.nameAr : (item.product?.name || item.productName || item.product?.sku || 'Artikel')}
                      </span>
                    </div>
                    <span className="font-bold text-slate-600 dark:text-gray-400">
                      €{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic p-2">
                  {isAr ? 'لا توجد تفاصيل للمنتجات' : 'Keine Artikeldetails hinterlegt'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions Footer */}
      <div className="p-4 sm:p-5 bg-slate-50 dark:bg-gray-900/80 border-t border-slate-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-500 dark:text-gray-400">
          {isAr 
            ? `تاريخ الطلب: ${new Date(order.createdAt).toLocaleDateString('ar-EG')}` 
            : `Bestellt am: ${new Date(order.createdAt).toLocaleDateString('de-AT')}`}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!isOutForDelivery && !isDelivered && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => setConfirmModal({ order, action: 'start' })}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              <Truck className="w-4 h-4" />
              <span>{isAr ? 'بدء التوصيل / في الطريق' : 'Fahrt starten (Unterwegs)'}</span>
            </button>
          )}

          {!isDelivered && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => {
                setDeliveredCashCollected(isCash);
                setConfirmModal({ order, action: 'deliver' });
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isAr ? 'تم التسليم بنجاح' : 'Erfolgreich zugestellt'}</span>
            </button>
          )}

          {isDelivered && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
              <span>{isAr ? 'مكتمل ومسلّم' : 'Abgeschlossen & Übergeben'}</span>
            </span>
          )}
        </div>
      </div>
    </article>
  );
};
