import { useStatusBadge } from '../pages/orders/useStatusBadge';

const SIZES = {
  xs: { pill: 'px-2 py-0.5 text-[11px] gap-1', icon: 'w-3 h-3' },
  sm: { pill: 'px-2.5 py-1 text-xs gap-1.5', icon: 'w-3.5 h-3.5' },
  md: { pill: 'px-3 py-1.5 text-xs sm:text-sm gap-2', icon: 'w-4 h-4' }
};

// Order status pill used on every page — colours/labels come from
// utils/orderStatusBadge.js. `audience`: 'admin' | 'customer' | 'driver'.
export const OrderStatusBadge = ({ status, audience = 'admin', size = 'sm', showIcon = true, className = '' }) => {
  const badge = useStatusBadge(audience)(status);
  const Icon = badge.icon;
  const s = SIZES[size] || SIZES.sm;
  return (
    <span className={`inline-flex items-center rounded-full font-bold border ${badge.classes} ${s.pill} ${badge.pulse ? 'animate-pulse' : ''} ${className}`}>
      {showIcon && <Icon className={`${s.icon} shrink-0`} aria-hidden="true" />}
      <span>{badge.label}</span>
    </span>
  );
};
