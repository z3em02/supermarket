import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

// Prev/next pager with "Seite X von Y · N". Arrows flip in RTL.
export const Pagination = ({ page, totalPages, total, itemLabel, onPageChange, className = '' }) => {
  const { language, direction } = useLanguage();
  const isAr = language === 'ar';
  if (!totalPages || totalPages <= 1) return null;
  const Prev = direction === 'rtl' ? ChevronRight : ChevronLeft;
  const Next = direction === 'rtl' ? ChevronLeft : ChevronRight;
  const btn = 'inline-flex items-center gap-1 min-h-11 px-3 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer touch-manipulation';
  return (
    <nav className={`flex items-center justify-between gap-3 ${className}`} aria-label={isAr ? 'التنقل بين الصفحات' : 'Seitennavigation'}>
      <p className="text-body-muted tabular-nums" aria-live="polite">
        {isAr ? `صفحة ${page} من ${totalPages}` : `Seite ${page} von ${totalPages}`}
        {total !== undefined && ` · ${total}${itemLabel ? ` ${itemLabel}` : ''}`}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <Prev className="w-4 h-4" aria-hidden="true" />
          <span>{isAr ? 'السابق' : 'Zurück'}</span>
        </button>
        <button type="button" className={btn} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <span>{isAr ? 'التالي' : 'Weiter'}</span>
          <Next className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
};
