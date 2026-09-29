import { Loader2 } from 'lucide-react';

// Shared button. `tone` picks the surface primary: 'primary' (admin, blue) or
// 'brand' (storefront, emerald) — see README "Design system".
const VARIANTS = {
  primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm',
  brand: 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm',
  secondary: 'bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-gray-800',
  danger: 'bg-danger-600 hover:bg-danger-700 text-white shadow-sm',
  // For actions with a side effect worth pausing on (e.g. emailing the customer).
  warning: 'bg-warning-600 hover:bg-warning-700 text-white shadow-sm',
  ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800'
};

const SIZES = {
  sm: 'min-h-9 coarse:min-h-11 px-3 text-xs gap-1.5',
  md: 'min-h-11 px-4 text-sm gap-2',
  lg: 'min-h-12 px-5 text-base gap-2'
};

export const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  type = 'button',
  className = '',
  children,
  ...props
}) => (
  <button
    type={type}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={`inline-flex items-center justify-center rounded-xl font-bold transition cursor-pointer touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.md} ${className}`}
    {...props}
  >
    {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : Icon && <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />}
    {children}
  </button>
);

// Square icon-only button; `label` is required (it becomes aria-label + title).
export const IconButton = ({ icon: Icon, label, className = '', type = 'button', ...props }) => (
  <button
    type={type}
    aria-label={label}
    title={label}
    className={`inline-flex items-center justify-center min-w-11 min-h-11 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-gray-800 transition cursor-pointer touch-manipulation disabled:opacity-50 ${className}`}
    {...props}
  >
    <Icon className="w-5 h-5" aria-hidden="true" />
  </button>
);
