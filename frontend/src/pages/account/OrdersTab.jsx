import {
  Bell,
  BellOff,
  CheckCircle2,
  ShoppingBag,
  AlertTriangle,
  XCircle,
  Truck,
  Calendar,
  Sparkles,
  Tag,
  Clock,
  Navigation,
  FileText,
  RotateCcw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { OrderProgressTimeline } from '../../components/OrderProgressTimeline';
import { formatDeliverySlot } from '../../utils/deliverySlot';

export const OrdersTab = ({
  actionFeedback,
  enablingPush,
  getStatusBadge,
  handleCustomerResponse,
  handleEnablePush,
  handleOpenReport,
  handleReorderOrder,
  isAr,
  loadingOrders,
  orders,
  pushStatus,
  reorderingOrderId,
  respondingOrderId
}) => {
  const { language } = useLanguage();

  return (
    <div className="space-y-4">
      {/* Push Notification Opt-in Banner */}
      {pushStatus === 'not-subscribed' && (
        <div className="p-4 rounded-2xl bg-primary-50 dark:bg-primary-950/50 border border-primary-200 dark:border-primary-900/50 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 text-primary-800 dark:text-primary-200 text-xs sm:text-sm">
            <Bell className="w-4 h-4 shrink-0" />
            <span>{isAr ? 'فعّل الإشعارات لتصلك تحديثات حالة طلبك فور حدوثها' : 'Aktivieren Sie Benachrichtigungen, um Bestellstatus-Updates sofort zu erhalten'}</span>
          </div>
          <button
            type="button"
            onClick={handleEnablePush}
            disabled={enablingPush}
            className="px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shrink-0 cursor-pointer disabled:opacity-50 touch-manipulation"
          >
            {enablingPush ? '...' : (isAr ? 'تفعيل' : 'Aktivieren')}
          </button>
        </div>
      )}
      {pushStatus === 'denied' && (
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800 flex items-start gap-2.5 text-slate-500 dark:text-gray-400 text-xs">
          <BellOff className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>{isAr ? 'تم رفض إذن الإشعارات من إعدادات المتصفح' : 'Benachrichtigungen wurden in den Browser-Einstellungen blockiert'}</p>
            {/* Once denied, JS can never re-prompt for permission — a website can't
                undo this itself, only the browser's own site settings can. */}
            <p>
              {isAr
                ? 'لا يمكن للموقع طلب الإذن مرة أخرى تلقائياً. لتفعيلها: اضغط على رمز القفل 🔒 بجانب عنوان الموقع في المتصفح ← الإشعارات ← السماح، ثم أعد تحميل الصفحة.'
                : 'Die Seite kann die Erlaubnis nicht selbst erneut anfragen. Zum Aktivieren: Klicken Sie auf das Schloss-Symbol 🔒 neben der Adresse in Ihrem Browser → Benachrichtigungen → Zulassen, und laden Sie die Seite danach neu.'}
            </p>
          </div>
        </div>
      )}
      {pushStatus === 'unsupported' && (
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800 flex items-start gap-2.5 text-slate-500 dark:text-gray-400 text-xs">
          <BellOff className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            {isAr
              ? 'الإشعارات غير مدعومة في هذا المتصفح، أو أن الصفحة غير محمّلة عبر اتصال آمن (HTTPS).'
              : 'Benachrichtigungen werden von diesem Browser nicht unterstützt, oder die Seite wird nicht über eine sichere Verbindung (HTTPS) geladen.'}
          </p>
        </div>
      )}

      {/* Action Feedback Banner */}
      {actionFeedback.message && (
        <div className={`p-4 rounded-2xl text-xs sm:text-sm flex items-start gap-3 ${actionFeedback.isError ? 'bg-danger-50 text-danger-700 dark:bg-danger-950/60 dark:text-danger-200 border border-danger-300' : 'bg-brand-50 text-brand-800 dark:bg-brand-950/60 dark:text-brand-200 border border-brand-300'}`}>
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="font-semibold">{actionFeedback.message}</span>
        </div>
      )}

      {loadingOrders ? (
        <div className="py-12 text-center text-slate-400">
          <div className="w-8 h-8 mx-auto border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs">{isAr ? 'جارٍ تحميل الطلبات...' : 'Bestellungen werden geladen...'}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-200 mb-4">
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
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition"
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
              className={`bg-white dark:bg-gray-900 rounded-3xl border p-5 sm:p-6 shadow-sm transition hover:shadow-md ${isPendingApproval ? 'border-warning-400 dark:border-warning-700 ring-2 ring-warning-400/20' : 'border-slate-200/80 dark:border-gray-800'}`}
            >
              {/* Pending Approval Customer Alert Banner */}
              {isPendingApproval && (
                <div className="mb-5 p-4 rounded-2xl bg-warning-50 dark:bg-warning-950/60 border border-warning-300 dark:border-warning-800 text-xs sm:text-sm space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-warning-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-warning-900 dark:text-warning-200 text-sm sm:text-base">
                        {isAr ? 'تعديل في الطلب بسبب عدم توفر بعض المنتجات' : 'Bestelländerung durch Supermarkt (Artikel nicht vorrätig)'}
                      </h4>
                      <p className="text-warning-800 dark:text-warning-300 mt-1 text-xs leading-relaxed">
                        {isAr 
                          ? 'نعتذر، لم تكن بعض المنتجات متوفرة وتم تعديل الطلب. يرجى مراجعة القائمة والموافقة على التعديل للمتابعة في التوصيل:'
                          : 'Einzelne Artikel waren leider vergriffen. Die Bestellung wurde angepasst. Bitte prüfen und bestätigen Sie die Änderung:'}
                      </p>
                      {order.modificationReason && (
                        <div className="mt-2 p-2.5 bg-white/80 dark:bg-gray-900/80 rounded-xl border border-warning-200 dark:border-warning-800/80 text-warning-900 dark:text-warning-200 text-xs font-medium">
                          <strong>{isAr ? 'ملاحظة المتجر:' : 'Hinweis der Filiale:'}</strong> {order.modificationReason}
                        </div>
                      )}
                      {order.originalTotalAmount && (
                        <div className="mt-2 flex items-center gap-3 text-xs flex-wrap">
                          <span className="text-slate-500">{isAr ? 'المبلغ الأصلي:' : 'Vorheriger Betrag:'} <del className="font-mono">€{Number(order.originalTotalAmount).toFixed(2)}</del></span>
                          <span className="font-bold text-brand-700 dark:text-brand-300">{isAr ? 'المبلغ الجديد المطلوب:' : 'Neuer Betrag:'} <span className="font-mono text-sm">€{Number(order.totalAmount).toFixed(2)}</span></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Decision Buttons */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-warning-200 dark:border-warning-800/60">
                    <button
                      type="button"
                      onClick={() => handleCustomerResponse(order.id, 'accept')}
                      disabled={respondingOrderId === order.id}
                      className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
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
                      className="px-4 py-2.5 rounded-xl bg-danger-50 hover:bg-danger-100 dark:bg-danger-950/50 dark:hover:bg-danger-900/60 text-danger-700 dark:text-danger-300 font-bold text-xs border border-danger-200 dark:border-danger-900/60 transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
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
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
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
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-danger-50 dark:bg-danger-950/40 text-danger-700 dark:text-danger-300 text-[11px] font-bold border border-danger-200/80 dark:border-danger-900/50">
                      <Sparkles className="w-3 h-3 text-danger-500" />
                      <span>{isAr ? 'عروض' : 'Aktion'}: -€{Number(order.promotionDiscount).toFixed(2)}</span>
                    </span>
                  )}
                  {Number(order.couponDiscount) > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-promo-50 dark:bg-promo-950/40 text-promo-700 dark:text-promo-300 text-[11px] font-bold border border-promo-200/80 dark:border-promo-900/50">
                      <Tag className="w-3 h-3 text-promo-500" />
                      <span>{order.couponCode || (isAr ? 'كوبون' : 'Gutschein')}: -€{Number(order.couponDiscount).toFixed(2)}</span>
                    </span>
                  )}
                  {getStatusBadge(order.status)}
                  <div className="text-end">
                    <div className="text-xs text-slate-400">{isAr ? 'الإجمالي' : 'Gesamt'}</div>
                    <div className="font-extrabold text-base sm:text-lg text-brand-600 dark:text-brand-400 font-mono">
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
                      <Clock className="w-3 h-3 text-brand-600 dark:text-brand-400" />
                      <span>{isAr ? 'موعد التوصيل' : 'Liefer-Zeitfenster'}</span>
                    </strong>
                    <span className="font-bold text-brand-700 dark:text-brand-300">
                      {formatDeliverySlot(order.deliverySlot, isAr)}
                    </span>
                  </div>
                )}
                {order.deliveryDistanceKm != null && Number(order.deliveryDistanceKm) > 0 && (
                  <div>
                    <strong className="block text-slate-400 text-[11px] uppercase tracking-wider flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-brand-600 dark:text-brand-400" />
                      <span>{isAr ? 'المسافة والتوصيل' : 'Distanz & Lieferung'}</span>
                    </strong>
                    <span className="font-semibold text-slate-700 dark:text-gray-300">
                      ~{order.deliveryDistanceKm} km {Number(order.deliveryFee) > 0 ? `(€${Number(order.deliveryFee).toFixed(2)})` : `(${isAr ? 'مجاناً' : 'Kostenlos'})`}
                    </span>
                  </div>
                )}
                <div>
                  <strong className="block text-slate-400 text-[11px] uppercase tracking-wider">{isAr ? 'طريقة الدفع' : 'Zahlung'}</strong>
                  <span className="font-semibold text-brand-600 dark:text-brand-400">
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

              {/* Footer Actions: Print/View Order Report & Reorder */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-gray-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenReport(order)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 text-xs font-semibold transition cursor-pointer touch-manipulation"
                  >
                    <FileText className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                    <span>{isAr ? 'عرض تقرير الطلب (طباعة)' : 'Bestellbericht drucken'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={reorderingOrderId === order.id}
                    onClick={() => handleReorderOrder(order)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 dark:hover:bg-brand-900/60 text-brand-700 dark:text-brand-300 text-xs font-bold transition cursor-pointer disabled:opacity-50 touch-manipulation"
                    title={isAr ? 'إعادة طلب نفس المنتجات المتوفرة إلى السلة' : 'Gleiche verfügbare Artikel erneut in den Warenkorb legen'}
                  >
                    <RotateCcw className={`w-3.5 h-3.5 text-brand-600 shrink-0 ${reorderingOrderId === order.id ? 'animate-spin' : ''}`} />
                    <span>{reorderingOrderId === order.id ? (isAr ? 'جارٍ الإضافة...' : 'Wird hinzugefügt...') : (isAr ? 'إعادة الطلب ↺' : 'Erneut bestellen')}</span>
                  </button>
                </div>

                <span className="text-[11px] text-slate-400 text-center sm:text-end">
                  {order.orderItems?.length || 0} {isAr ? 'منتجات' : 'Positionen'}
                </span>
              </div>

            </div>
          );
        })
      )}
    </div>
  );
};
