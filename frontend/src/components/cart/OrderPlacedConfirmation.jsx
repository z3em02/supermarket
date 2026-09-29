import { CheckCircle2, ShoppingBag } from 'lucide-react';
import { formatDeliverySlot } from '../../utils/deliverySlot';

export const OrderPlacedConfirmation = ({
  isAr,
  navigate,
  onClose,
  placedOrder,
  setPlacedOrder
}) => (
    <div className="py-8 text-center space-y-5">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-100 dark:bg-brand-950/80 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-300 dark:border-brand-800 shadow-md">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white">
          {isAr ? 'تم استلام طلبك بنجاح' : 'Bestellung erfolgreich eingegangen!'}
        </h3>
        <p className="text-body-muted mt-1 max-w-sm mx-auto leading-relaxed">
          {isAr 
            ? `رقم طلبك #${placedOrder.id.slice(0, 8).toUpperCase()}. جارٍ تجهيز طلبك وسيتم تسليمه إلى باب منزلك مع الدفع نقداً أو بالبطاقة عند الاستلام.` 
            : `Bestellnummer #${placedOrder.id.slice(0, 8).toUpperCase()}. Ihre Bestellung wird vorbereitet und bequem zu Ihnen nach Hause geliefert.`}
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-brand-50/60 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900/60 text-start text-xs space-y-2">
        <div>
          <span className="text-slate-500 block">{isAr ? 'عنوان التوصيل:' : 'Lieferadresse:'}</span>
          <span className="font-bold text-slate-800 dark:text-gray-200">{placedOrder.deliveryAddress}</span>
        </div>
        {placedOrder.deliverySlot && formatDeliverySlot(placedOrder.deliverySlot, isAr) && (
          <div>
            <span className="text-slate-500 block">{isAr ? 'موعد التوصيل:' : 'Lieferzeitfenster:'}</span>
            <span className="font-bold text-slate-800 dark:text-gray-200">{formatDeliverySlot(placedOrder.deliverySlot, isAr)}</span>
          </div>
        )}
        <div className="flex justify-between pt-2 border-t border-brand-200/50 dark:border-brand-900/60">
          <span className="text-slate-500">{isAr ? 'المطلوب سداده عند الاستلام:' : 'Betrag bei Lieferung:'}</span>
          <span className="font-extrabold text-brand-600 dark:text-brand-400 font-mono text-sm">
            €{Number(placedOrder.totalAmount).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate('/account');
          }}
          className="w-full py-3.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>{isAr ? 'متابعة الطلب في حسابي' : 'Bestellung im Kundenkonto ansehen'}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setPlacedOrder(null);
            onClose();
          }}
          className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-slate-700 dark:text-gray-300 font-bold text-xs transition cursor-pointer"
        >
          {isAr ? 'متابعة التسوق' : 'Weiter einkaufen'}
        </button>
      </div>
    </div>
);
