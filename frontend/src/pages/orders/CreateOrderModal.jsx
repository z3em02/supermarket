import { useId } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Plus, Trash2 } from 'lucide-react';
import { Button, FIELD_CLASSES, IconButton, Input, Modal, Select, Textarea } from '../../components/ui';

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
  const isAr = language === 'ar';
  const formId = useId();
  const close = () => setShowCreateModal(false);

  return (
    <Modal
      isOpen
      onClose={close}
      size="lg"
      title={t('createOrder')}
      footer={(
        <>
          <Button variant="secondary" onClick={close}>{t('cancel')}</Button>
          <Button type="submit" form={formId}>{t('create')}</Button>
        </>
      )}
    >
      <form id={formId} onSubmit={handleCreateOrder} className="space-y-5">
        <Select
          label={`${isAr ? 'العميل' : 'Kunde'} *`}
          hint={customersLocked
            ? (isAr
              ? 'قائمة العملاء محمية برمز الدخول. افتح قسم العملاء وأدخل الرمز أولاً.'
              : 'Die Kundenliste ist PIN-geschützt. Öffnen Sie zuerst den Bereich „Kunden“ und geben Sie den PIN ein.')
            : undefined}
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
        >
          <option value="">-- {isAr ? 'اختر العميل' : 'Kunde auswählen'} --</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.phone || c.email || '—'}) {c.city ? `- ${c.city}` : ''}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={`${isAr ? 'رقم الهاتف' : 'Telefonnummer'} *`}
            type="tel"
            required
            value={orderForm.customerPhone}
            onChange={(e) => setOrderForm({ ...orderForm, customerPhone: e.target.value })}
            placeholder="+43 660 1234567"
          />
          <Input
            label={`${isAr ? 'عنوان التوصيل' : 'Lieferadresse'} *`}
            type="text"
            required
            value={orderForm.deliveryAddress}
            onChange={(e) => setOrderForm({ ...orderForm, deliveryAddress: e.target.value })}
            placeholder="Favoritenstraße 12, 1100 Wien"
          />
        </div>

        {/* Order Items */}
        <fieldset className="space-y-3">
          <legend className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">{t('orderItems')} *</legend>
          {orderForm.items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <select
                required
                aria-label={t('selectProduct')}
                value={item.productId}
                onChange={(e) => {
                  const nextItems = [...orderForm.items];
                  nextItems[index].productId = e.target.value;
                  setOrderForm({ ...orderForm, items: nextItems });
                }}
                className={`${FIELD_CLASSES} flex-1 min-w-0 cursor-pointer`}
              >
                <option value="">-- {t('selectProduct')} --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {((isAr ? p.nameAr : p.nameDe) || p.name)} (€{Number(p.b2bPrice).toFixed(2)}) - {t('stock')}: {p.stock}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                required
                aria-label={isAr ? 'الكمية' : 'Menge'}
                value={item.quantity}
                onChange={(e) => {
                  const nextItems = [...orderForm.items];
                  nextItems[index].quantity = Math.max(1, parseInt(e.target.value, 10) || 1);
                  setOrderForm({ ...orderForm, items: nextItems });
                }}
                className={`${FIELD_CLASSES} !w-20 text-center font-semibold shrink-0 tabular-nums`}
              />

              {orderForm.items.length > 1 && (
                <IconButton
                  icon={Trash2}
                  label={t('remove')}
                  onClick={() => {
                    const nextItems = orderForm.items.filter((_, i) => i !== index);
                    setOrderForm({ ...orderForm, items: nextItems });
                  }}
                  className="shrink-0 hover:!text-danger-600 dark:hover:!text-danger-400"
                />
              )}
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            icon={Plus}
            className="min-h-11 !text-primary-600 dark:!text-primary-400"
            onClick={() => setOrderForm({
              ...orderForm,
              items: [...orderForm.items, { productId: '', quantity: 1 }]
            })}
          >
            {t('addItem')}
          </Button>
        </fieldset>

        <Textarea
          label={t('notes')}
          rows="2"
          value={orderForm.notes}
          onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
          placeholder={t('notesPlaceholder')}
        />
      </form>
    </Modal>
  );
};
