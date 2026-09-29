import {
  Printer,
  FileText,
  Receipt,
  X,
  Truck,
  Lock
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useStatusBadge } from './useStatusBadge';
import { formatDeliverySlot } from '../../utils/deliverySlot';

export const PrintOrderModal = ({
  printOrder,
  printReceipt,
  setShowPrintModal
}) => {
  const { t, language } = useLanguage();
  const getStatusBadge = useStatusBadge();

  return (
    <div className="bg-white dark:bg-gray-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-gray-800 rounded-2xl w-full max-w-2xl max-h-[92dvh] overflow-y-auto shadow-2xl flex flex-col">
      {/* Modal toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-gray-800 shrink-0">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary-50 dark:bg-primary-950/60 border border-primary-200/80 dark:border-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
            <Printer className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{t('printInvoice')}</h3>
            <p className="text-[11px] text-slate-400 dark:text-gray-500 font-mono">INV-{printOrder.id.slice(0,8).toUpperCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => printReceipt(printOrder, 'a4')}
            title={language === 'ar' ? 'طباعة A4' : 'A4 drucken'}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-sm transition touch-manipulation cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">A4</span>
          </button>
          <button
            type="button"
            onClick={() => printReceipt(printOrder, 'thermal')}
            title={language === 'ar' ? 'طباعة على طابعة الإيصالات' : 'Auf Bon-Drucker drucken'}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-xl text-xs font-semibold shadow-sm transition touch-manipulation cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{language === 'ar' ? 'بون' : 'Bon'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowPrintModal(false)}
            className="p-2 rounded-xl border border-slate-200 dark:border-gray-800 hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-500 dark:text-slate-400 touch-manipulation cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Receipt Preview */}
      <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 sm:pb-5 border-b-2 border-primary-600 dark:border-primary-500">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Truck className="w-5 h-5 text-success-600 dark:text-success-400 shrink-0" />
              <span className="font-black text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">Supermarkt Lieferservice</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400">Hauszustellung &amp; Frische Produkte</p>
            <p className="text-xs text-slate-400 dark:text-gray-500 font-mono mt-1">
              {language === 'ar' ? 'فاتورة' : 'Rechnung'} Ref: INV-{printOrder.id.slice(0,8).toUpperCase()}
            </p>
          </div>
          <div className={`text-${language === 'ar' ? 'start' : 'end'}`}>
            {(() => { const b = getStatusBadge(printOrder.status); const I = b.icon; return (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${b.classes}`}>
                <I className="w-3.5 h-3.5" />
                {b.label}
              </span>
            ); })()}
            <p className="text-xs text-slate-400 dark:text-gray-500 mt-2">
              {language === 'ar' ? 'التاريخ' : 'Datum'}: {new Date(printOrder.createdAt).toLocaleDateString(language === 'ar' ? 'ar-DE' : 'de-DE', {year:'numeric',month:'long',day:'numeric'})}
            </p>
          </div>
        </div>

        {/* Billing + Delivery */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-slate-50 dark:bg-gray-950/60 rounded-xl border border-slate-100 dark:border-gray-800 p-3.5 sm:p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500 mb-1.5 sm:mb-2">
              {language === 'ar' ? 'بيانات العميل' : 'Kundeninformation'}
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{printOrder.customer?.name || printOrder.customerName || '—'}</p>
            {(printOrder.customer?.email || printOrder.customerEmail) && <p className="text-xs text-slate-500 dark:text-gray-400 break-all">{printOrder.customer?.email || printOrder.customerEmail}</p>}
            {(printOrder.customer?.phone || printOrder.customerPhone) && <p className="text-xs text-slate-500 dark:text-gray-400 font-mono">Tel: {printOrder.customer?.phone || printOrder.customerPhone}</p>}
          </div>
          <div className="bg-slate-50 dark:bg-gray-950/60 rounded-xl border border-slate-100 dark:border-gray-800 p-3.5 sm:p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500 mb-1.5 sm:mb-2">
              {language === 'ar' ? 'عنوان التسليم' : 'Lieferadresse'}
            </p>
            <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed break-words">
              {printOrder.deliveryAddress || printOrder.customer?.address || '—'}
            </p>
            {formatDeliverySlot(printOrder.deliverySlot, language === 'ar') && (
              <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-1.5">
                {formatDeliverySlot(printOrder.deliverySlot, language === 'ar')}
              </p>
            )}
            {printOrder.notes && (
              <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-2 italic break-words">
                Hinweis: {printOrder.notes}
              </p>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="rounded-xl border border-slate-200 dark:border-gray-800 overflow-x-auto">
          <table className="w-full text-xs min-w-[340px]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <thead>
              <tr className="bg-primary-900 dark:bg-primary-950 text-white">
                <th className="px-3 py-3 text-start font-semibold">{language === 'ar' ? 'المنتج' : 'Artikel'}</th>
                <th className="px-3 py-3 text-center font-semibold">{language === 'ar' ? 'الرقم' : 'Art-Nr.'}</th>
                <th className="px-3 py-3 text-end font-semibold">{language === 'ar' ? 'سعر الوحدة' : 'Einzelpreis'}</th>
                <th className="px-3 py-3 text-center font-semibold">{language === 'ar' ? 'الكمية' : 'Menge'}</th>
                <th className="px-3 py-3 text-end font-semibold">{language === 'ar' ? 'المجموع' : 'Betrag'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
              {(printOrder.orderItems || []).map((item, idx) => {
                const name = (language === 'ar' ? item.product?.nameAr : item.product?.nameDe) || item.product?.name || item.productId;
                const subtotal = Number(item.subtotal);
                const unitPrice = item.quantity > 0 ? subtotal / item.quantity : 0;
                return (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-slate-50/60 dark:bg-gray-950/40'}>
                    <td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-white">{name}</td>
                    <td className="px-3 py-2.5 text-center text-slate-400 dark:text-gray-500 font-mono">{item.product?.sku || '—'}</td>
                    <td className="px-3 py-2.5 text-end text-slate-600 dark:text-gray-400 font-mono">€{unitPrice.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-md bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 text-[11px] font-black border border-primary-200/80 dark:border-primary-900/40">
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-end font-bold text-slate-900 dark:text-white font-mono">€{subtotal.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 rounded-xl border border-slate-200 dark:border-gray-800 overflow-hidden divide-y divide-slate-100 dark:divide-gray-800">
            {Number(printOrder.itemsSubtotal) > 0 && (Number(printOrder.couponDiscount) > 0 || Number(printOrder.promotionDiscount) > 0) && (
              <div className="flex justify-between px-4 py-2 bg-slate-50 dark:bg-gray-950 text-slate-600 dark:text-slate-300 text-xs">
                <span>{language === 'ar' ? 'المجموع الفرعي' : 'Zwischensumme'}</span>
                <span className="font-mono">€{Number(printOrder.itemsSubtotal).toFixed(2)}</span>
              </div>
            )}
            {Number(printOrder.promotionDiscount) > 0 && (
              <div className="flex justify-between px-4 py-2 bg-danger-50/50 dark:bg-danger-950/20 text-danger-600 dark:text-danger-400 text-xs font-semibold">
                <span>{language === 'ar' ? 'خصم العروض' : 'Aktionsrabatt'}</span>
                <span className="font-mono">-€{Number(printOrder.promotionDiscount).toFixed(2)}</span>
              </div>
            )}
            {Number(printOrder.couponDiscount) > 0 && (
              <div className="flex justify-between px-4 py-2 bg-promo-50/50 dark:bg-promo-950/20 text-promo-600 dark:text-promo-400 text-xs font-semibold">
                <span>{language === 'ar' ? 'كوبون الخصم' : 'Gutschein'} {printOrder.couponCode ? `(${printOrder.couponCode})` : ''}</span>
                <span className="font-mono">-€{Number(printOrder.couponDiscount).toFixed(2)}</span>
              </div>
            )}
            {Number(printOrder.deliveryFee) > 0 ? (
              <div className="px-4 py-2 bg-slate-50 dark:bg-gray-950 text-slate-600 dark:text-slate-300 text-xs space-y-0.5">
                <div className="flex justify-between">
                  <span>{language === 'ar' ? 'رسوم التوصيل' : 'Liefergebühr'}</span>
                  <span className="font-mono">€{Number(printOrder.deliveryFee).toFixed(2)}</span>
                </div>
                {printOrder.deliveryDistanceKm != null && Number(printOrder.deliveryDistanceKm) > 0 && (
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">
                    <span>
                      {language === 'ar' ? `المسافة: ${printOrder.deliveryDistanceKm} كم` : `Distanz: ${printOrder.deliveryDistanceKm} km`}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex justify-between px-4 py-2 bg-success-50/50 dark:bg-success-950/20 text-success-700 dark:text-success-300 text-xs font-semibold">
                <span>{language === 'ar' ? 'رسوم التوصيل' : 'Liefergebühr'}</span>
                <span>{language === 'ar' ? 'مجاناً' : 'Kostenlos'}</span>
              </div>
            )}
            <div className="flex justify-between px-4 py-3 bg-primary-900 dark:bg-primary-950 text-white text-sm font-black">
              <span>{language === 'ar' ? 'المجموع الكلي' : 'Gesamtbetrag'}</span>
              <span className="font-mono">€{Number(printOrder.totalAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {printOrder.notes && (
          <div className="p-3.5 rounded-xl bg-warning-50 dark:bg-warning-950/20 border border-warning-200/80 dark:border-warning-900/40 text-xs text-warning-900 dark:text-warning-200 flex items-start gap-2">
            <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 text-warning-600 dark:text-warning-400" />
            <p><strong>{language === 'ar' ? 'ملاحظات' : 'Hinweise'}:</strong> {printOrder.notes}</p>
          </div>
        )}
        {printOrder.adminNotes && (
          <div className="p-3.5 rounded-xl bg-promo-50 dark:bg-promo-950/20 border border-promo-200/80 dark:border-promo-900/40 text-xs text-promo-900 dark:text-promo-200 flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-promo-600 dark:text-promo-400" />
            <p><strong>{language === 'ar' ? 'ملاحظة داخلية' : 'Interne Notiz'}:</strong> {printOrder.adminNotes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-gray-800 text-center text-[10px] text-slate-400 dark:text-gray-600">
          Supermarkt Lieferservice &bull; INV-{printOrder.id.slice(0,8).toUpperCase()} &bull; {new Date(printOrder.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};
