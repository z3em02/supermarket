import {
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
  Edit
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatDeliverySlot } from '../../utils/deliverySlot';
import { isOrderStopped } from '../../utils/orderStatus';
import { parseOrderNotes } from './orderNotes';
import { useStatusBadge } from './useStatusBadge';

// Compact order card for the 3-column Orders grid: scan + one-click triage.
// Everything else (status, driver, slot, notes, items) lives in the drawer
// opened by "Details".
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
  const isAr = language === 'ar';
  const badge = useStatusBadge()(order.status);
  const StatusIcon = badge.icon;
  const currentStatus = order.status?.toLowerCase();
  const items = order.orderItems || [];
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const { customNotes, customerResponse } = parseOrderNotes(order.adminNotes, language);
  const phone = order.customerPhone || order.customer?.phone;
  const slot = formatDeliverySlot(order.deliverySlot, isAr);
  const created = new Date(order.createdAt);
  const itemName = (it) => (isAr ? it.product?.nameAr : it.product?.nameDe) || it.product?.name || it.productId;
  const openAccept = () => { setAcceptModalOrder(order); setAcceptModalDriver(order.assignedDriverName || ''); };

  const quickBtn = 'inline-flex items-center justify-center gap-1 min-h-9 px-3 rounded-lg font-bold text-xs text-white shadow-sm transition cursor-pointer touch-manipulation disabled:opacity-50';
  const iconBtn = 'inline-flex items-center justify-center min-w-9 min-h-9 rounded-lg border border-slate-200 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-850 text-slate-500 dark:text-slate-400 transition cursor-pointer touch-manipulation';

  return (
    <article className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/90 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden text-xs">
      {/* Header: status, number, total */}
      <div className="flex items-start justify-between gap-2 px-3.5 pt-3">
        <div className="min-w-0 space-y-1">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${badge.classes}`}>
            <StatusIcon className="w-3 h-3" aria-hidden="true" />
            {badge.label}
          </span>
          <p className="text-slate-500 dark:text-slate-400 tabular-nums">
            <span className="font-mono font-bold text-slate-900 dark:text-white">#{order.id.slice(0, 8).toUpperCase()}</span>
            {' · '}
            {created.toLocaleDateString(isAr ? 'ar-DE' : 'de-DE', { day: '2-digit', month: '2-digit' })}
            {' '}
            {created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="text-end shrink-0">
          <p className="text-base font-black text-primary-600 dark:text-primary-400 tabular-nums">€{Number(order.totalAmount).toFixed(2)}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{totalItems} {t('items')}</p>
        </div>
      </div>

      {/* Customer + delivery */}
      <div className="px-3.5 pt-2.5 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-white min-w-0">
            <User className="w-3.5 h-3.5 text-primary-600 shrink-0" aria-hidden="true" />
            <span className="truncate">{order.customer?.name || order.customerName || (isAr ? 'عميل' : 'Kunde')}</span>
          </span>
          {phone && (
            <a href={`tel:${phone}`} dir="ltr"
              className="inline-flex items-center gap-1 font-mono text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 shrink-0">
              <Phone className="w-3 h-3" aria-hidden="true" />
              <span>{phone}</span>
            </a>
          )}
        </div>
        {order.deliveryAddress && (
          <p className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 min-w-0" title={order.deliveryAddress}>
            <MapPin className="w-3.5 h-3.5 text-success-600 shrink-0" aria-hidden="true" />
            <span className="truncate">{order.deliveryAddress}</span>
          </p>
        )}
        {(slot || order.assignedDriverName) && (
          <p className="flex items-center gap-3 text-slate-500 dark:text-slate-400 min-w-0">
            {slot && (
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <Clock className="w-3.5 h-3.5 text-success-600 shrink-0" aria-hidden="true" />
                <span className="truncate">{slot}</span>
              </span>
            )}
            {order.assignedDriverName && (
              <span className="inline-flex items-center gap-1 shrink-0 font-semibold text-warning-700 dark:text-warning-300">
                <Truck className="w-3.5 h-3.5" aria-hidden="true" />
                {order.assignedDriverName}
              </span>
            )}
          </p>
        )}
      </div>

      {/* One-line alerts and notes */}
      {(order.status === 'pending_customer_approval' || customerResponse || order.notes || customNotes
        || Number(order.promotionDiscount) > 0 || Number(order.couponDiscount) > 0) && (
        <div className="px-3.5 pt-2 space-y-1">
          {order.status === 'pending_customer_approval' && (
            <p className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-warning-50 dark:bg-warning-950/50 text-warning-900 dark:text-warning-200 font-semibold"
              title={order.modificationReason || undefined}>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-warning-600" aria-hidden="true" />
              <span className="truncate">{isAr ? 'تعديل بانتظار موافقة العميل' : 'Änderung wartet auf Kunden'}</span>
            </p>
          )}
          {customerResponse && (
            <p className={`flex items-center gap-1.5 px-2 py-1 rounded-lg font-semibold ${
              customerResponse.type === 'accepted'
                ? 'bg-success-50 dark:bg-success-950/50 text-success-800 dark:text-success-200'
                : 'bg-danger-50 dark:bg-danger-950/50 text-danger-800 dark:text-danger-200'
            }`}>
              {customerResponse.type === 'accepted'
                ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                : <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
              <span className="truncate">{customerResponse.label}</span>
            </p>
          )}
          {order.notes && (
            <p className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 min-w-0" title={order.notes}>
              <FileText className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span className="truncate italic">{order.notes}</span>
            </p>
          )}
          {customNotes && (
            <p className="flex items-center gap-1.5 text-promo-700 dark:text-promo-300 min-w-0" title={customNotes}>
              <Lock className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{customNotes}</span>
            </p>
          )}
          {(Number(order.promotionDiscount) > 0 || Number(order.couponDiscount) > 0) && (
            <p className="flex items-center gap-3 font-semibold tabular-nums">
              {Number(order.promotionDiscount) > 0 && (
                <span className="inline-flex items-center gap-1 text-danger-600 dark:text-danger-400">
                  <Sparkles className="w-3 h-3" aria-hidden="true" />-€{Number(order.promotionDiscount).toFixed(2)}
                </span>
              )}
              {Number(order.couponDiscount) > 0 && (
                <span className="inline-flex items-center gap-1 text-promo-600 dark:text-promo-400" title={order.couponCode ? `Code: ${order.couponCode}` : undefined}>
                  <Tag className="w-3 h-3" aria-hidden="true" />{order.couponCode || t('coupon')} -€{Number(order.couponDiscount).toFixed(2)}
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {/* Items: one-line summary, expandable */}
      <div className="px-3.5 pt-2 pb-3">
        <button
          type="button"
          onClick={() => toggleOrderItemsExpand(order.id)}
          aria-expanded={isExpanded}
          className="w-full flex items-center justify-between gap-2 text-start text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
        >
          <span className="truncate">{items.map((it) => `${itemName(it)} ×${it.quantity}`).join(', ')}</span>
          <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {isExpanded && (
          <ul className="mt-2 rounded-lg border border-slate-200/70 dark:border-gray-800 divide-y divide-slate-100 dark:divide-gray-800/80 animate-fade-in">
            {items.map((item, idx) => (
              <li key={item.id || idx} className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                <span className="truncate text-slate-800 dark:text-slate-200"><strong className="tabular-nums">{item.quantity}×</strong> {itemName(item)}</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums shrink-0">€{Number(item.subtotal || item.price * item.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer: details/print/edit + one-click next step (pushed to the bottom
          so cards in the same row line up) */}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-50/80 dark:bg-gray-950/50 border-t border-slate-100 dark:border-gray-850">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => handleViewDetails(order)}
            className="min-h-9 px-2.5 rounded-lg border border-slate-200 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-850 text-slate-700 dark:text-slate-300 font-semibold transition cursor-pointer touch-manipulation">
            {isAr ? 'التفاصيل' : 'Details'}
          </button>
          <button type="button" onClick={() => handleOpenPrintModal(order)} title={t('printInvoice')} aria-label={t('printInvoice')} className={iconBtn}>
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          {currentStatus !== 'delivered' && !isOrderStopped(currentStatus) && (
            <button type="button" onClick={() => handleOpenEditModal(order)}
              title={isAr ? 'تعديل الطلب' : 'Auftrag bearbeiten'} aria-label={isAr ? 'تعديل الطلب' : 'Auftrag bearbeiten'}
              className={`${iconBtn} text-warning-700 dark:text-warning-300`}>
              <Edit className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {currentStatus === 'pending' && (
            <>
              <button type="button" onClick={() => openStatusModal(order, 'declined')} disabled={updating}
                className="min-h-9 px-2.5 rounded-lg bg-danger-50 hover:bg-danger-100 dark:bg-danger-950/40 text-danger-700 dark:text-danger-300 border border-danger-200 dark:border-danger-900/50 font-bold transition cursor-pointer touch-manipulation disabled:opacity-50">
                {t('decline')}
              </button>
              <button type="button" onClick={openAccept} disabled={updating} className={`${quickBtn} bg-success-600 hover:bg-success-700`}>
                {t('accept')}
              </button>
            </>
          )}
          {currentStatus === 'accepted' && (
            <button type="button" onClick={() => handleQuickStatusChange(order.id, 'preparing')} disabled={updating} className={`${quickBtn} bg-promo-600 hover:bg-promo-700`}>
              <Clock className="w-3 h-3" aria-hidden="true" />{t('preparing')}
            </button>
          )}
          {currentStatus === 'preparing' && (
            <button type="button" onClick={() => handleQuickStatusChange(order.id, 'shipped')} disabled={updating} className={`${quickBtn} bg-primary-600 hover:bg-primary-700`}>
              <Truck className="w-3 h-3" aria-hidden="true" />{t('markShipped')}
            </button>
          )}
          {currentStatus === 'shipped' && (
            <button type="button" onClick={() => handleQuickStatusChange(order.id, 'delivered')} disabled={updating} className={`${quickBtn} bg-success-600 hover:bg-success-700`}>
              <CheckCircle2 className="w-3 h-3" aria-hidden="true" />{t('markDelivered')}
            </button>
          )}
          {currentStatus === 'declined' && (
            <button type="button" onClick={openAccept} disabled={updating}
              className="min-h-9 px-2.5 rounded-lg border border-success-300 dark:border-success-700 text-success-700 dark:text-success-300 hover:bg-success-50 dark:hover:bg-success-950/30 font-bold transition cursor-pointer touch-manipulation">
              {t('accept')}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
