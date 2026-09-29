// Standard surface: rounded-2xl card (controls use rounded-xl) with one shadow step.
export const Card = ({ as: Tag = 'div', padding = 'p-4 sm:p-6', className = '', children, ...props }) => (
  <Tag
    className={`bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-sm ${padding} ${className}`}
    {...props}
  >
    {children}
  </Tag>
);

export const CardHeader = ({ title, description, action, icon: Icon }) => (
  <div className="flex items-start justify-between gap-3 mb-4">
    <div className="flex items-start gap-3 min-w-0">
      {Icon && <Icon className="w-5 h-5 mt-0.5 text-slate-500 shrink-0" aria-hidden="true" />}
      <div className="min-w-0">
        <h2 className="text-heading-md">{title}</h2>
        {description && <p className="text-body-muted mt-0.5">{description}</p>}
      </div>
    </div>
    {action}
  </div>
);
