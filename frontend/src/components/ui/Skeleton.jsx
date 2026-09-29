import { useLanguage } from '../../context/LanguageContext';

// Loading placeholders. aria-hidden: screen readers get the surrounding
// role="status" text from <SkeletonList> instead of empty boxes.
export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded-xl bg-slate-200/80 dark:bg-gray-800 ${className}`} aria-hidden="true" />
);

export const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-800 p-4 sm:p-5 space-y-3" aria-hidden="true">
    <div className="flex items-center justify-between gap-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
    <Skeleton className="h-3 w-2/3" />
    <Skeleton className="h-3 w-1/2" />
  </div>
);

export const SkeletonTable = ({ rows = 6, columns = 5 }) => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-800 overflow-hidden" aria-hidden="true">
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex gap-4 px-4 py-3 border-b last:border-b-0 border-slate-100 dark:border-gray-800">
        {Array.from({ length: columns }).map((__, c) => <Skeleton key={c} className="h-4 flex-1" />)}
      </div>
    ))}
  </div>
);

// Page-level loading state: `variant` 'cards' | 'table'.
export const SkeletonList = ({ variant = 'cards', count = 6, columns = 5 }) => {
  const { language } = useLanguage();
  return (
  <div role="status" aria-live="polite" className="space-y-3">
    <span className="sr-only">{language === 'ar' ? 'جارٍ التحميل…' : 'Wird geladen…'}</span>
    {variant === 'table'
      ? <SkeletonTable rows={count} columns={columns} />
      : Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
  </div>
  );
};
