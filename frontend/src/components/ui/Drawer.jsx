import { useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useDialogBehavior } from './useDialogBehavior';

// Side panel that slides in from the inline-end edge (right in DE, left in AR);
// full-screen on phones. `headerExtra` renders next to the close button.
export const Drawer = ({ isOpen, onClose, title, subtitle, headerExtra, footer, width = 'sm:max-w-2xl', children }) => {
  const { direction, language } = useLanguage();
  const titleId = useId();
  const panelRef = useDialogBehavior(isOpen, onClose);
  if (!isOpen) return null;
  const rtl = direction === 'rtl';
  // Portal to <body>: a transformed/filtered ancestor would otherwise become
  // the containing block of this fixed overlay (and sticky headers would sit on top).
  return createPortal(
    <div className="fixed inset-0 z-50" dir={direction}>
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`absolute inset-y-0 ${rtl ? 'left-0 animate-drawer-in-start' : 'right-0 animate-drawer-in-end'} w-full ${width} flex flex-col bg-slate-50 dark:bg-gray-950 shadow-2xl focus:outline-none ${rtl ? 'sm:border-r' : 'sm:border-l'} border-slate-200 dark:border-gray-800`}
      >
        <header className="flex items-start justify-between gap-3 px-4 sm:px-6 py-4 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-800">
          <div className="min-w-0">
            <h2 id={titleId} className="text-heading-lg truncate">{title}</h2>
            {subtitle && <div className="text-body-muted mt-1">{subtitle}</div>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {headerExtra}
            <button type="button" onClick={onClose} aria-label={language === 'ar' ? 'إغلاق' : 'Schließen'}
              className="inline-flex items-center justify-center min-w-11 min-h-11 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-800 cursor-pointer">
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <footer className="px-4 sm:px-6 py-3 bg-white dark:bg-gray-900 border-t border-slate-200 dark:border-gray-800">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
};
