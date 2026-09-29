// Standard empty state: icon + message + optional action.
export const EmptyState = ({ icon: Icon, title, description, action, className = '' }) => (
  <div className={`flex flex-col items-center justify-center text-center gap-3 py-12 px-6 rounded-2xl border border-dashed border-slate-300 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 ${className}`}>
    {Icon && (
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>
    )}
    <div className="space-y-1 max-w-sm">
      <h3 className="text-heading-md">{title}</h3>
      {description && <p className="text-body-muted">{description}</p>}
    </div>
    {action}
  </div>
);
