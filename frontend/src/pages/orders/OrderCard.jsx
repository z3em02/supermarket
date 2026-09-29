import {
  Calendar,
  Truck,
  User,
  Sparkles,
  Tag,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Lock,
  ChevronDown,
  Printer,
  Edit,
  SlidersHorizontal
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatDeliverySlot } from '../../utils/deliverySlot';
import { isOrderStopped } from '../../utils/orderStatus';
import { parseOrderNotes } from './orderNotes';
import { useStatusBadge } from './useStatusBadge';

export const OrderCard = ({
  handleOpenEditModal,
  handleOpenPrintModal,
  handleQuickStatusChange,
  handleViewDetails,
  isExpanded,
  openStatusModal,
  order,
  setAcceptModalDriver,
  setAcceptModalOrder,
  toggleOrderItemsExpand,
  updating
}) => {
  const { language, t } = useLanguage();
  const getStatusBadge = useStatusBadge();
  const badge = getStatusBadge(order.status);
  const StatusIcon = badge.icon;
  const currentStatus = order.status?.toLowerCase();
  const totalItems = (order.orderItems || []).reduce((s, i) => s + i.quantity, 0);
  const { customNotes, customerResponse } = parseOrderNotes(order.adminNotes, language);

  return (
    <div 
      className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/90 dark:border-gray-800 shadow-sm hover:shadow-md transition-all overflow-hidden"
    >
      {/* ── 1. Compact Header Bar: Status + ID + Timestamp + Total Price ── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 sm:px-5 py-3 bg-slate-50/80 dark:bg-gray-950/50 border-b border-slate-100 dark:border-gray-850">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status badge */}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${badge.classes}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {badge.label}
          </span>

          {/* Order ID */}
          <span className="font-bold text-slate-900 dark:text-white text-xs font-mono">
            #{order.id.slice(0, 8).toUpperCase()}
          </span>

          {/* Date & Time */}
          <span className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-500" />
            {new Date(order.createdAt).toLocaleDateString(language === 'ar' ? 'ar-DE' : 'de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            <span className="text-slate-300 dark:text-gray-700">&bull;</span>
            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>

          {/* Delivery tag */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success-50 dark:bg-success-950/40 text-success-700 dark:text-success-300 text-[11px] font-bold border border-success-200/80 dark:border-success-900/50">
            <Truck className="w-3 h-3" />
            {language === 'ar' ? 'توصيل منزلي' : 'Hauszustellung'}
          </span>

          {order.assignedDriverName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning-50 dark:bg-warning-950/40 text-warning-700 dark:text-warning-300 text-[11px] font-bold border border-warning-200/80 dark:border-warning-900/50">
              <User className="w-3 h-3 text-warning-500" />
              <span>{order.assignedDriverName}</span>
            </span>
          )}

          {Number(order.promotionDiscount) > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-danger-50 dark:bg-danger-950/40 text-danger-700 dark:text-danger-300 text-[11px] font-bold border border-danger-200/80 dark:border-danger-900/50">
              <Sparkles className="w-3 h-3 text-danger-500" />
              <span>{t('promotions')}: -€{Number(order.promotionDiscount).toFixed(2)}</span>
            </span>
          )}

          {Number(order.couponDiscount) > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-promo-50 dark:bg-promo-950/40 text-promo-700 dark:text-promo-300 text-[11px] font-bold border border-promo-200/80 dark:border-promo-900/50" title={order.couponCode ? `Code: ${order.couponCode}` : undefined}>
              <Tag className="w-3 h-3 text-promo-500" />
              <span>{order.couponCode || t('coupon')}: -€{Number(order.couponDiscount).toFixed(2)}</span>
            </span>
          )}
        </div>

        {/* Amount + items count */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-gray-800 text-slate-600 dark:text-slate-300">
            {totalItems} {t('items')}
          </span>
          <span className="text-lg font-black text-primary-600 dark:text-primary-400 font-mono tracking-tight">
            €{Number(order.totalAmount).toFixed(2)}
          </span>
        </div>
      </div>

      {/* ── 2. Card Content: Clean 2-Column Info & Notes ── */}
      <div className="p-4 sm:p-5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Left Column: Customer details */}
          <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-gray-950/30 border border-slate-100 dark:border-gray-800/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                <User className="w-3.5 h-3.5 text-primary-600" />
                <span>{order.customer?.name || order.customerName || 'Kunde'}</span>
              </div>
              {(order.customerPhone || order.customer?.phone) && (
                <a
                  href={`tel:${order.customerPhone || order.customer?.phone}`}
                  className="font-mono text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 font-bold inline-flex items-center gap-1"
                >
                  <Phone className="w-3 h-3 text-slate-500" />
                  <span>{order.customerPhone || order.customer?.phone}</span>
                </a>
              )}
            </div>

            {order.deliveryAddress && (
              <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-300 pt-0.5">
                <MapPin className="w-3.5 h-3.5 text-success-600 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{order.deliveryAddress}</span>
              </div>
            )}
            {formatDeliverySlot(order.deliverySlot, language === 'ar') && (
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 pt-0.5">
                <Clock className="w-3.5 h-3.5 text-success-600 shrink-0" />
                <span>{formatDeliverySlot(order.deliverySlot, language === 'ar')}</span>
              </div>
            )}
          </div>

          {/* Right Column: Customer Response & Alerts */}
          <div className="space-y-2">
            {/* Customer Acceptance Badge (Bilingual & Clean) */}
            {customerResponse && customerResponse.type === 'accepted' && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-success-50 dark:bg-success-950/50 border border-success-200 dark:border-success-900/60 text-success-800 dark:text-success-200 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-success-600 shrink-0" />
                <span>{customerResponse.label}</span>
              </div>
            )}

            {customerResponse && customerResponse.type === 'declined' && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-danger-50 dark:bg-danger-950/50 border border-danger-200 dark:border-danger-900/60 text-danger-800 dark:text-danger-200 text-xs font-bold">
                <XCircle className="w-4 h-4 text-danger-600 shrink-0" />
                <span>{customerResponse.label}</span>
              </div>
            )}

            {/* Pending customer approval notification */}
            {order.status === 'pending_customer_approval' && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-warning-50 dark:bg-warning-950/50 border border-warning-300 dark:border-warning-800 text-warning-900 dark:text-warning-200 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-warning-600 mt-0.5" />
                <div>
                  <span className="font-bold block">
                    {language === 'ar' ? 'تعديل مقترح (بانتظار موافقة العميل)' : 'Anpassung vorgeschlagen (Wartet auf Bestätigung)'}
                  </span>
                  {order.modificationReason && (
                    <span className="text-[11px] text-warning-800 dark:text-warning-300 italic block mt-0.5">
                      "{order.modificationReason}"
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Customer note */}
            {order.notes && (
              <div className="flex items-start gap-1.5 p-2 rounded-lg bg-slate-50 dark:bg-gray-950/50 border border-slate-200/60 dark:border-gray-800 text-[11px] text-slate-600 dark:text-slate-400">
                <FileText className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                <span className="italic truncate">
                  <strong className="not-italic text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'ملاحظة العميل:' : 'Kundennotiz:'}
                  </strong> "{order.notes}"
                </span>
              </div>
            )}

            {/* Custom Admin note */}
            {customNotes && (
              <div className="flex items-start gap-1.5 p-2 rounded-lg bg-promo-50/70 dark:bg-promo-950/40 border border-promo-200/70 dark:border-promo-900/40 text-[11px] text-promo-800 dark:text-promo-300">
                <Lock className="w-3 h-3 text-promo-600 shrink-0 mt-0.5" />
                <span className="truncate">
                  <strong className="text-promo-900 dark:text-promo-200">{t('adminNotes')}:</strong> {customNotes}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Compact & Collapsible Items Bar ── */}
        <div className="pt-2 border-t border-slate-100 dark:border-gray-800/80">
          <div className="flex items-center justify-between gap-3 text-xs">
            {/* Compact preview chips */}
            <div className="flex items-center gap-1.5 overflow-hidden flex-1 text-slate-500 dark:text-gray-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                {language === 'ar' ? 'المنتجات:' : 'Artikel:'}
              </span>
              <span className="truncate">
                {(order.orderItems || []).map((it) => {
                  const name = (language === 'ar' ? it.product?.nameAr : it.product?.nameDe) || it.product?.name || 'Artikel';
                  return `${name} (${it.quantity}×)`;
                }).join(', ')}
              </span>
            </div>

            {/* Toggle Button */}
            <button
              type="button"
              onClick={() => toggleOrderItemsExpand(order.id)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary-600 dark:text-primary-400 hover:underline shrink-0 cursor-pointer"
            >
              <span>
                {isExpanded
                  ? language === 'ar' ? 'إخفاء التفاصيل' : 'Weniger'
                  : language === 'ar' ? `عرض ${order.orderItems?.length || 0} عناصر` : `${order.orderItems?.length || 0} Artikel anzeigen`}
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Expanded item details */}
          {isExpanded && (
            <div className="mt-2.5 bg-slate-50 dark:bg-gray-950/60 rounded-xl border border-slate-200/70 dark:border-gray-800 overflow-hidden divide-y divide-slate-100 dark:divide-gray-800/80 animate-fade-in">
              {(order.orderItems || []).map((item, idx) => {
                const itemName = (language === 'ar' ? item.product?.nameAr : item.product?.nameDe) || item.product?.name || item.productId;
                const subtotal = Number(item.subtotal || item.price * item.quantity);
                const unitPrice = Number(item.price || (item.quantity > 0 ? subtotal / item.quantity : 0));

                return (
                  <div key={item.id || idx} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-5 h-5 rounded bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {item.quantity}×
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{itemName}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 font-mono">
                      <span className="text-[11px] text-slate-500">€{unitPrice.toFixed(2)}/Stk.</span>
                      <span className="font-bold text-slate-900 dark:text-white">€{subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Clean, Grouped Action Footer ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 sm:px-5 py-2.5 bg-slate-50/80 dark:bg-gray-950/50 border-t border-slate-100 dark:border-gray-850">
        {/* Left: Utilities */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleViewDetails(order)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-850 text-slate-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer touch-manipulation"
          >
            {t('viewDetails')}
          </button>

          <button
            onClick={() => handleOpenPrintModal(order)}
            title={t('printInvoice')}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-850 text-slate-500 dark:text-slate-400 transition cursor-pointer touch-manipulation"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          {currentStatus !== 'delivered' && !isOrderStopped(currentStatus) && (
            <button
              onClick={() => handleOpenEditModal(order)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-warning-50 hover:bg-warning-100 text-warning-800 dark:bg-warning-950/60 dark:hover:bg-warning-900/60 dark:text-warning-300 border border-warning-300 dark:border-warning-800/80 transition cursor-pointer touch-manipulation"
            >
              <Edit className="w-3 h-3" />
              <span>{language === 'ar' ? 'تعديل الطلب' : 'Auftrag bearbeiten'}</span>
            </button>
          )}

          <button
            onClick={() => openStatusModal(order, order.status)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-gray-700 transition cursor-pointer touch-manipulation"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>{t('changeStatus')}</span>
          </button>
        </div>

        {/* Right: Primary Step Workflow Button + Delete */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 flex-wrap pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-gray-800">
          <div className="flex items-center gap-1.5 flex-wrap">
            {currentStatus === 'pending' && (
              <>
                <button onClick={() => { setAcceptModalOrder(order); setAcceptModalDriver(order.assignedDriverName || ''); }} disabled={updating}
                  className="px-3 py-1.5 bg-success-600 hover:bg-success-700 text-white rounded-lg font-bold text-xs transition shadow-sm cursor-pointer touch-manipulation">
                  {t('accept')}
                </button>
                <button onClick={() => openStatusModal(order, 'declined')} disabled={updating}
                  className="px-2.5 py-1.5 bg-danger-50 hover:bg-danger-100 dark:bg-danger-950/40 text-danger-700 dark:text-danger-300 border border-danger-200 dark:border-danger-900/50 rounded-lg font-bold text-xs transition cursor-pointer touch-manipulation">
                  {t('decline')}
                </button>
              </>
            )}
            {currentStatus === 'accepted' && (
              <button onClick={() => handleQuickStatusChange(order.id, 'preparing')} disabled={updating}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-promo-600 hover:bg-promo-700 text-white rounded-lg font-bold text-xs transition shadow-sm cursor-pointer touch-manipulation">
                <Clock className="w-3 h-3" />
                <span>{t('preparing')}</span>
              </button>
            )}
            {currentStatus === 'preparing' && (
              <button onClick={() => handleQuickStatusChange(order.id, 'shipped')} disabled={updating}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold text-xs transition shadow-sm cursor-pointer touch-manipulation">
                <Truck className="w-3 h-3" />
                <span>{t('markShipped')}</span>
              </button>
            )}
            {currentStatus === 'shipped' && (
              <button onClick={() => handleQuickStatusChange(order.id, 'delivered')} disabled={updating}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-success-600 hover:bg-success-700 text-white rounded-lg font-bold text-xs transition shadow-sm cursor-pointer touch-manipulation">
                <CheckCircle2 className="w-3 h-3" />
                <span>{t('markDelivered')}</span>
              </button>
            )}
            {currentStatus === 'declined' && (
              <button onClick={() => { setAcceptModalOrder(order); setAcceptModalDriver(order.assignedDriverName || ''); }} disabled={updating}
                className="px-3 py-1.5 border border-success-300 dark:border-success-700 text-success-700 dark:text-success-300 hover:bg-success-50 dark:hover:bg-success-950/30 rounded-lg font-bold text-xs transition cursor-pointer touch-manipulation">
                {t('accept')}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
