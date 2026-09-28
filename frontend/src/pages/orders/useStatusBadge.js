import { AlertTriangle, CheckCircle2, Clock, Layers, Truck, XCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

// Icon, label and colour classes for an order status, in the current language.
export const useStatusBadge = () => {
  const { t, language } = useLanguage();
  return (status) => {
    const s = status?.toLowerCase();
    switch (s) {
      case 'pending':
        return {
          icon: Clock,
          label: t('pending'),
          classes: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-900/60'
        };
      case 'pending_customer_approval':
        return {
          icon: AlertTriangle,
          label: language === 'ar' ? 'بانتظار موافقة العميل' : 'Wartet auf Kundenbestätigung',
          classes: 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800'
        };
      case 'accepted':
        return {
          icon: CheckCircle2,
          label: t('accepted'),
          classes: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-900/60'
        };
      case 'preparing':
        return {
          icon: Layers,
          label: t('preparing'),
          classes: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-900/60'
        };
      case 'shipped':
        return {
          icon: Truck,
          label: t('shipped'),
          classes: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-900/60'
        };
      case 'out_for_delivery':
        return {
          icon: Truck,
          label: language === 'ar' ? 'جاري التوصيل للمنزل' : 'In Zustellung',
          classes: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-900/60'
        };
      case 'confirmed':
        return {
          icon: CheckCircle2,
          label: t('accepted'),
          classes: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-900/60'
        };
      case 'delivered':
        return {
          icon: CheckCircle2,
          label: t('delivered'),
          classes: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-900/60'
        };
      case 'declined':
      case 'rejected':
      case 'decline':
      case 'canceled':
      case 'cancelled':
        return {
          icon: XCircle,
          label: t('declined'),
          classes: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-900/60'
        };
      default:
        return {
          icon: Clock,
          label: status,
          classes: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-gray-800 dark:text-slate-300 dark:border-gray-700'
        };
    }
  };
};
