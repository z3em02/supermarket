const TONES = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-gray-800 dark:text-slate-300 dark:border-gray-700',
  primary: 'bg-primary-50 text-primary-800 border-primary-200 dark:bg-primary-950/70 dark:text-primary-300 dark:border-primary-900/60',
  brand: 'bg-brand-50 text-brand-800 border-brand-200 dark:bg-brand-950/70 dark:text-brand-300 dark:border-brand-900/60',
  success: 'bg-success-50 text-success-800 border-success-200 dark:bg-success-950/70 dark:text-success-300 dark:border-success-900/60',
  warning: 'bg-warning-50 text-warning-800 border-warning-200 dark:bg-warning-950/70 dark:text-warning-300 dark:border-warning-900/60',
  danger: 'bg-danger-50 text-danger-800 border-danger-200 dark:bg-danger-950/70 dark:text-danger-300 dark:border-danger-900/60',
  info: 'bg-info-50 text-info-800 border-info-200 dark:bg-info-950/70 dark:text-info-300 dark:border-info-900/60',
  promo: 'bg-promo-50 text-promo-800 border-promo-200 dark:bg-promo-950/70 dark:text-promo-300 dark:border-promo-900/60'
};

// Small pill. For order statuses use <OrderStatusBadge> instead.
export const Badge = ({ tone = 'neutral', icon: Icon, className = '', children }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${TONES[tone] || TONES.neutral} ${className}`}>
    {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
    {children}
  </span>
);
