// On/off toggle (role="switch"). The visible track is 44×24px; the button
// around it keeps a 44px tap target. The thumb moves with margin-inline-start,
// so it mirrors in RTL without a direction check. `label` is required when
// there is no visible text next to it (it becomes aria-label + title).
const TONES = {
  success: 'bg-success-500',
  primary: 'bg-primary-600',
  brand: 'bg-brand-600',
  danger: 'bg-danger-600',
  warning: 'bg-warning-500'
};

export const Switch = ({ checked, onChange, label, tone = 'success', disabled = false, className = '', ...props }) => (
  <button
    type="button"
    role="switch"
    aria-checked={!!checked}
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={() => onChange?.(!checked)}
    className={`group inline-flex items-center justify-center min-w-11 min-h-11 shrink-0 cursor-pointer touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    {...props}
  >
    <span className={`flex items-center h-6 w-11 rounded-full p-0.5 transition-colors ${checked ? (TONES[tone] || TONES.success) : 'bg-slate-300 dark:bg-gray-700'}`}>
      <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition-all ${checked ? 'ms-5' : 'ms-0'}`} />
    </span>
  </button>
);
