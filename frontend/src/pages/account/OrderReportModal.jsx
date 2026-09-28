import { Truck, Printer, X, Phone } from 'lucide-react';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const OrderReportModal = ({
  getStatusBadge,
  isAr,
  printReceipt,
  reportOrder,
  setShowReportModal
}) => {
  const { getStoreName } = useStoreSettings();
  const { customer } = useCustomerAuth();
  const { language } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl max-h-[90dvh] overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-gray-800 p-4 sm:p-6 md:p-8 my-auto text-slate-900 dark:text-gray-100">
        {/* Modal Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-gray-800 mb-4 sm:mb-6 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white truncate">
                {isAr ? 'تقرير الطلب الرسمي وإيصال التوصيل' : 'Offizieller Bestellbericht & Lieferschein'}
              </h3>
              <p className="text-xs text-slate-400 font-mono truncate">
                #{reportOrder.id.slice(0, 8).toUpperCase()} &bull; {getStoreName()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => printReceipt(reportOrder)}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition cursor-pointer touch-manipulation"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>{isAr ? 'طباعة' : 'Drucken'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowReportModal(false)}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 transition cursor-pointer touch-manipulation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Body Content */}
        <div className="space-y-4 sm:space-y-6 text-xs sm:text-sm">
          {/* Meta details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-gray-950 border border-slate-200/80 dark:border-gray-800">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                {isAr ? 'بيانات المستلم والتوصيل:' : 'Empfänger & Adresse:'}
              </span>
              <p className="font-bold text-slate-900 dark:text-white break-words">{reportOrder.customerName || reportOrder.customer?.name || customer?.name}</p>
              <p className="text-slate-600 dark:text-gray-300 font-mono mt-0.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{reportOrder.customerPhone || customer?.phone}</span>
              </p>
              <p className="text-slate-600 dark:text-gray-300 mt-1 break-words">{reportOrder.deliveryAddress || 'Adresse'}</p>
              {reportOrder.deliveryNotes && (
                <p className="text-slate-500 italic mt-1 break-words">{isAr ? 'ملاحظة للسائق:' : 'Hinweis:'} {reportOrder.deliveryNotes}</p>
              )}
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                {isAr ? 'تفاصيل الطلب والحالة:' : 'Bestellstatus & Details:'}
              </span>
              <div className="mb-2">{getStatusBadge(reportOrder.status)}</div>
              <p className="text-slate-600 dark:text-gray-300">
                <strong>{isAr ? 'تاريخ الطلب:' : 'Bestelldatum:'}</strong> {new Date(reportOrder.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-emerald-700 dark:text-emerald-300 font-semibold mt-1">
                {isAr ? 'طريقة الدفع: الدفع عند الاستلام (نقداً أو بالبطاقة عند الباب)' : 'Zahlungsart: Barzahlung / Kartenzahlung an der Haustür'}
              </p>
            </div>
          </div>

          {/* Items Table with horizontal scrolling on small screens */}
          <div className="border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden overflow-x-auto">
            <div className="bg-slate-100 dark:bg-gray-800 px-4 py-2.5 font-bold text-xs text-slate-700 dark:text-gray-300">
              {isAr ? 'المنتجات المسجلة في الطلب:' : 'Bestellte Artikel (Aufstellung):'}
            </div>
            <table className="w-full min-w-[340px] text-xs text-start">
              <thead>
                <tr className="border-b border-slate-200 dark:border-gray-800 text-slate-500 dark:text-gray-400 font-semibold text-[11px]">
                  <th className="p-2.5 sm:p-3 text-start">{isAr ? 'المنتج' : 'Artikel'}</th>
                  <th className="p-2.5 sm:p-3 text-center">{isAr ? 'الكمية' : 'Menge'}</th>
                  <th className="p-2.5 sm:p-3 text-end">{isAr ? 'سعر الوحدة' : 'Einzelpreis'}</th>
                  <th className="p-2.5 sm:p-3 text-end">{isAr ? 'الإجمالي' : 'Gesamt'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800/60">
                {(reportOrder.orderItems || []).map((item) => {
                  const prodName = (language === 'ar' ? item.product?.nameAr : item.product?.nameDe) 
                    || item.product?.name 
                    || item.productId;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30">
                      <td className="p-2.5 sm:p-3 font-medium text-slate-800 dark:text-gray-200">
                        <div className="break-words max-w-[150px] sm:max-w-none">{prodName}</div>
                        {item.product?.sku && (
                          <span className="text-[10px] text-slate-400 font-mono block">Art.-Nr. {item.product.sku}</span>
                        )}
                      </td>
                      <td className="p-2.5 sm:p-3 text-center font-bold text-slate-900 dark:text-white whitespace-nowrap">{item.quantity}x</td>
                      <td className="p-2.5 sm:p-3 text-end font-mono text-slate-600 dark:text-gray-300 whitespace-nowrap">€{Number(item.price).toFixed(2)}</td>
                      <td className="p-2.5 sm:p-3 text-end font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        €{Number(item.subtotal || item.price * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                {Number(reportOrder.itemsSubtotal) > 0 && (Number(reportOrder.couponDiscount) > 0 || Number(reportOrder.promotionDiscount) > 0) && (
                  <tr className="border-t border-slate-200 dark:border-gray-800 bg-slate-50/60 dark:bg-gray-950/40">
                    <td colSpan="3" className="p-2.5 sm:p-3 text-end font-medium text-slate-500">
                      {isAr ? 'المجموع الفرعي:' : 'Zwischensumme:'}
                    </td>
                    <td className="p-2.5 sm:p-3 text-end font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      €{Number(reportOrder.itemsSubtotal).toFixed(2)}
                    </td>
                  </tr>
                )}
                {Number(reportOrder.promotionDiscount) > 0 && (
                  <tr className="border-t border-slate-200 dark:border-gray-800 bg-rose-50/40 dark:bg-rose-950/20">
                    <td colSpan="3" className="p-2.5 sm:p-3 text-end font-medium text-rose-600 dark:text-rose-400">
                      {isAr ? 'خصم العروض الترويجية:' : 'Aktionsrabatt:'}
                    </td>
                    <td className="p-2.5 sm:p-3 text-end font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      -€{Number(reportOrder.promotionDiscount).toFixed(2)}
                    </td>
                  </tr>
                )}
                {Number(reportOrder.couponDiscount) > 0 && (
                  <tr className="border-t border-slate-200 dark:border-gray-800 bg-purple-50/40 dark:bg-purple-950/20">
                    <td colSpan="3" className="p-2.5 sm:p-3 text-end font-medium text-purple-600 dark:text-purple-400">
                      {isAr ? 'كوبون الخصم:' : 'Gutschein:'} {reportOrder.couponCode ? `(${reportOrder.couponCode})` : ''}
                    </td>
                    <td className="p-2.5 sm:p-3 text-end font-mono font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                      -€{Number(reportOrder.couponDiscount).toFixed(2)}
                    </td>
                  </tr>
                )}
                <tr className="border-t border-slate-200 dark:border-gray-800 bg-slate-50/60 dark:bg-gray-950/40">
                  <td colSpan="3" className="p-2.5 sm:p-3 text-end font-medium text-slate-500">
                    {isAr ? 'رسوم التوصيل للمنزل' : 'Lieferkosten (Haustür)'}
                    {reportOrder.deliveryDistanceKm != null && Number(reportOrder.deliveryDistanceKm) > 0 && (
                      <span className="text-[10px] text-slate-400 block font-normal">
                        (~{reportOrder.deliveryDistanceKm} km {isAr ? 'من المتجر' : 'vom Supermarkt'})
                      </span>
                    )}:
                  </td>
                  <td className="p-2.5 sm:p-3 text-end font-bold text-emerald-600 whitespace-nowrap">
                    {Number(reportOrder.deliveryFee) > 0 ? `€${Number(reportOrder.deliveryFee).toFixed(2)}` : (isAr ? 'مجاناً (0.00 €)' : 'Kostenlos (0,00 €)')}
                  </td>
                </tr>
                <tr className="border-t-2 border-slate-200 dark:border-gray-700 bg-slate-100/80 dark:bg-gray-800/80">
                  <td colSpan="3" className="p-2.5 sm:p-3 text-end font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                    {isAr ? 'المجموع الإجمالي عند الاستلام:' : 'Gesamtbetrag bei Lieferung:'}
                  </td>
                  <td className="p-2.5 sm:p-3 text-end font-mono font-black text-sm sm:text-base text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    €{Number(reportOrder.totalAmount).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            {isAr 
              ? 'هذا التقرير هو إيصال رسمي لتأكيد تفاصيل طلبك والتسليم عند باب منزلك مع الدفع عند الاستلام.' 
              : 'Dieser Bestellbericht dient als offizieller Beleg für Ihre Bestellung und den Lieferumfang an Ihrer Haustür.'}
          </p>
        </div>

        {/* Modal Footer */}
        <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-100 dark:border-gray-800 flex justify-end">
          <button
            type="button"
            onClick={() => setShowReportModal(false)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 font-bold text-xs transition cursor-pointer touch-manipulation"
          >
            {isAr ? 'إغلاق' : 'Schließen'}
          </button>
        </div>

      </div>
    </div>
  );
};
