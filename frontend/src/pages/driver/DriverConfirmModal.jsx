import { CheckCircle2, Truck } from 'lucide-react';

export const DriverConfirmModal = ({
  confirmModal,
  deliveredCashCollected,
  driverNote,
  handleUpdateStatus,
  isAr,
  setConfirmModal,
  setDeliveredCashCollected,
  setDriverNote,
  updatingId
}) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-gray-800 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            confirmModal.action === 'deliver' 
              ? 'bg-success-100 text-success-700 dark:bg-success-950 dark:text-success-300' 
              : 'bg-warning-100 text-warning-700 dark:bg-warning-950 dark:text-warning-300'
          }`}>
            {confirmModal.action === 'deliver' ? <CheckCircle2 className="w-6 h-6" /> : <Truck className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {confirmModal.action === 'deliver' 
                ? (isAr ? 'تأكيد تسليم الطلب' : 'Zustellung bestätigen') 
                : (isAr ? 'بدء جولة التوصيل' : 'Lieferfahrt starten')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              #{confirmModal.order.id.slice(0, 8).toUpperCase()} - {confirmModal.order.customerName || (isAr ? 'العميل' : 'Kunde')}
            </p>
          </div>
        </div>

        {confirmModal.action === 'deliver' ? (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-slate-700 dark:text-gray-300">
              {isAr 
                ? 'هل تم تسليم جميع الأكياس والمنتجات للعميل بنجاح؟' 
                : 'Wurden alle Artikel und Liefertaschen vollständig an den Kunden übergeben?'}
            </p>

            {/* Cash collection checkbox for Cash On Delivery orders */}
            {(confirmModal.order.paymentMethod === 'cash_on_delivery' || !confirmModal.order.paymentMethod) && (
              <label className="flex items-center gap-3 p-3 rounded-2xl bg-warning-50 dark:bg-warning-950/50 border border-warning-200 dark:border-warning-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deliveredCashCollected}
                  onChange={(e) => setDeliveredCashCollected(e.target.checked)}
                  className="w-5 h-5 rounded text-success-600 focus:ring-success-500"
                />
                <div className="text-xs">
                  <span className="font-extrabold text-warning-900 dark:text-warning-200 block">
                    {isAr 
                      ? `تم استلام المبلغ نقداً (€${(confirmModal.order.totalAmount || 0).toFixed(2)})` 
                      : `Barbetrag (€${(confirmModal.order.totalAmount || 0).toFixed(2)}) erfolgreich kassiert`}
                  </span>
                  <span className="text-warning-700 dark:text-warning-400">
                    {isAr ? 'يرجى التأكد من عد المبلغ قبل المغادرة' : 'Bitte Geld vor der Abfahrt nachzählen'}
                  </span>
                </div>
              </label>
            )}

            {/* Optional short driver note */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-gray-400 mb-1">
                {isAr ? 'ملاحظة تسليم إضافية (اختياري)' : 'Zusätzliche Fahrernotiz (optional)'}
              </label>
              <input
                type="text"
                value={driverNote}
                onChange={(e) => setDriverNote(e.target.value)}
                placeholder={isAr ? 'مثال: تم التسليم للجار / أمام الباب' : 'z.B. Bei Nachbar abgegeben / vor Tür'}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-slate-900 dark:text-gray-100"
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-700 dark:text-gray-300 pt-2">
            {isAr 
              ? 'سيتم تحديث حالة الطلب إلى "في الطريق" وإرسال إشعار فوري للعميل برقم سيارتك أو باقتراب الوصول.'
              : 'Der Status wechselt auf „Auf dem Weg“ und der Kunde erhält eine Push-Benachrichtigung über die bevorstehende Ankunft.'}
          </p>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3">
          <button
            type="button"
            onClick={() => {
              setConfirmModal(null);
              setDriverNote('');
            }}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 font-bold text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-gray-800 transition"
          >
            {isAr ? 'إلغاء' : 'Abbrechen'}
          </button>
          <button
            type="button"
            disabled={updatingId === confirmModal.order.id}
            onClick={() => {
              if (confirmModal.action === 'deliver') {
                handleUpdateStatus(confirmModal.order, 'delivered', deliveredCashCollected, driverNote);
              } else {
                handleUpdateStatus(confirmModal.order, 'out_for_delivery', true, driverNote);
              }
            }}
            className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md transition ${
              confirmModal.action === 'deliver' 
                ? 'bg-success-600 hover:bg-success-700 shadow-success-600/20' 
                : 'bg-warning-600 hover:bg-warning-700 shadow-warning-600/20'
            }`}
          >
            {confirmModal.action === 'deliver' 
              ? (isAr ? 'تأكيد التسليم' : 'Zustellung bestätigen') 
              : (isAr ? 'انطلاق الآن' : 'Jetzt starten')}
          </button>
        </div>
      </div>
    </div>
);
