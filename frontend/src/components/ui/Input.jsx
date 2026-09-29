import { useId } from 'react';

export const FIELD_CLASSES = 'w-full min-h-11 px-3.5 rounded-xl border bg-white dark:bg-gray-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border-slate-200 dark:border-gray-700 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 disabled:opacity-60';

// Labelled field wrapper with hint/error text wired to aria-describedby.
export const Field = ({ label, hint, error, id, children }) => {
  const autoId = useId();
  const fieldId = id || autoId;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={fieldId} className="block text-xs font-bold text-slate-600 dark:text-slate-300">{label}</label>}
      {children({ id: fieldId, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error ? (
        <p id={`${fieldId}-error`} className="text-xs text-danger-600 dark:text-danger-400">{error}</p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="text-caption">{hint}</p>
      ) : null}
    </div>
  );
};

export const Input = ({ label, hint, error, id, icon: Icon, className = '', ...props }) => (
  <Field label={label} hint={hint} error={error} id={id}>
    {(a11y) => (
      <div className="relative">
        {Icon && <Icon className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3.5 text-slate-400 pointer-events-none" aria-hidden="true" />}
        <input {...a11y} {...props} className={`${FIELD_CLASSES} ${Icon ? 'ps-10' : ''} ${error ? 'border-danger-400 dark:border-danger-700' : ''} ${className}`} />
      </div>
    )}
  </Field>
);

export const Textarea = ({ label, hint, error, id, className = '', ...props }) => (
  <Field label={label} hint={hint} error={error} id={id}>
    {(a11y) => <textarea {...a11y} {...props} className={`${FIELD_CLASSES} py-2.5 ${className}`} />}
  </Field>
);
