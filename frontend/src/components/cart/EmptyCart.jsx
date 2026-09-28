import { ShoppingCart } from 'lucide-react';

export const EmptyCart = ({
  isAr
}) => (
    <div className="py-16 text-center space-y-4">
      <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-50 dark:bg-gray-950 text-slate-300 dark:text-gray-600 flex items-center justify-center border border-slate-200 dark:border-gray-800">
        <ShoppingCart className="w-8 h-8 opacity-60" />
      </div>
      <div>
        <p className="font-extrabold text-slate-800 dark:text-gray-200 text-sm">
          {isAr ? 'سلة التسوق فارغة حالياً' : 'Ihr Warenkorb ist noch leer'}
        </p>
        <p className="text-xs text-slate-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">
          {isAr 
            ? 'اختر المنتجات الغذائية والمستلزمات المفضلة لديك وأضفها إلى السلة للتوصيل إلى منزلك.' 
            : 'Fügen Sie gewünschte Produkte aus unserem Sortiment hinzu, um die Lieferung zu starten.'}
        </p>
      </div>
    </div>
);
