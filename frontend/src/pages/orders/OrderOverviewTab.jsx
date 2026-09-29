import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Lock, MapPin, Sparkles, Tag, Truck, XCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useConfirm } from '../../context/FeedbackContext';
import { Button, Card, Select, Textarea } from '../../components/ui';
import { formatDeliverySlot, maxDeliveryDateIso, parseDeliverySlot, todayIso, windowLabel } from '../../utils/deliverySlot';
import { parseOrderNotes } from './orderNotes';

const STATUS_OPTIONS = ['pending', 'accepted', 'preparing', 'out_for_delivery', 'shipped', 'delivered', 'declined'];
const money = (v) => `€${Number(v || 0).toFixed(2)}`;

// Übersicht: status, driver, delivery slot, internal note and totals — all
// admin-immediate, each saved on its own (no customer approval involved).
export const OrderOverviewTab = ({ order, stale, runWrite, setDirty, actions, reference }) => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const confirm = useConfirm();
  const { activeDrivers, knownDriverNames, deliveryWindows } = reference;

  // Drafts are null until the admin edits them, so they always show the
  // server value after a save/reload without syncing props into state.
  const [statusDraft, setStatusDraft] = useState(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingDriver, setSavingDriver] = useState(false);
  const [editingSlot, setEditingSlot] = useState(false);
  const [slotDate, setSlotDate] = useState('');
  const [slotWindowId, setSlotWindowId] = useState(null);
  const [savingSlot, setSavingSlot] = useState(false);
  const [noteDraft, setNoteDraft] = useState(null);
  const [savingNote, setSavingNote] = useState(false);

  const targetStatus = statusDraft ?? order.status;
  const adminNote = noteDraft ?? (order.adminNotes || '');
  const statusDirty = targetStatus !== order.status;
  const noteDirty = adminNote !== (order.adminNotes || '');
  useEffect(() => { setDirty('status', statusDirty); }, [statusDirty, setDirty]);
  useEffect(() => { setDirty('note', noteDirty); }, [noteDirty, setDirty]);
  useEffect(() => { setDirty('slot', editingSlot); }, [editingSlot, setDirty]);

  const version = order.updatedAt;
  const { customerResponse } = parseOrderNotes(order.adminNotes, language);

  const statusLabel = (s) => (
    s === 'out_for_delivery' ? (isAr ? 'جاري التوصيل للمنزل' : 'In Zustellung')
      : s === 'pending_customer_approval' ? (isAr ? 'بانتظار موافقة العميل' : 'Wartet auf Kundenbestätigung')
        : t(s)
  );

  const saveStatus = async () => {
    if (targetStatus === 'accepted' && !order.assignedDriverName) {
      // A driver only sees orders assigned to them — accepting without one
      // would leave the order invisible to every driver.
      await confirm({
        title: isAr ? 'اختر سائقاً أولاً' : 'Zuerst einen Fahrer wählen',
        message: isAr ? 'لا يمكن قبول الطلب بدون سائق. اختر السائق أدناه ثم احفظ الحالة.' : 'Eine Bestellung kann nur mit Fahrer angenommen werden. Wählen Sie unten einen Fahrer und speichern Sie dann den Status.',
        confirmText: 'OK',
        variant: 'primary'
      });
      return;
    }
    if (targetStatus === 'declined') {
      const ok = await confirm({
        title: isAr ? 'رفض الطلب؟' : 'Bestellung ablehnen?',
        message: isAr
          ? 'سيتم إبلاغ العميل وإرجاع الكمية المخصومة إلى المخزون.'
          : 'Der Kunde wird benachrichtigt, bereits abgezogener Lagerbestand wird zurückgebucht.',
        confirmText: isAr ? 'رفض الطلب' : 'Ablehnen',
        variant: 'danger'
      });
      if (!ok) return;
    }
    setSavingStatus(true);
    const ok = await runWrite(
      () => actions.changeStatus(order.id, { status: targetStatus, expectedUpdatedAt: version }),
      isAr ? 'تم تحديث الحالة' : 'Status aktualisiert'
    );
    setSavingStatus(false);
    if (ok) setStatusDraft(null);
  };

  const saveDriver = async (name) => {
    setSavingDriver(true);
    await runWrite(
      () => actions.assignDriver(order.id, name, version),
      name ? (isAr ? `تم تعيين ${name}` : `${name} zugewiesen`) : (isAr ? 'تمت إزالة السائق' : 'Fahrer entfernt')
    );
    setSavingDriver(false);
  };

  const openSlotEditor = () => {
    const parsed = parseDeliverySlot(order.deliverySlot);
    setSlotDate(parsed?.date || todayIso());
    const match = parsed ? deliveryWindows.find((w) => w.startHour === parsed.startHour && w.endHour === parsed.endHour) : null;
    setSlotWindowId((match || deliveryWindows[0])?.id ?? null);
    setEditingSlot(true);
  };

  const saveSlot = async () => {
    const win = deliveryWindows.find((w) => w.id === slotWindowId);
    if (!win) return;
    setSavingSlot(true);
    const ok = await runWrite(
      () => actions.saveDeliverySlot(order.id, slotDate, win, version),
      isAr ? 'تم تحديث وقت التوصيل' : 'Lieferzeit aktualisiert'
    );
    setSavingSlot(false);
    if (ok) setEditingSlot(false);
  };

  const saveNote = async () => {
    setSavingNote(true);
    const ok = await runWrite(
      () => actions.changeStatus(order.id, { adminNotes: adminNote, expectedUpdatedAt: version }),
      isAr ? 'تم حفظ الملاحظة' : 'Notiz gespeichert'
    );
    setSavingNote(false);
    if (ok) setNoteDraft(null);
  };

  return (
    <>
      {customerResponse && (
        <div className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-sm font-bold ${
          customerResponse.type === 'accepted'
            ? 'bg-success-50 dark:bg-success-950/50 border-success-200 dark:border-success-800 text-success-800 dark:text-success-200'
            : 'bg-danger-50 dark:bg-danger-950/50 border-danger-200 dark:border-danger-800 text-danger-800 dark:text-danger-200'
        }`}>
          {customerResponse.type === 'accepted'
            ? <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
            : <XCircle className="w-5 h-5 shrink-0" aria-hidden="true" />}
          <span>{customerResponse.label}</span>
        </div>
      )}

      <Card padding="p-4 sm:p-5" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Select
              label={t('status')}
              value={targetStatus}
              onChange={(e) => setStatusDraft(e.target.value)}
              disabled={stale || savingStatus}
            >
              {order.status === 'pending_customer_approval' && (
                <option value="pending_customer_approval" disabled>{statusLabel('pending_customer_approval')}</option>
              )}
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </Select>
            {statusDirty && (
              <div className="flex gap-2">
                <Button size="sm" loading={savingStatus} disabled={stale} onClick={saveStatus}>
                  {isAr ? 'حفظ الحالة' : 'Status speichern'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setStatusDraft(null)}>{t('cancel')}</Button>
              </div>
            )}
            {statusDirty && <p className="text-caption">{isAr ? 'سيتلقى العميل إشعاراً بالحالة الجديدة.' : 'Der Kunde wird über den neuen Status benachrichtigt.'}</p>}
          </div>

          <Select
            label={isAr ? 'السائق المسؤول' : 'Zugewiesener Fahrer'}
            value={order.assignedDriverName || ''}
            onChange={(e) => saveDriver(e.target.value)}
            disabled={stale || savingDriver}
            hint={savingDriver ? (isAr ? 'جارٍ الحفظ…' : 'Wird gespeichert…') : undefined}
          >
            <option value="">{isAr ? 'غير مُعيَّن' : 'Nicht zugewiesen'}</option>
            {(order.assignedDriverName && !knownDriverNames.includes(order.assignedDriverName)
              ? [order.assignedDriverName, ...knownDriverNames]
              : knownDriverNames
            ).map((name) => (
              <option key={name} value={name}>
                {name}{!activeDrivers.some((d) => d.driverName === name) ? (isAr ? ' (غير متصل)' : ' (offline)') : ''}
              </option>
            ))}
          </Select>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-gray-800 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-caption">{isAr ? 'وقت التوصيل' : 'Lieferzeit'}</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatDeliverySlot(order.deliverySlot, isAr) || (isAr ? 'لم يُحدد بعد' : 'Noch nicht festgelegt')}
                </p>
              </div>
            </div>
            {!editingSlot && (
              <Button size="sm" variant="secondary" onClick={openSlotEditor} disabled={stale}>
                {isAr ? 'تعديل الوقت' : 'Zeit ändern'}
              </Button>
            )}
          </div>
          {editingSlot && (
            <div className="space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-gray-950/60 border border-slate-200 dark:border-gray-800">
              <label className="block space-y-1.5">
                <span className="block text-xs font-bold text-slate-600 dark:text-slate-300">{isAr ? 'التاريخ' : 'Datum'}</span>
                <input type="date" value={slotDate} min={todayIso()} max={maxDeliveryDateIso()} onChange={(e) => setSlotDate(e.target.value)}
                  className="min-h-11 px-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-slate-900 dark:text-white" />
              </label>
              {deliveryWindows.length === 0 ? (
                <p className="text-sm text-warning-700 dark:text-warning-400">
                  {isAr ? 'لا توجد أوقات توصيل مُفعّلة. أضفها في الإعدادات.' : 'Keine aktiven Zeitfenster. Bitte in den Einstellungen anlegen.'}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={isAr ? 'فترة التوصيل' : 'Zeitfenster'}>
                  {deliveryWindows.map((w) => (
                    <button key={w.id} type="button" role="radio" aria-checked={slotWindowId === w.id} onClick={() => setSlotWindowId(w.id)}
                      className={`min-h-11 px-3 rounded-xl border text-sm font-bold cursor-pointer ${
                        slotWindowId === w.id
                          ? 'bg-primary-600 border-primary-600 text-white'
                          : 'bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-700 text-slate-700 dark:text-slate-200 hover:border-primary-400'
                      }`}>
                      {windowLabel(w.startHour, w.endHour, isAr)}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" loading={savingSlot} disabled={stale || !slotWindowId || !slotDate} onClick={saveSlot}>{t('save')}</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingSlot(false)}>{t('cancel')}</Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card padding="p-4 sm:p-5" className="space-y-3">
        <Textarea
          label={<span className="inline-flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" aria-hidden="true" />{t('adminNotes')} ({t('internalNoteOnly')})</span>}
          rows={3}
          value={adminNote}
          onChange={(e) => setNoteDraft(e.target.value)}
          disabled={stale}
          placeholder={isAr ? 'مثال: الطابق الثاني، الجرس على اليسار' : 'z.B. 2. Stock links klingeln'}
        />
        {noteDirty && (
          <div className="flex gap-2">
            <Button size="sm" loading={savingNote} disabled={stale} onClick={saveNote}>{t('save')}</Button>
            <Button size="sm" variant="ghost" onClick={() => setNoteDraft(null)}>{t('cancel')}</Button>
          </div>
        )}
      </Card>

      <Card padding="p-4 sm:p-5">
        <dl className="space-y-2 text-sm tabular-nums">
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <dt>{isAr ? 'المجموع الفرعي' : 'Zwischensumme'}</dt>
            <dd>{money(order.itemsSubtotal)}</dd>
          </div>
          {Number(order.promotionDiscount) > 0 && (
            <div className="flex justify-between text-danger-600 dark:text-danger-400 font-semibold">
              <dt className="inline-flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" aria-hidden="true" />{isAr ? 'خصم العروض' : 'Aktionsrabatt'}</dt>
              <dd>-{money(order.promotionDiscount)}</dd>
            </div>
          )}
          {Number(order.couponDiscount) > 0 && (
            <div className="flex justify-between text-promo-600 dark:text-promo-400 font-semibold">
              <dt className="inline-flex items-center gap-1"><Tag className="w-3.5 h-3.5" aria-hidden="true" />{t('coupon')}{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
              <dd>-{money(order.couponDiscount)}</dd>
            </div>
          )}
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <dt className="inline-flex items-center gap-1"><Truck className="w-3.5 h-3.5" aria-hidden="true" />{t('deliveryFee')}</dt>
            <dd>{Number(order.deliveryFee) > 0 ? money(order.deliveryFee) : <span className="text-success-600 dark:text-success-400 font-semibold">{t('freeShipping')}</span>}</dd>
          </div>
          {Number(order.deliveryDistanceKm) > 0 && (
            <div className="flex justify-between text-caption">
              <dt className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" aria-hidden="true" />{isAr ? 'المسافة' : 'Distanz'}</dt>
              <dd>{order.deliveryDistanceKm} km</dd>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-gray-800 text-base font-bold text-slate-900 dark:text-white">
            <dt>{t('total')}</dt>
            <dd className="text-primary-600 dark:text-primary-400">{money(order.totalAmount)}</dd>
          </div>
        </dl>
      </Card>
    </>
  );
};
