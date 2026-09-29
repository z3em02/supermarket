import { ShieldCheck } from 'lucide-react';

export const LoginToCheckoutPrompt = ({
  isAr,
  navigate,
  onClose
}) => (
    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-center space-y-3">
      <div className="w-10 h-10 mx-auto rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 flex items-center justify-center">
        <ShieldCheck className="w-5 h-5" />
      </div>
      <div>
        <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
          {isAr ? 'تسجيل الدخول مطلوب لإتمام التوصيل' : 'Kunden-Login für Hauszustellung erforderlich'}
        </h4>
        <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-1">
          {isAr 
            ? 'يرجى تسجيل الدخول أو إنشاء حساب جديد لتأكيد عنوانك ورقم هاتفك.' 
            : 'Bitte anmelden oder registrieren, um Adresse und Telefonnummer zu hinterlegen.'}
        </p>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => { onClose(); navigate('/customer/login'); }}
          className="flex-1 py-2.5 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
        >
          {isAr ? 'تسجيل الدخول' : 'Anmelden'}
        </button>
        <button
          type="button"
          onClick={() => { onClose(); navigate('/customer/register'); }}
          className="flex-1 py-2.5 px-3 rounded-xl bg-slate-200 dark:bg-gray-800 hover:bg-slate-300 text-slate-800 dark:text-gray-200 font-bold text-xs transition cursor-pointer"
        >
          {isAr ? 'حساب جديد' : 'Registrieren'}
        </button>
      </div>
    </div>
);
