import { useCallback, useRef, useState } from 'react';
import { AlertTriangle, History, LayoutDashboard, Package, Printer, RefreshCw, User } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useConfirm, useToast } from '../../context/FeedbackContext';
import { Drawer, IconButton } from '../../components/ui';
import { OrderStatusBadge } from '../../components/OrderStatusBadge';
import { OrderOverviewTab } from './OrderOverviewTab';
import { OrderItemsTab } from './OrderItemsTab';
import { OrderCustomerTab } from './OrderCustomerTab';
import { OrderHistoryTab } from './OrderHistoryTab';

const TABS = [
  { id: 'overview', icon: LayoutDashboard, de: 'Übersicht', ar: 'نظرة عامة' },
  { id: 'items', icon: Package, de: 'Artikel', ar: 'المنتجات' },
  { id: 'customer', icon: User, de: 'Kunde & Lieferung', ar: 'العميل والتوصيل' },
  { id: 'history', icon: History, de: 'Verlauf', ar: 'السجل' }
];
const PANELS = { overview: OrderOverviewTab, items: OrderItemsTab, customer: OrderCustomerTab, history: OrderHistoryTab };

/**
 * The single hub for one order: see and do everything without leaving the
 * list. Admin-immediate edits (status, driver, slot, notes) save inline; item
 * changes are a separate, confirmed action because they email the customer.
 *
 * Every write sends the `updatedAt` this drawer is showing; if someone else
 * changed the order meanwhile the server answers 409 and the drawer shows a
 * "changed — reload" banner instead of silently overwriting their change.
 *
 * Mount with `key={order.id}` so per-order form state starts fresh.
 */
