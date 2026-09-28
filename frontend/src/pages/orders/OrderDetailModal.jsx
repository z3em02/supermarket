import { useLanguage } from '../../context/LanguageContext';
import {
  Printer,
  X,
  Truck,
  Phone,
  Mail,
  FileText,
  Clock,
  Edit,
  User,
  Sparkles,
  Tag,
  MapPin,
  CheckCircle2,
  XCircle,
  Lock,
  SlidersHorizontal
} from 'lucide-react';
import { useStatusBadge } from './useStatusBadge';
import { formatDeliverySlot, todayIso, maxDeliveryDateIso, windowLabel } from '../../utils/deliverySlot';
import { parseOrderNotes } from './orderNotes';
import { isOrderStopped } from '../../utils/orderStatus';

export const OrderDetailModal = ({
  activeDrivers,
  assigningDriverId,
  deliveryWindows,
  editDeliveryDate,
  editSelectedWindow,
  editingDeliverySlot,
  handleAssignDriver,
  handleOpenEditDeliverySlot,
  handleOpenEditModal,
  handleOpenPrintModal,
  handleSaveDeliverySlot,
  knownDriverNames,
  openStatusModal,
  savingDeliverySlot,
  selectedOrder,
  setEditDeliveryDate,
  setEditSelectedWindow,
  setEditingDeliverySlot,
  setShowDetailModal
}) => {
  const { t, language } = useLanguage();
  const getStatusBadge = useStatusBadge();

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-7 w-full max-w-2xl max-h-[90dvh] overflow-y-auto border border-slate-200 dark:border-gray-800 shadow-2xl">
      <div className="flex items-center justify-between pb-3 sm:pb-4 mb-4 sm:mb-5 border-b border-slate-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            {t('orderDetails')}
          </h2>
          <button
            type="button"
            onClick={() => handleOpenPrintModal(selectedOrder)}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-850 text-slate-600 dark:text-slate-300 transition cursor-pointer touch-manipulation"
            title={t('printInvoice')}
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => setShowDetailModal(false)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-800 cursor-pointer touch-manipulation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-5 sm:space-y-6">
        {/* Order Info Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-gray-950/60 border border-slate-100 dark:border-gray-800">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('orderId')}</p>
            <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white truncate">
              #{selectedOrder.id.slice(0, 8)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{t('status')}</p>
            {(() => {
              const modalBadge = getStatusBadge(selectedOrder.status);
              return (
                <div
                className={`appearance-none ps-6 pe-5 sm:ps-7 sm:pe-6 py-1 rounded-full text-xs font-bold border shadow-2xs outline-none transition capitalize truncate ${modalBadge.classes}`}
                >
    {['rejected', 'decline', 'declined'].includes(selectedOrder.status?.toLowerCase()) ? 'declined' : selectedOrder.status?.toLowerCase()}
                </div>
              );
            })()}
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {language === 'ar' ? 'العميل' : 'Kunde'}
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {selectedOrder.customer?.name || selectedOrder.customerName || '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('totalAmount')}</p>
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              €{Number(selectedOrder.totalAmount).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Home Delivery Information Box */}
        {(selectedOrder.deliveryAddress || selectedOrder.customer || selectedOrder.orderType === 'home_delivery') && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-850 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
              <Truck className="w-4 h-4 shrink-0" />
              <span>{language === 'ar' ? 'بيانات التوصيل المنزلي (الدفع عند الاستلام)' : 'Hauszustellung (Zahlung an der Haustür)'}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500 dark:text-gray-400">{language === 'ar' ? 'عنوان التوصيل:' : 'Lieferadresse:'} </span>
              <span className="font-bold text-slate-800 dark:text-gray-200 break-words">{selectedOrder.deliveryAddress || '—'}</span>
            </div>
            <div className="flex flex-wrap gap-3 sm:gap-4 text-slate-600 dark:text-gray-300 pt-1">
              {(selectedOrder.customerPhone || selectedOrder.customer?.phone) && (
                <span className="font-mono inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{selectedOrder.customerPhone || selectedOrder.customer?.phone}</span>
                </span>
              )}
              {(selectedOrder.customerEmail || selectedOrder.customer?.email) && (
                <span className="break-all inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{selectedOrder.customerEmail || selectedOrder.customer?.email}</span>
                </span>
              )}
              {selectedOrder.deliveryNotes && (
                <span className="italic break-words inline-flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{selectedOrder.deliveryNotes}</span>
                </span>
              )}
            </div>

            {/* Delivery time — its own prominent row with a visible edit button */}
            <div className="flex items-center justify-between gap-2 pt-2 mt-1 border-t border-emerald-200/50 dark:border-emerald-850">
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-slate-700 dark:text-gray-200 truncate">
                  {formatDeliverySlot(selectedOrder.deliverySlot, language === 'ar') || (language === 'ar' ? 'لم يُحدد بعد' : 'Noch nicht festgelegt')}
                </span>
              </span>
              {!editingDeliverySlot && (
                <button
                  type="button"
                  onClick={() => handleOpenEditDeliverySlot(selectedOrder)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer shrink-0 shadow-sm"
                >
                  <Edit className="w-3 h-3" />
                  {language === 'ar' ? 'تعديل الوقت' : 'Zeit bearbeiten'}
                </button>
              )}
            </div>

            {/* Assigned driver — who delivers this order. Options come from
                knownDriverNames (currently logged-in drivers, plus anyone
                previously assigned on any loaded order) so the dropdown
                isn't empty just because nobody's online right now. */}
            <div className="flex items-center justify-between gap-2 pt-2 mt-1 border-t border-emerald-200/50 dark:border-emerald-850">
              <span className="inline-flex items-center gap-1.5 min-w-0 shrink-0">
                <User className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-500 dark:text-gray-400 shrink-0">
                  {language === 'ar' ? 'السائق المسؤول:' : 'Zugewiesener Fahrer:'}
                </span>
              </span>
              <select
                value={selectedOrder.assignedDriverName || ''}
                disabled={assigningDriverId === selectedOrder.id}
                onChange={(e) => handleAssignDriver(selectedOrder.id, e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-bold text-slate-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer disabled:opacity-50 max-w-[60%]"
              >
                <option value="">
                  {language === 'ar' ? 'غير مُعيَّن' : 'Nicht zugewiesen'}
                </option>
                {knownDriverNames.map((name) => (
                  <option key={name} value={name}>
                    {name}{!activeDrivers.some((s) => s.driverName === name) ? (language === 'ar' ? ' (غير متصل)' : ' (offline)') : ''}
                  </option>
                ))}
              </select>
            </div>

            {editingDeliverySlot && (
              <div className="pt-2 mt-1 border-t border-emerald-200/60 dark:border-emerald-850 space-y-2">
                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-400 mb-1">
                      {language === 'ar' ? 'التاريخ' : 'Datum'}
                    </label>
                    <input
                      type="date"
                      value={editDeliveryDate}
                      min={todayIso()}
                      max={maxDeliveryDateIso()}
                      onChange={(e) => setEditDeliveryDate(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {deliveryWindows.length === 0 ? (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 self-center">
                        {language === 'ar'
                          ? 'لا توجد أوقات توصيل مُفعّلة. أضفها في الإعدادات.'
                          : 'Keine aktiven Zeitfenster. Bitte in den Einstellungen anlegen.'}
                      </p>
                    ) : (
                      deliveryWindows.map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => setEditSelectedWindow(w)}
                          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                            editSelectedWindow?.id === w.id
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-300 hover:border-emerald-400'
                          }`}
                        >
                          {windowLabel(w.startHour, w.endHour, language === 'ar')}
                        </button>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveDeliverySlot(selectedOrder.id)}
                    disabled={savingDeliverySlot || !editSelectedWindow}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-bold cursor-pointer"
                  >
                    {savingDeliverySlot ? '...' : (language === 'ar' ? 'حفظ' : 'Speichern')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingDeliverySlot(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 text-[11px] font-bold cursor-pointer"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Abbrechen'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Order Items Table */}
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2.5 sm:mb-3">
            {t('orderItems')}
          </h4>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-gray-800">
            <table className="w-full text-xs sm:text-sm text-left rtl:text-right min-w-[320px]">
              <thead className="bg-slate-100 dark:bg-gray-850 text-[11px] sm:text-xs uppercase text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3">{t('product')}</th>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center">{t('quantity')}</th>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-end">{t('price')}</th>
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-end">{t('subtotal')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                {(selectedOrder.orderItems || []).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/40">
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-slate-900 dark:text-white">
                      {((language === 'ar' ? item.product?.nameAr : item.product?.nameDe) || item.product?.name || item.productId)}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center text-slate-700 dark:text-slate-300">
                      {item.quantity}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-end text-slate-700 dark:text-slate-300 font-mono">
                      €{Number(item.price).toFixed(2)}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-end font-semibold text-slate-900 dark:text-white font-mono">
                      €{Number(item.subtotal).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Totals Summary */}
        <div className="flex justify-end">
          <div className="w-full sm:w-72 bg-slate-50 dark:bg-gray-950/60 rounded-xl border border-slate-200 dark:border-gray-800 p-3.5 space-y-2 text-xs">
            {Number(selectedOrder.itemsSubtotal) > 0 && (Number(selectedOrder.couponDiscount) > 0 || Number(selectedOrder.promotionDiscount) > 0) && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>{language === 'ar' ? 'المجموع الفرعي' : 'Zwischensumme'}</span>
                <span className="font-mono">€{Number(selectedOrder.itemsSubtotal).toFixed(2)}</span>
              </div>
            )}
            {Number(selectedOrder.promotionDiscount) > 0 && (
              <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold">
                <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> {language === 'ar' ? 'خصم العروض' : 'Aktionsrabatt'}</span>
                <span className="font-mono">-€{Number(selectedOrder.promotionDiscount).toFixed(2)}</span>
              </div>
            )}
            {Number(selectedOrder.couponDiscount) > 0 && (
              <div className="flex justify-between text-purple-600 dark:text-purple-400 font-semibold">
                <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> {t('coupon')} {selectedOrder.couponCode ? `(${selectedOrder.couponCode})` : ''}</span>
                <span className="font-mono">-€{Number(selectedOrder.couponDiscount).toFixed(2)}</span>
              </div>
            )}
            {Number(selectedOrder.deliveryFee) > 0 ? (
              <div className="space-y-0.5">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>{t('deliveryFee')}</span>
                  <span className="font-mono">€{Number(selectedOrder.deliveryFee).toFixed(2)}</span>
                </div>
                {selectedOrder.deliveryDistanceKm != null && Number(selectedOrder.deliveryDistanceKm) > 0 && (
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      <span>
                        {language === 'ar'
                          ? `المسافة: ${selectedOrder.deliveryDistanceKm} كم`
                          : `Distanz: ${selectedOrder.deliveryDistanceKm} km`}
                        {selectedOrder.baseDeliveryFee != null && selectedOrder.distanceDeliveryFee != null
                          ? ` (Basis: €${Number(selectedOrder.baseDeliveryFee).toFixed(2)} + Distanz: €${Number(selectedOrder.distanceDeliveryFee).toFixed(2)})`
                          : ''}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>{t('deliveryFee')}</span>
                <span>{t('freeShipping')}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-gray-800 text-sm font-black text-slate-900 dark:text-white">
              <span>{t('total')}</span>
              <span className="font-mono text-blue-600 dark:text-blue-400">€{Number(selectedOrder.totalAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Customer Response / Admin Note in Detail Modal */}
        {(() => {
          const { customNotes, customerResponse } = parseOrderNotes(selectedOrder.adminNotes, language);
          return (
            <>
              {customerResponse && (
                <div className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-bold ${
                  customerResponse.type === 'accepted'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-850 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-850 dark:text-rose-200'
                }`}>
                  {customerResponse.type === 'accepted' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <span>{customerResponse.label}</span>
                </div>
              )}

              {customNotes && (
                <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
                    <Lock className="w-3.5 h-3.5" />
                    <span>{t('adminNotes')} ({t('internalNoteOnly')})</span>
                  </div>
                  <p className="text-xs text-purple-950 dark:text-purple-200 whitespace-pre-line">
                    {customNotes}
                  </p>
                </div>
              )}
            </>
          );
        })()}

        {/* Customer Notes Details Box */}
        {selectedOrder.notes && (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-gray-950/60 border border-slate-100 dark:border-gray-800 text-xs text-slate-600 dark:text-slate-300">
            <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">{t('customerNotes')}:</p>
            <p className="break-words">{selectedOrder.notes}</p>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 pt-4 border-t border-slate-100 dark:border-gray-800">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const orderToEdit = selectedOrder;
                setShowDetailModal(false);
                openStatusModal(orderToEdit, orderToEdit.status);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/50 transition shadow-2xs touch-manipulation cursor-pointer flex-1 sm:flex-none"
              title={t('alwaysChangeStatusHint')}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>{t('changeStatus')} & {t('adminNotes')}</span>
            </button>
            {selectedOrder.status?.toLowerCase() !== 'delivered' && !isOrderStopped(selectedOrder.status) && (
              <button
                type="button"
                onClick={() => {
                  const orderToEdit = selectedOrder;
                  setShowDetailModal(false);
                  handleOpenEditModal(orderToEdit);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800/80 transition touch-manipulation cursor-pointer flex-1 sm:flex-none"
              >
                <Edit className="w-4 h-4" />
                <span>{language === 'ar' ? 'تعديل المنتجات' : 'Bestellung anpassen'}</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenPrintModal(selectedOrder)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-850 text-slate-700 dark:text-slate-300 transition touch-manipulation cursor-pointer flex-1 sm:flex-none"
            >
              <Printer className="w-4 h-4" />
              <span>{t('printInvoice')}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowDetailModal(false)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-slate-800 dark:text-slate-200 transition touch-manipulation cursor-pointer flex-1 sm:flex-none"
            >
              {t('close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
