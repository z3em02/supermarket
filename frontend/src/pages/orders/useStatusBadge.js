import { AlertTriangle, CheckCircle2, Clock, Layers, Truck, XCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { getOrderStatusMeta } from '../../utils/orderStatusBadge';

const ICONS = { Clock, AlertTriangle, CheckCircle2, Layers, Truck, XCircle };

// Icon, label and colour classes for an order status, in the current language.
// The mapping itself lives in utils/orderStatusBadge.js (the single source of
// truth); `audience` picks the wording: 'admin' (default), 'customer', 'driver'.
export const useStatusBadge = (audience = 'admin') => {
  const { t, language } = useLanguage();
  return (status) => {
    const meta = getOrderStatusMeta(status, { language, audience, t });
    return { ...meta, icon: ICONS[meta.iconName] || Clock };
  };
};
