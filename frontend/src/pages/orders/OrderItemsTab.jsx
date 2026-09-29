import { useEffect, useState } from 'react';
import { AlertTriangle, Edit, Minus, Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useConfirm, useToast } from '../../context/FeedbackContext';
import { Button, Card, IconButton, Textarea } from '../../components/ui';
import { isOrderStopped } from '../../utils/orderStatus';
import { ProductPicker } from './ProductPicker';

const money = (v) => `€${Number(v || 0).toFixed(2)}`;

// Artikel: read-only line items, plus the deliberate "Artikel ändern" mode.
// Saving an item change emails the customer and moves the order to
// pending_customer_approval, so it's never an inline edit: it has its own
// mode, its own warning and its own confirm.
export const OrderItemsTab = ({ order, stale, runWrite, setDirty, actions, reference }) => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const confirm = useConfirm();
  const toast = useToast();

  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState([]);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDirty('items', editing); }, [editing, setDirty]);

  const productName = (p, fallback) => ((isAr ? p?.nameAr : p?.nameDe) || p?.name || fallback);
  const canEdit = order.status?.toLowerCase() !== 'delivered' && !isOrderStopped(order.status);

  const startEditing = () => {
    if (!reference.products?.length) actions.reloadFormData();
    setItems((order.orderItems || []).map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
      price: Number(it.price),
      product: it.product
    })));
    setReason(order.modificationReason || '');
    setEditing(true);
  };

  const changeQty = (index, delta) => setItems((prev) => prev.map((it, i) => (
    i === index ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it
  )));
  const removeItem = (index) => setItems((prev) => prev.filter((_, i) => i !== index));
  const addProduct = (prod, qty = 1) => {
    if (!prod) return;
    const add = Math.max(1, Number(qty) || 1);
    setItems((prev) => {
      const i = prev.findIndex((it) => it.productId === prod.id);
      if (i >= 0) return prev.map((it, j) => (j === i ? { ...it, quantity: it.quantity + add } : it));
      return [...prev, { productId: prod.id, quantity: add, price: Number(prod.b2bPrice), product: prod }];
    });
  };

  // Rough preview only — the server recalculates promotions, coupon, minimum
  // order value and delivery fee when it saves.
  const newItemsTotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const oldItemsTotal = Number(order.itemsSubtotal || 0);

  const save = async () => {
    if (items.length === 0) {
      toast.warning(isAr ? 'يجب أن يحتوي الطلب على منتج واحد على الأقل' : 'Der Auftrag muss mindestens einen Artikel enthalten.');
      return;
    }
    const ok = await confirm({
      title: isAr ? 'إرسال التعديل للعميل؟' : 'Änderung an den Kunden senden?',
      message: isAr
        ? 'سيتلقى العميل بريداً إلكترونياً فوراً، وينتقل الطلب إلى "بانتظار موافقة العميل" حتى يقبل التعديل أو يلغي الطلب.'
        : 'Der Kunde wird sofort per E-Mail benachrichtigt. Die Bestellung wechselt auf „Wartet auf Kundenbestätigung“, bis der Kunde die Änderung annimmt oder storniert.',
      confirmText: isAr ? 'نعم، أرسل التعديل' : 'Ja, an Kunden senden',
      variant: 'warning'
    });
    if (!ok) return;
    setSaving(true);
    const saved = await runWrite(
      () => actions.saveOrderEdit(order.id, {
        items: items.map((it) => ({ productId: it.productId, quantity: it.quantity, price: it.price })),
        modificationReason: reason.trim() || (isAr ? 'تعديل بسبب عدم توفر بعض المنتجات' : 'Anpassung wegen fehlender Verfügbarkeit einzelner Artikel.'),
        expectedUpdatedAt: order.updatedAt
      }),
      isAr ? 'تم إرسال التعديل للعميل' : 'Änderung an den Kunden gesendet'
    );
    setSaving(false);
    if (saved) setEditing(false);
  };

  if (!editing) {
    return (
      <>
        <Card padding="p-0" className="overflow-hidden">
          <table className="w-full text-sm">
            <caption className="sr-only">{t('orderItems')}</caption>
            <thead className="bg-slate-50 dark:bg-gray-950/60 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-start">{t('product')}</th>
                <th scope="col" className="px-4 py-2.5 text-center">{t('quantity')}</th>
                <th scope="col" className="px-4 py-2.5 text-end hidden sm:table-cell">{t('price')}</th>
                <th scope="col" className="px-4 py-2.5 text-end">{t('subtotal')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
              {(order.orderItems || []).map((item) => (
                <tr key={item.id} className="even:bg-slate-50/50 dark:even:bg-gray-900/40">
                  <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{productName(item.product, item.productId)}</td>
                  <td className="px-4 py-2.5 text-center text-slate-700 dark:text-slate-300">{item.quantity}</td>
                  <td className="px-4 py-2.5 text-end text-slate-600 dark:text-slate-400 hidden sm:table-cell">{money(item.price)}</td>
                  <td className="px-4 py-2.5 text-end font-semibold text-slate-900 dark:text-white">{money(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        {canEdit ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-dashed border-warning-300 dark:border-warning-800 bg-warning-50/50 dark:bg-warning-950/20">
            <p className="text-body-muted">
              {isAr
                ? 'منتج غير متوفر؟ عدّل المنتجات — سيُطلب من العميل تأكيد التعديل.'
                : 'Artikel nicht vorrätig? Artikel ändern — der Kunde muss die Änderung bestätigen.'}
            </p>
            <Button variant="secondary" icon={Edit} onClick={startEditing} disabled={stale}>
              {isAr ? 'تعديل المنتجات' : 'Artikel ändern'}
            </Button>
          </div>
        ) : (
          <p className="text-caption">{isAr ? 'لا يمكن تعديل المنتجات لطلب مُسلَّم أو ملغى.' : 'Zugestellte oder abgelehnte Bestellungen können nicht mehr geändert werden.'}</p>
        )}
      </>
    );
  }

  return (
    <>
      <div role="note" className="p-3.5 rounded-xl bg-warning-50 dark:bg-warning-950/50 border border-warning-300 dark:border-warning-800 text-warning-900 dark:text-warning-100 text-sm flex items-start gap-2.5">
        <AlertTriangle className="w-5 h-5 shrink-0 text-warning-600 dark:text-warning-400" aria-hidden="true" />
        <p>
          {isAr
            ? 'وضع تعديل المنتجات: عند الحفظ يُرسل بريد للعميل وينتظر الطلب موافقته.'
            : 'Artikel-Änderung: Beim Speichern wird der Kunde per E-Mail benachrichtigt und die Bestellung wartet auf seine Bestätigung.'}
        </p>
      </div>

      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={item.productId} className="p-3 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{productName(item.product, item.productId)}</p>
              <p className="text-caption tabular-nums">
                {money(item.price)} / {isAr ? 'قطعة' : 'Stk.'}
                {item.product?.stock !== undefined && ` · ${isAr ? 'المخزون' : 'Lager'}: ${item.product.stock}`}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <IconButton icon={Minus} label={isAr ? 'تقليل الكمية' : 'Menge verringern'} onClick={() => changeQty(index, -1)} disabled={item.quantity <= 1} />
              <span className="w-8 text-center text-sm font-bold tabular-nums" aria-live="polite">{item.quantity}</span>
              <IconButton icon={Plus} label={isAr ? 'زيادة الكمية' : 'Menge erhöhen'} onClick={() => changeQty(index, 1)} />
            </div>
            <span className="w-20 text-end text-sm font-bold tabular-nums hidden sm:block">{money(item.price * item.quantity)}</span>
            <IconButton icon={Trash2} label={isAr ? 'إزالة المنتج' : 'Artikel entfernen'} onClick={() => removeItem(index)}
              className="hover:!text-danger-600 hover:!bg-danger-50 dark:hover:!bg-danger-950/40" />
          </li>
        ))}
      </ul>

      <ProductPicker editItems={items} handleAddProductWithQty={addProduct} products={reference.products} />

      <Textarea
        label={isAr ? 'سبب التعديل / رسالة للعميل (تُرسل بالبريد)' : 'Grund der Änderung / Nachricht an den Kunden (per E-Mail)'}
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={isAr ? 'مثال: الحليب غير متوفر حالياً' : 'z.B. Milch war leider ausverkauft.'}
      />

      <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-gray-900 text-sm flex flex-wrap items-center justify-between gap-2 tabular-nums">
        <span className="text-slate-500 dark:text-slate-400">
          {isAr ? 'مجموع المنتجات:' : 'Artikelsumme:'} <span className="line-through">{money(oldItemsTotal)}</span>
        </span>
        <span className="font-bold text-slate-900 dark:text-white">
          {isAr ? 'الجديد (تقريبي):' : 'Neu (ca.):'} {money(newItemsTotal)}
        </span>
      </div>
      <p className="text-caption">
        {isAr ? 'يتم حساب العروض والقسيمة ورسوم التوصيل من جديد عند الحفظ.' : 'Aktionen, Gutschein und Liefergebühr werden beim Speichern neu berechnet.'}
      </p>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={() => setEditing(false)}>{t('cancel')}</Button>
        <Button variant="warning" loading={saving} disabled={stale || items.length === 0} onClick={save}>
          {isAr ? 'حفظ وإرسال للعميل' : 'Speichern & an Kunden senden'}
        </Button>
      </div>
    </>
  );
};
