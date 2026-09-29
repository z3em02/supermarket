import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useLanguage } from './LanguageContext';

// Non-blocking replacement for alert()/window.confirm(): toasts plus an
// awaitable confirm dialog, themed, dark-mode and RTL aware.
//
//   const toast = useToast();      toast.success('Gespeichert'); toast.error(msg);
//   const confirm = useConfirm();  if (!(await confirm({ message, variant: 'danger' }))) return;

const FeedbackContext = createContext(null);

const TOAST_STYLES = {
  success: { icon: CheckCircle2, box: 'bg-success-50 dark:bg-success-950 border-success-300 dark:border-success-800 text-success-900 dark:text-success-100', icon_: 'text-success-600 dark:text-success-400' },
  error: { icon: AlertCircle, box: 'bg-danger-50 dark:bg-danger-950 border-danger-300 dark:border-danger-800 text-danger-900 dark:text-danger-100', icon_: 'text-danger-600 dark:text-danger-400' },
  warning: { icon: AlertTriangle, box: 'bg-warning-50 dark:bg-warning-950 border-warning-300 dark:border-warning-800 text-warning-900 dark:text-warning-100', icon_: 'text-warning-600 dark:text-warning-400' },
  info: { icon: Info, box: 'bg-info-50 dark:bg-info-950 border-info-300 dark:border-info-800 text-info-900 dark:text-info-100', icon_: 'text-info-600 dark:text-info-400' }
};

const CONFIRM_VARIANTS = {
  danger: { icon: AlertTriangle, badge: 'bg-danger-50 dark:bg-danger-950/60 border-danger-200 dark:border-danger-900/60 text-danger-600 dark:text-danger-400', button: 'bg-danger-600 hover:bg-danger-700' },
  warning: { icon: AlertTriangle, badge: 'bg-warning-50 dark:bg-warning-950/60 border-warning-200 dark:border-warning-900/60 text-warning-600 dark:text-warning-400', button: 'bg-warning-600 hover:bg-warning-700' },
  primary: { icon: CheckCircle2, badge: 'bg-primary-50 dark:bg-primary-950/60 border-primary-200 dark:border-primary-900/60 text-primary-600 dark:text-primary-400', button: 'bg-primary-600 hover:bg-primary-700' },
  brand: { icon: CheckCircle2, badge: 'bg-brand-50 dark:bg-brand-950/60 border-brand-200 dark:border-brand-900/60 text-brand-600 dark:text-brand-400', button: 'bg-brand-600 hover:bg-brand-700' }
};

let toastSeq = 0;

export const FeedbackProvider = ({ children }) => {
  const { direction, language } = useLanguage();
  const isAr = language === 'ar';

  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  // Mirrors `dialog` for the callbacks below (kept in sync where it's set).
  const dialogRef = useRef(null);

  const dismiss = useCallback((id) => setToasts((prev) => prev.filter((x) => x.id !== id)), []);

  const show = useCallback((type, message, duration) => {
    if (!message) return null;
    const id = ++toastSeq;
    const ms = duration ?? (type === 'error' ? 6000 : 4000);
    setToasts((prev) => [...prev.slice(-3), { id, type, message: String(message) }]);
    if (ms > 0) setTimeout(() => dismiss(id), ms);
    return id;
  }, [dismiss]);

  // Stable object so consumers can safely list it in hook dependencies.
  const toast = useMemo(() => ({
    success: (m, d) => show('success', m, d),
    error: (m, d) => show('error', m, d),
    warning: (m, d) => show('warning', m, d),
    info: (m, d) => show('info', m, d),
    dismiss
  }), [show, dismiss]);

  const close = useCallback((result) => {
    const current = dialogRef.current;
    if (!current) return;
    dialogRef.current = null;
    setDialog(null);
    current.resolve(result);
  }, []);

  const confirm = useCallback((options) => new Promise((resolve) => {
    const opts = typeof options === 'string' ? { message: options } : (options || {});
    // A new confirm replaces an open one; the replaced caller gets `false`.
    dialogRef.current?.resolve(false);
    const next = {
      title: opts.title,
      message: opts.message || '',
      confirmText: opts.confirmText,
      cancelText: opts.cancelText,
      variant: CONFIRM_VARIANTS[opts.variant] ? opts.variant : 'danger',
      resolve
    };
    dialogRef.current = next;
    setDialog(next);
  }), []);

  // Escape cancels the dialog. Capture phase + stopPropagation so an open
  // drawer/modal underneath doesn't also close on the same key press.
  useEffect(() => {
    if (!dialog) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [dialog, close]);

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);
  const variant = dialog ? CONFIRM_VARIANTS[dialog.variant] : null;
  const VariantIcon = variant?.icon;

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div
        // Bottom corner, above dialogs: never covers page/drawer headers or their close buttons.
        className={`fixed bottom-4 z-[10001] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none ${direction === 'rtl' ? 'left-0 sm:left-4' : 'right-0 sm:right-4'}`}
        dir={direction}
      >
        {toasts.map((x) => {
          const s = TOAST_STYLES[x.type] || TOAST_STYLES.info;
          const Icon = s.icon;
          return (
            <div
              key={x.id}
              role={x.type === 'error' ? 'alert' : 'status'}
              aria-live={x.type === 'error' ? 'assertive' : 'polite'}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-lg animate-toast-in ${s.box}`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${s.icon_}`} aria-hidden="true" />
              <p className="flex-1 text-sm font-medium leading-relaxed break-words">{x.message}</p>
              <button
                type="button"
                onClick={() => dismiss(x.id)}
                className="shrink-0 p-1 -m-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                aria-label={isAr ? 'إغلاق' : 'Schließen'}
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      {dialog && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
          onMouseDown={(e) => { if (e.target === e.currentTarget) close(false); }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="feedback-confirm-title"
            aria-describedby="feedback-confirm-message"
            dir={direction}
            className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-2xl p-6 space-y-5"
          >
            <div className="flex items-start gap-3.5">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${variant.badge}`}>
                <VariantIcon className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-1.5 min-w-0">
                <h2 id="feedback-confirm-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {dialog.title || (isAr ? 'تأكيد الإجراء' : 'Bitte bestätigen')}
                </h2>
                <p id="feedback-confirm-message" className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {dialog.message}
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                // Destructive dialogs focus Cancel, so Enter never deletes by accident.
                autoFocus={dialog.variant === 'danger'}
                onClick={() => close(false)}
                className="min-h-11 px-4 rounded-xl border border-slate-200 dark:border-gray-700 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                {dialog.cancelText || (isAr ? 'إلغاء' : 'Abbrechen')}
              </button>
              <button
                type="button"
                autoFocus={dialog.variant !== 'danger'}
                onClick={() => close(true)}
                className={`min-h-11 px-4 rounded-xl text-sm font-bold text-white shadow-sm cursor-pointer ${variant.button}`}
              >
                {dialog.confirmText || (isAr ? 'تأكيد' : 'Bestätigen')}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
};

const useFeedback = () => {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useToast/useConfirm must be used inside <FeedbackProvider>');
  return ctx;
};

export const useToast = () => useFeedback().toast;
export const useConfirm = () => useFeedback().confirm;
