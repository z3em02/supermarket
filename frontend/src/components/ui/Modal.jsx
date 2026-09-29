import { useId } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useDialogBehavior } from './useDialogBehavior';

const WIDTHS = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };

// Centered dialog shell; full-screen sheet on phones.
export const Modal = ({ isOpen, onClose, title, description, size = 'md', footer, children }) => {
  const { direction, language } = useLanguage();
  const titleId = useId();
  const panelRef = useDialogBehavior(isOpen, onClose);
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        dir={direction}
        className={`w-full ${WIDTHS[size] || WIDTHS.md} max-h-[100dvh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-gray-800 shadow-2xl focus:outline-none`}
      >
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-heading-lg">{title}</h2>
            {description && <p className="text-body-muted mt-1">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label={language === 'ar' ? 'إغلاق' : 'Schließen'}
            className="shrink-0 inline-flex items-center justify-center min-w-11 min-h-11 -m-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-800 cursor-pointer">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 pb-5 space-y-4">{children}</div>
        {footer && <div className="px-5 sm:px-6 py-4 border-t border-slate-100 dark:border-gray-800 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};
