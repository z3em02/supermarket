import { Phone } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Button, Modal } from '../../components/ui';

export const CustomerDetailModal = ({
  getOrderStatusBadge,
  selectedCustomer,
  setSelectedCustomer
}) => {
  const { language, t } = useLanguage();
  const close = () => setSelectedCustomer(null);

  return (
    <Modal
      isOpen
      onClose={close}
      size="lg"
      title={selectedCustomer.name}
      description={(
        <span className="flex items-center gap-1.5 flex-wrap">
          <span className="break-all">{selectedCustomer.email}</span>
          <span aria-hidden="true">•</span>
          <span className="inline-flex items-center gap-1">
            <Phone className="w-3 h-3" aria-hidden="true" />
            <span dir="ltr">{selectedCustomer.phone}</span>
          </span>
        </span>
      )}
      footer={<Button variant="secondary" onClick={close}>{t('close') || 'Schließen'}</Button>}
    >
      {/* Address summary */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200/80 dark:border-gray-800 text-xs space-y-1">
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

      {/* Orders */}
      <div>
        <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-3">
          {language === 'ar' ? 'سجل طلبات العميل' : 'Bestellhistorie'} ({selectedCustomer.orders?.length || 0})
        </h3>

        {(!selectedCustomer.orders || selectedCustomer.orders.length === 0) ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            {language === 'ar' ? 'لا توجد طلبات مسجلة لهذا العميل حتى الآن' : 'Dieser Kunde hat noch keine Bestellungen getätigt.'}
          </p>
        ) : (
          <ul className="space-y-2.5">
            {selectedCustomer.orders.map((ord) => {
              const badge = getOrderStatusBadge(ord.status);
              return (
                <li
                  key={ord.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2.5 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        #{ord.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${badge.classes}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
                      {new Date(ord.createdAt).toLocaleDateString()} um {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="text-start xs:text-end">
                    <span className="font-black text-sm text-success-600 dark:text-success-400 tabular-nums">
                      €{Number(ord.totalAmount).toFixed(2)}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {ord.orderItems?.length || 0} {language === 'ar' ? 'عناصر' : 'Artikel'}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
};
