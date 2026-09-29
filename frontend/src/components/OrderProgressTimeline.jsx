import { Check, Package, ChefHat, Truck, Home, XCircle } from 'lucide-react';
import { ORDER_PROGRESS_STEPS, getOrderProgressIndex, isOrderStopped } from '../utils/orderStatus';

const STEP_META = {
  accepted: { icon: Package, de: 'Angenommen', ar: 'مقبول' },
  preparing: { icon: ChefHat, de: 'Wird vorbereitet', ar: 'جارٍ التجهيز' },
  out_for_delivery: { icon: Truck, de: 'Unterwegs', ar: 'في الطريق' },
  delivered: { icon: Home, de: 'Geliefert', ar: 'تم التوصيل' }
};

// Live progress timeline for a customer's order (Angenommen -> Wird
// vorbereitet -> Unterwegs -> Geliefert). Declined/cancelled orders show a
// stopped state instead of a partial timeline, since progress no longer applies.
export const OrderProgressTimeline = ({ status, language }) => {
  const isAr = language === 'ar';

  if (isOrderStopped(status)) {
    return (
      <div className="flex items-center gap-2 text-danger-600 dark:text-danger-400 text-xs font-bold py-2">
        <XCircle className="w-4 h-4 shrink-0" />
        <span>{isAr ? 'تم إلغاء هذا الطلب' : 'Diese Bestellung wurde storniert'}</span>
      </div>
    );
  }

  const currentIndex = getOrderProgressIndex(status);

  return (
    <div className="flex items-center py-2">
      {ORDER_PROGRESS_STEPS.map((step, i) => {
        const meta = STEP_META[step];
        const Icon = meta.icon;
        const done = i <= currentIndex;
        const isLast = i === ORDER_PROGRESS_STEPS.length - 1;
        return (
          <div key={step} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                  done
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'bg-slate-50 dark:bg-gray-950 border-slate-200 dark:border-gray-800 text-slate-300 dark:text-slate-400'
                }`}
              >
                {done && i < currentIndex ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-[10px] font-semibold text-center leading-tight max-w-[60px] ${done ? 'text-brand-700 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {isAr ? meta.ar : meta.de}
              </span>
            </div>
            {!isLast && (
              <div className={`flex-1 h-0.5 mx-1 -mt-4 transition-colors ${i < currentIndex ? 'bg-brand-600' : 'bg-slate-200 dark:bg-gray-800'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};
