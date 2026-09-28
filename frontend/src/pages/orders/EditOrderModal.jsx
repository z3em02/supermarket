import {
  Edit,
  X,
  AlertTriangle,
  Minus,
  Plus,
  Trash2
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { ProductPicker } from './ProductPicker';

export const EditOrderModal = ({
  editItems,
  editReason,
  editingOrder,
  handleAddProductWithQty,
  handleRemoveItemFromEdit,
  handleSaveOrderEdit,
  handleUpdateItemQuantity,
  products,
  savingEdit,
  setEditReason,
  setShowEditModal
}) => {
  const { language, t } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-800 p-4 sm:p-7 my-4 sm:my-8 max-h-[90dvh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 sm:pb-4 border-b border-slate-100 dark:border-gray-800 mb-4 sm:mb-5">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Edit className="w-4 sm:w-5 h-4 sm:h-5 text-amber-600 shrink-0" />
              <span>{language === 'ar' ? 'تعديل المنتجات بالطلب (غير متوفرة بالمخزن)' : 'Bestellung anpassen (Artikel nicht vorrätig)'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
              #{editingOrder.id.slice(0, 8).toUpperCase()} &bull; {editingOrder.customer?.name || editingOrder.customerName || 'Kunde'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowEditModal(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition cursor-pointer touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveOrderEdit} className="space-y-5">
          {/* Notice banner */}
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {language === 'ar'
                ? 'عند تعديل الطلب، سيتم إشعار العميل فوراً بالبريد الإلكتروني، وسينتقل الطلب إلى حالة "بانتظار موافقة العميل" حتى يؤكد التعديل أو يلغي الطلب.'
                : 'Wenn Sie Artikel anpassen oder entfernen, wird der Kunde per E-Mail benachrichtigt. Die Bestellung wechselt in den Status "Wartet auf Kundenbestätigung", bis der Kunde die Änderung annimmt.'}
            </p>
          </div>

          {/* Items in Order */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              {language === 'ar' ? 'المنتجات في الطلب:' : 'Aktuelle Artikel im Auftrag:'}
            </label>
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {editItems.map((item, index) => {
                const prodName = (language === 'ar' ? item.product?.nameAr : item.product?.nameDe) 
                  || item.product?.name 
                  || item.productId;
                const stock = item.product?.stock !== undefined ? item.product.stock : '—';
                const unitPrice = Number(item.price || 0);
                const subtotal = Number(item.subtotal || unitPrice * item.quantity);

                return (
                  <div
                    key={item.productId || index}
                    className="p-3 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-950/60 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                        {prodName}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-mono">€{unitPrice.toFixed(2)} / Stk.</span>
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-slate-200 dark:bg-gray-800 text-[10px] text-slate-600 dark:text-gray-300">
                          Lager: {stock}
                        </span>
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateItemQuantity(index, -1)}
                        disabled={item.quantity <= 1}
                        className="w-7 h-7 rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 disabled:opacity-30 transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-bold text-xs text-slate-900 dark:text-white font-mono">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateItemQuantity(index, 1)}
                        className="w-7 h-7 rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Subtotal */}
                    <div className="w-16 text-end shrink-0 font-mono font-bold text-xs text-slate-900 dark:text-white">
                      €{subtotal.toFixed(2)}
                    </div>

                    {/* Remove item button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItemFromEdit(index)}
                      title={language === 'ar' ? 'حذف هذا المنتج (غير متوفر)' : 'Diesen Artikel als nicht vorrätig entfernen'}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Substitute & Additional Products UI Menu with Filters in both languages */}
          <ProductPicker
            editItems={editItems}
            handleAddProductWithQty={handleAddProductWithQty}
            products={products}
          />

          {/* Reason input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              {language === 'ar' ? 'سبب التعديل / ملاحظة للعميل (ستصل بالبريد):' : 'Grund der Änderung / Nachricht an den Kunden (wird per E-Mail gesendet):'}
            </label>
            <textarea
              rows="2"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder={language === 'ar' ? 'مثال: نعتذر، الحليب غير متوفر حالياً بالمخزن وتم تقليل الكمية.' : 'z.B. Milch war leider ausverkauft. Wir haben die Menge angepasst.'}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 transition text-xs"
            />
          </div>

          {/* Price Calculation Summary */}
          {(() => {
            const newTotal = editItems.reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
            const oldTotal = Number(editingOrder.totalAmount || 0);
            const diff = newTotal - oldTotal;

            return (
              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-gray-800/80 text-xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-slate-500 dark:text-gray-400">{language === 'ar' ? 'المبلغ الأصلي:' : 'Bisheriger Betrag:'} </span>
                  <span className="font-mono line-through text-slate-400">€{oldTotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700 dark:text-gray-300">{language === 'ar' ? 'المبلغ الجديد بعد التعديل:' : 'Neuer Betrag:'}</span>
                  <span className="font-mono font-black text-base text-emerald-600 dark:text-emerald-400">€{newTotal.toFixed(2)}</span>
                  <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${diff < 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                    {diff < 0 ? `-€${Math.abs(diff).toFixed(2)}` : `+€${diff.toFixed(2)}`}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Modal Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition text-center cursor-pointer touch-manipulation"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={savingEdit || editItems.length === 0}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
            >
              {savingEdit ? '...' : (language === 'ar' ? 'حفظ التعديل وإرسال إشعار للعميل' : 'Änderung speichern & Bestätigung anfordern')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
