import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Button } from './ui/Button';
import { ADMIN_BASE } from '../config/adminPath';

// Bumped if the AGB/Datenschutz change materially, to re-prompt returning visitors.
const STORAGE_KEY = 'hajar.legalConsent.v1';

const hasAccepted = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false; // private mode / storage blocked — show the gate
  }
};

// First-visit gate: the storefront asks the visitor to accept the AGB and the
// Datenschutzerklärung once per browser. Not shown on the admin console or the
// driver portal (staff tools, not consumer surfaces), nor on the legal pages
// themselves — the links open those in a new tab so a visitor can read before
// accepting without the overlay covering the text.
export const LegalConsentModal = () => {
  const { t, direction } = useLanguage();
  const { pathname } = useLocation();
  const [accepted, setAccepted] = useState(hasAccepted);

  const isStaffArea = pathname.startsWith(ADMIN_BASE) || pathname === '/driver' || pathname === '/delivery';
  const isLegalPage = ['/agb', '/terms', '/datenschutz', '/privacy', '/impressum', '/copyright'].includes(pathname);

  if (accepted || isStaffArea || isLegalPage) return null;

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Private mode: can't persist, but still dismiss for this session.
    }
    setAccepted(true);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        dir={direction}
        className="w-full sm:max-w-lg max-h-[100dvh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-gray-800 shadow-2xl"
      >
        <div className="px-5 sm:px-6 pt-6 pb-2 flex items-center gap-3">
          <span className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
            <ShieldCheck className="w-6 h-6" aria-hidden="true" />
          </span>
          <h2 className="text-heading-lg">{t('legalConsentTitle')}</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 pb-4 space-y-3 text-body-muted">
          <p>{t('legalConsentBody')}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
            <a href="/agb" target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 underline underline-offset-2">
              {t('legalConsentReadAgb')}
            </a>
            <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 underline underline-offset-2">
              {t('legalConsentReadDatenschutz')}
            </a>
          </div>
        </div>
        <div className="px-5 sm:px-6 py-4 border-t border-slate-100 dark:border-gray-800">
          <Button variant="brand" size="lg" onClick={accept} className="w-full">
            {t('legalConsentAccept')}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LegalConsentModal;
