import { ChevronDown } from 'lucide-react';
import { Field, FIELD_CLASSES } from './Input';

// Native <select> (keeps mobile pickers + keyboard behaviour) styled like Input.
// `options`: [{ value, label, disabled? }] — or pass <option> children.
export const Select = ({ label, hint, error, id, options, className = '', children, ...props }) => (
  <Field label={label} hint={hint} error={error} id={id}>
    {(a11y) => (
      <div className="relative">
        <select {...a11y} {...props} className={`${FIELD_CLASSES} appearance-none pe-10 cursor-pointer ${className}`}>
          {options ? options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>) : children}
        </select>
        <ChevronDown className="w-4 h-4 absolute top-1/2 -translate-y-1/2 end-3.5 text-slate-500 pointer-events-none" aria-hidden="true" />
      </div>
    )}
  </Field>
);
