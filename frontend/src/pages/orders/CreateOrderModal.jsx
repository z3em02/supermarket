import { useLanguage } from '../../context/LanguageContext';
import { X, Plus, Trash2 } from 'lucide-react';

export const CreateOrderModal = ({
  customers,
  customersLocked,
  handleCreateOrder,
  orderForm,
  products,
  setOrderForm,
  setShowCreateModal
}) => {
  const { t, language } = useLanguage();

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-7 w-full max-w-xl max-h-[90dvh] overflow-y-auto border border-slate-200 dark:border-gray-800 shadow-2xl">
      <div className="flex items-center justify-between pb-3 sm:pb-4 mb-4 sm:mb-5 border-b border-slate-100 dark:border-gray-800">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
          {t('createOrder')}
        </h2>
        <button
          onClick={() => setShowCreateModal(false)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-800 cursor-pointer touch-manipulation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleCreateOrder} className="space-y-4 sm:space-y-5">
        {/* Customer Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            {language === 'ar' ? 'العميل' : 'Kunde'} *
          </label>
          <select
            required
            value={orderForm.customerId}
            onChange={(e) => {
              const selCust = customers.find(c => c.id === e.target.value);
              const addr = selCust ? [selCust.street, `${selCust.postalCode || ''} ${selCust.city || ''}`.trim()].filter(Boolean).join(', ') : '';
              setOrderForm({
                ...orderForm,
                customerId: e.target.value,
                customerName: selCust?.name || '',
                customerPhone: selCust?.phone || '',
                deliveryAddress: addr
              });
            }}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 transition text-sm cursor-pointer"
          >
            <option value="" className="dark:bg-gray-900 dark:text-white">-- {language === 'ar' ? 'اختر العميل' : 'Kunde auswählen'} --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id} className="dark:bg-gray-900 dark:text-white">
                {c.name} ({c.phone || c.email || '—'}) {c.city ? `- ${c.city}` : ''}
              </option>
            ))}
          </select>
          {customersLocked && (
            <p className="mt-1.5 text-xs text-warning-700 dark:text-warning-400">
              {language === 'ar'
                ? 'قائمة العملاء محمية برمز الدخول. افتح قسم العملاء وأدخل الرمز أولاً.'
                : 'Die Kundenliste ist PIN-geschützt. Öffnen Sie zuerst den Bereich „Kunden“ und geben Sie den PIN ein.'}
            </p>
          )}
        </div>

        {/* Delivery Address & Phone Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              {language === 'ar' ? 'رقم الهاتف' : 'Telefonnummer'} *
            </label>
            <input
              type="tel"
              required
              value={orderForm.customerPhone}
              onChange={(e) => setOrderForm({ ...orderForm, customerPhone: e.target.value })}
              placeholder="+49 170 1234567"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              {language === 'ar' ? 'عنوان التوصيل' : 'Lieferadresse'} *
            </label>
            <input
              type="text"
              required
              value={orderForm.deliveryAddress}
              onChange={(e) => setOrderForm({ ...orderForm, deliveryAddress: e.target.value })}
              placeholder="Musterstr. 12, 10115 Berlin"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Order Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {t('orderItems')} *
            </label>
            <button
              type="button"
              onClick={() => setOrderForm({
                ...orderForm,
                items: [...orderForm.items, { productId: '', quantity: 1 }]
              })}
              className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 cursor-pointer touch-manipulation"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('addItem')}</span>
            </button>
          </div>

          <div className="space-y-3">
            {orderForm.items.map((item, index) => (
              <div key={index} className="flex items-center gap-2 sm:gap-3">
                <select
                  required
                  value={item.productId}
                  onChange={(e) => {
                    const nextItems = [...orderForm.items];
                    nextItems[index].productId = e.target.value;
                    setOrderForm({ ...orderForm, items: nextItems });
                  }}
                  className="flex-1 min-w-0 px-2.5 sm:px-3 py-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="" className="dark:bg-gray-900 dark:text-white">-- {t('selectProduct')} --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} className="dark:bg-gray-900 dark:text-white">
                      {((language === 'ar' ? p.nameAr : p.nameDe) || p.name)} (€{Number(p.b2bPrice).toFixed(2)}) - {t('stock')}: {p.stock}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  required
                  value={item.quantity}
                  onChange={(e) => {
                    const nextItems = [...orderForm.items];
                    nextItems[index].quantity = Math.max(1, parseInt(e.target.value, 10) || 1);
                    setOrderForm({ ...orderForm, items: nextItems });
                  }}
                  className="w-16 sm:w-20 px-2 sm:px-3 py-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 text-center font-semibold shrink-0"
                />

                {orderForm.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextItems = orderForm.items.filter((_, i) => i !== index);
                      setOrderForm({ ...orderForm, items: nextItems });
                    }}
                    className="p-2 text-slate-500 hover:text-danger-600 dark:hover:text-danger-400 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition shrink-0 cursor-pointer touch-manipulation"
                    title={t('remove')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            {t('notes')}
          </label>
          <textarea
            rows="2"
            value={orderForm.notes}
            onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 transition text-sm"
            placeholder={t('notesPlaceholder')}
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 sm:gap-3 pt-3 sm:pt-4 border-t border-slate-100 dark:border-gray-800">
          <button
            type="button"
            onClick={() => setShowCreateModal(false)}
            className="px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition cursor-pointer touch-manipulation"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            className="px-5 py-2 sm:py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm font-medium rounded-xl shadow-sm transition cursor-pointer touch-manipulation"
          >
            {t('create')}
          </button>
        </div>
      </form>
    </div>
  );
};
