import { Phone, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const CustomerDetailModal = ({
  getOrderStatusBadge,
  selectedCustomer,
  setSelectedCustomer
}) => {
  const { language, t } = useLanguage();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90dvh] overflow-y-auto border border-slate-200 dark:border-gray-800 shadow-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b border-slate-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-success-600 to-info-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-sm shrink-0">
              {selectedCustomer.name?.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                {selectedCustomer.name}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate flex items-center gap-1.5 flex-wrap">
                <span>{selectedCustomer.email}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-500" />
                  <span>{selectedCustomer.phone}</span>
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedCustomer(null)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition cursor-pointer touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Address summary */}
        <div className="mt-3.5 sm:mt-4 p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200/80 dark:border-gray-800 text-xs space-y-1">
          <p className="font-bold text-slate-700 dark:text-slate-300">
            {language === 'ar' ? 'عنوان التوصيل المسجل:' : 'Lieferadresse:'}
          </p>
          <p className="text-slate-600 dark:text-slate-400 break-words leading-relaxed">
            {[
              selectedCustomer.street && `${selectedCustomer.street} ${selectedCustomer.houseNumber || ''}`.trim(),
              selectedCustomer.postalCode && selectedCustomer.city && `${selectedCustomer.postalCode} ${selectedCustomer.city}`.trim(),
              selectedCustomer.floorApartment && `Apt/Floor: ${selectedCustomer.floorApartment}`
            ].filter(Boolean).join(', ') || 'Keine Adresse'}
          </p>
          {selectedCustomer.deliveryNotes && (
            <p className="text-slate-500 italic mt-1 break-words">
              Hinweis: {selectedCustomer.deliveryNotes}
            </p>
          )}
        </div>

        {/* Orders Table */}
        <div className="mt-4 sm:mt-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-2.5 sm:mb-3">
            {language === 'ar' ? 'سجل طلبات العميل' : 'Bestellhistorie'} ({selectedCustomer.orders?.length || 0})
          </h4>

          {(!selectedCustomer.orders || selectedCustomer.orders.length === 0) ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              {language === 'ar' ? 'لا توجد طلبات مسجلة لهذا العميل حتى الآن' : 'Dieser Kunde hat noch keine Bestellungen getätigt.'}
            </p>
          ) : (
            <div className="space-y-2.5 sm:space-y-3">
              {selectedCustomer.orders.map((ord) => {
                const badge = getOrderStatusBadge(ord.status);
                return (
                  <div
                    key={ord.id}
                    className="p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2.5 sm:gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          #{ord.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.classes}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {new Date(ord.createdAt).toLocaleDateString()} um {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="text-start xs:text-end">
                      <span className="font-black text-sm text-success-600 dark:text-success-400 font-mono">
                        €{Number(ord.totalAmount).toFixed(2)}
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        {ord.orderItems?.length || 0} {language === 'ar' ? 'عناصر' : 'Artikel'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-5 sm:mt-6 pt-3.5 sm:pt-4 border-t border-slate-100 dark:border-gray-800 flex justify-end">
          <button
            onClick={() => setSelectedCustomer(null)}
            className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer touch-manipulation"
          >
            {t('close') || 'Schließen'}
          </button>
        </div>
      </div>
    </div>
  );
};
