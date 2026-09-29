import { useState } from 'react';
import { FileText, Mail, MapPin, MessageSquare, Navigation, Phone, User } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Button, Card, Textarea } from '../../components/ui';

// Kunde & Lieferung: contact details (tap-to-call, maps), delivery notes and
// the note shown to the customer.
export const OrderCustomerTab = ({ order, stale, runWrite, actions }) => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const [noteDraft, setNoteDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  const name = order.customer?.name || order.customerName || '—';
  const phone = order.customerPhone || order.customer?.phone;
  const email = order.customerEmail || order.customer?.email;
  const address = order.deliveryAddress;
  const customerNote = noteDraft ?? (order.notes || '');
  const dirty = customerNote !== (order.notes || '');

  const saveNote = async () => {
    setSaving(true);
    const ok = await runWrite(
      () => actions.changeStatus(order.id, { notes: customerNote, expectedUpdatedAt: order.updatedAt }),
      isAr ? 'تم حفظ الملاحظة' : 'Notiz gespeichert'
    );
    setSaving(false);
    if (ok) setNoteDraft(null);
  };

  const row = 'flex items-start gap-3 py-3 border-b last:border-b-0 border-slate-100 dark:border-gray-800';
  const label = 'text-caption';
  const value = 'text-sm font-semibold text-slate-900 dark:text-white break-words';

  return (
    <>
      <Card padding="px-4 sm:px-5 py-1">
        <div className={row}>
          <User className="w-4 h-4 mt-1 text-slate-400 shrink-0" aria-hidden="true" />
          <div className="min-w-0"><p className={label}>{isAr ? 'العميل' : 'Kunde'}</p><p className={value}>{name}</p></div>
        </div>
        {phone && (
          <div className={row}>
            <Phone className="w-4 h-4 mt-1 text-slate-400 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1"><p className={label}>{isAr ? 'الهاتف' : 'Telefon'}</p><p className={`${value} tabular-nums`} dir="ltr">{phone}</p></div>
            <a href={`tel:${phone.replace(/[^\d+]/g, '')}`}
              className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl bg-success-600 hover:bg-success-700 text-white text-sm font-bold shrink-0">
              <Phone className="w-4 h-4" aria-hidden="true" />{isAr ? 'اتصال' : 'Anrufen'}
            </a>
          </div>
        )}
        {email && (
          <div className={row}>
            <Mail className="w-4 h-4 mt-1 text-slate-400 shrink-0" aria-hidden="true" />
            <div className="min-w-0"><p className={label}>E-Mail</p><a href={`mailto:${email}`} className={`${value} text-primary-700 dark:text-primary-300 hover:underline`}>{email}</a></div>
          </div>
        )}
        <div className={row}>
          <MapPin className="w-4 h-4 mt-1 text-slate-400 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1"><p className={label}>{isAr ? 'عنوان التوصيل' : 'Lieferadresse'}</p><p className={value}>{address || '—'}</p></div>
          {address && (
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl border border-slate-200 dark:border-gray-700 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-gray-800 shrink-0">
              <Navigation className="w-4 h-4" aria-hidden="true" />{isAr ? 'الخريطة' : 'Karte'}
            </a>
          )}
        </div>
        {order.deliveryNotes && (
          <div className={row}>
            <FileText className="w-4 h-4 mt-1 text-slate-400 shrink-0" aria-hidden="true" />
            <div className="min-w-0"><p className={label}>{isAr ? 'ملاحظات التوصيل' : 'Lieferhinweise'}</p><p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line">{order.deliveryNotes}</p></div>
          </div>
        )}
      </Card>

      <Card padding="p-4 sm:p-5" className="space-y-3">
        <Textarea
          label={<span className="inline-flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />{t('customerNotes')}</span>}
          hint={isAr ? 'هذه الملاحظة مرئية للعميل.' : 'Diese Notiz ist für den Kunden sichtbar.'}
          rows={3}
          value={customerNote}
          onChange={(e) => setNoteDraft(e.target.value)}
          disabled={stale}
          placeholder={t('notesPlaceholder')}
        />
        {dirty && (
          <div className="flex gap-2">
            <Button size="sm" loading={saving} disabled={stale} onClick={saveNote}>{t('save')}</Button>
            <Button size="sm" variant="ghost" onClick={() => setNoteDraft(null)}>{t('cancel')}</Button>
          </div>
        )}
      </Card>
    </>
  );
};
