import { useEffect, useState } from 'react';
import { CheckCircle2, Edit, PackagePlus, RefreshCw, Truck, XCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Card, Skeleton } from '../../components/ui';
import { parseOrderNotes } from './orderNotes';

const ACTION_META = {
  UPDATE_ORDER_STATUS: { icon: RefreshCw, de: 'Status geändert', ar: 'تغيير الحالة' },
  EDIT_ORDER: { icon: Edit, de: 'Artikel geändert', ar: 'تعديل المنتجات' },
  ASSIGN_ORDER_DRIVER: { icon: Truck, de: 'Fahrer', ar: 'السائق' }
};

// Verlauf: the order's own audit trail (GET /api/orders/:id/history — no
// section passcode needed, unlike the full audit log), loaded the first time
// the tab is opened and again whenever the order changes.
export const OrderHistoryTab = ({ order, active, actions }) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [state, setState] = useState({ status: 'idle', entries: [] });

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    actions.fetchOrderHistory(order.id)
      .then((data) => { if (!cancelled) setState({ status: 'ready', entries: data.entries || [] }); })
      .catch(() => { if (!cancelled) setState({ status: 'error', entries: [] }); });
    return () => { cancelled = true; };
  }, [active, order.id, order.updatedAt, actions]);

  const fmt = (d) => new Date(d).toLocaleString(isAr ? 'ar-DE' : 'de-DE', { dateStyle: 'short', timeStyle: 'short' });
  const { customerResponse } = parseOrderNotes(order.adminNotes, language);

  if (state.status === 'idle') {
    return <div className="space-y-3" role="status"><span className="sr-only">{isAr ? 'جارٍ التحميل…' : 'Wird geladen…'}</span><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" /></div>;
  }

  const events = [
    ...state.entries.map((e) => ({ key: e.id, at: e.createdAt, icon: (ACTION_META[e.action] || ACTION_META.UPDATE_ORDER_STATUS).icon,
      title: (ACTION_META[e.action] || { de: e.action, ar: e.action })[isAr ? 'ar' : 'de'], detail: e.detail, who: e.adminEmail })),
    { key: 'created', at: order.createdAt, icon: PackagePlus, title: isAr ? 'تم استلام الطلب' : 'Bestellung eingegangen' }
  ];

  return (
    <>
      {customerResponse && (
        <Card padding="p-3.5" className="flex items-center gap-2.5 text-sm font-semibold">
          {customerResponse.type === 'accepted'
            ? <CheckCircle2 className="w-5 h-5 text-success-600 shrink-0" aria-hidden="true" />
            : <XCircle className="w-5 h-5 text-danger-600 shrink-0" aria-hidden="true" />}
          {customerResponse.label}
        </Card>
      )}
      {state.status === 'error' && (
        <p role="alert" className="text-sm text-danger-600 dark:text-danger-400">
          {isAr ? 'تعذر تحميل السجل.' : 'Verlauf konnte nicht geladen werden.'}
        </p>
      )}
      <ol className="relative ms-3 border-s border-slate-200 dark:border-gray-800 space-y-4">
        {events.map((ev) => {
          const Icon = ev.icon;
          return (
            <li key={ev.key} className="ms-6">
              <span className="absolute -start-3 flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700">
                <Icon className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              </span>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{ev.title}</p>
              {ev.detail && <p className="text-sm text-slate-600 dark:text-slate-300 break-words">{ev.detail}</p>}
              <p className="text-caption tabular-nums">
                <time dateTime={new Date(ev.at).toISOString()}>{fmt(ev.at)}</time>
                {ev.who && ` · ${ev.who}`}
              </p>
            </li>
          );
        })}
      </ol>
    </>
  );
};