export const OrderDrawer = ({
  order,
  initialTab = 'overview',
  onClose,
  onOrderChanged,
  onPrint,
  actions,
  reference
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const toast = useToast();
  const confirm = useConfirm();

  const [tab, setTab] = useState(initialTab);
  const [stale, setStale] = useState(false);
  const [reloading, setReloading] = useState(false);
  // Bumped on reload: remounts the tabs so drafts based on the old version are dropped.
  const [generation, setGeneration] = useState(0);
  // Tabs with unsaved input register here so closing asks before discarding.
  const dirtyRef = useRef(new Set());
  const setDirty = useCallback((key, dirty) => {
    if (dirty) dirtyRef.current.add(key); else dirtyRef.current.delete(key);
  }, []);

  const reload = useCallback(async () => {
    const fresh = await actions.fetchOrderById(order.id);
    onOrderChanged(fresh);
    return fresh;
  }, [actions, order.id, onOrderChanged]);

  const handleReload = async () => {
    if (!stale && dirtyRef.current.size > 0) {
      const ok = await confirm({
        title: isAr ? 'تغييرات غير محفوظة' : 'Ungespeicherte Änderungen',
        message: isAr ? 'إعادة التحميل تتجاهل التغييرات غير المحفوظة. متابعة؟' : 'Neu laden verwirft ungespeicherte Änderungen. Fortfahren?',
        confirmText: isAr ? 'إعادة التحميل' : 'Neu laden',
        variant: 'warning'
      });
      if (!ok) return;
    }
    setReloading(true);
    try {
      await reload();
      dirtyRef.current.clear();
      setGeneration((g) => g + 1);
      setStale(false);
    } catch (err) {
      toast.error(err.response?.data?.error || (isAr ? 'تعذر تحديث الطلب' : 'Bestellung konnte nicht neu geladen werden'));
    } finally {
      setReloading(false);
    }
  };

  // Runs one drawer write: success toast + fresh order on success; a 409
  // (someone else changed the order) flips the drawer into the stale state.
  const runWrite = useCallback(async (write, successMessage) => {
    try {
      await write();
      if (successMessage) toast.success(successMessage);
      try { await reload(); } catch (err) { console.error('Reload after save failed:', err); }
      return true;
    } catch (err) {
      if (err.response?.status === 409) {
        setStale(true);
        toast.warning(isAr ? 'تم تغيير الطلب من جهة أخرى. يرجى إعادة التحميل.' : 'Die Bestellung wurde inzwischen geändert. Bitte neu laden.');
      } else {
        toast.error(err.response?.data?.error || (isAr ? 'حدث خطأ أثناء الحفظ' : 'Speichern fehlgeschlagen'));
      }
      return false;
    }
  }, [isAr, reload, toast]);

  const requestClose = async () => {
    if (dirtyRef.current.size > 0) {
      const ok = await confirm({
        title: isAr ? 'تغييرات غير محفوظة' : 'Ungespeicherte Änderungen',
        message: isAr ? 'هناك تغييرات لم تُحفظ. هل تريد الإغلاق وتجاهلها؟' : 'Es gibt ungespeicherte Änderungen. Trotzdem schließen und verwerfen?',
        confirmText: isAr ? 'تجاهل وإغلاق' : 'Verwerfen & schließen',
        variant: 'warning'
      });
      if (!ok) return;
    }
    onClose();
  };

  const shared = { order, stale, runWrite, setDirty, actions, reference };

  return (
    <Drawer
      isOpen
      onClose={requestClose}
      width="sm:max-w-3xl"
      title={
        <span className="inline-flex items-center gap-2 flex-wrap">
          <span className="font-mono">#{order.id.slice(0, 8).toUpperCase()}</span>
          <OrderStatusBadge status={order.status} size="xs" />
        </span>
      }
      subtitle={
        // <bdi> keeps each part's direction, so Latin names and dates don't
        // get reordered inside the Arabic (RTL) line.
        <span className="tabular-nums">
          <bdi>{order.customer?.name || order.customerName || (isAr ? 'عميل' : 'Kunde')}</bdi>
          {' · '}
          <bdi>{new Date(order.createdAt).toLocaleString(isAr ? 'ar-DE' : 'de-DE', { dateStyle: 'short', timeStyle: 'short' })}</bdi>
          {' · '}
          <bdi className="font-bold text-slate-700 dark:text-slate-200">€{Number(order.totalAmount).toFixed(2)}</bdi>
        </span>
      }
      headerExtra={
        <>
          <IconButton icon={RefreshCw} label={isAr ? 'إعادة تحميل الطلب' : 'Bestellung neu laden'} onClick={handleReload} disabled={reloading}
            className={reloading ? '[&>svg]:animate-spin' : ''} />
          <IconButton icon={Printer} label={isAr ? 'طباعة' : 'Drucken'} onClick={() => onPrint(order)} />
        </>
      }
    >
      {stale && (
        <div role="alert" className="mx-4 sm:mx-6 mt-4 p-3.5 rounded-xl border border-warning-300 dark:border-warning-800 bg-warning-50 dark:bg-warning-950/60 text-warning-900 dark:text-warning-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-warning-600 dark:text-warning-400" aria-hidden="true" />
          <p className="flex-1 text-sm">
            {isAr
              ? 'تم تغيير هذا الطلب من جهة أخرى بعد فتحه. لم يتم حفظ تعديلك — أعد التحميل لرؤية الحالة الحالية.'
              : 'Diese Bestellung wurde inzwischen von jemand anderem geändert. Ihre Änderung wurde nicht gespeichert — laden Sie neu, um den aktuellen Stand zu sehen.'}
          </p>
          <button type="button" onClick={handleReload} disabled={reloading}
            className="min-h-11 px-4 rounded-xl bg-warning-600 hover:bg-warning-700 text-white text-sm font-bold cursor-pointer disabled:opacity-60 shrink-0">
            {isAr ? 'إعادة التحميل' : 'Neu laden'}
          </button>
        </div>
      )}

      <div role="tablist" aria-label={isAr ? 'أقسام الطلب' : 'Bestellbereiche'}
        className="sticky top-0 z-10 flex gap-1 px-2 sm:px-4 pt-3 bg-slate-50 dark:bg-gray-950 border-b border-slate-200 dark:border-gray-800 overflow-x-auto">
        {TABS.map((tItem) => {
          const Icon = tItem.icon;
          const active = tab === tItem.id;
          return (
            <button
              key={tItem.id}
              type="button"
              role="tab"
              id={`order-tab-${tItem.id}`}
              aria-selected={active}
              aria-controls={`order-panel-${tItem.id}`}
              onClick={() => setTab(tItem.id)}
              className={`inline-flex items-center gap-1.5 min-h-11 px-3 -mb-px border-b-2 text-sm font-bold whitespace-nowrap cursor-pointer ${
                active
                  ? 'border-primary-600 text-primary-700 dark:text-primary-300'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {isAr ? tItem.ar : tItem.de}
            </button>
          );
        })}
      </div>

      {/* All tabs stay mounted (inactive ones hidden) so unsaved input
          survives switching tabs; closing asks before discarding it. */}
      {TABS.map((tItem) => {
        const Panel = PANELS[tItem.id];
        return (
          <div key={`${tItem.id}:${generation}`} role="tabpanel" id={`order-panel-${tItem.id}`} aria-labelledby={`order-tab-${tItem.id}`}
            hidden={tab !== tItem.id} className="p-4 sm:p-6 space-y-4">
            <Panel {...shared} active={tab === tItem.id} />
          </div>
        );
      })}
    </Drawer>
  );
};
