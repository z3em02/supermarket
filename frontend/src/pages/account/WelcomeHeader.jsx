import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { Mail, CheckCircle2, Phone, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';

export const WelcomeHeader = ({
  handleStartVerify,
  isAr
}) => {
  const { customer } = useCustomerAuth();

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-800 p-4 sm:p-6 md:p-8 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <div className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl sm:text-2xl shadow-lg shadow-emerald-600/20">
          {customer?.name?.charAt(0)?.toUpperCase() || 'C'}
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white truncate">
            {customer?.name || (isAr ? 'عزيزي العميل' : 'Kunde')}
          </h1>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
            {/* Email badge */}
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${customer?.emailVerified ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200'}`}>
              <Mail className="w-3.5 h-3.5" />
              <span>{customer?.email}</span>
              {customer?.emailVerified ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <button
                  onClick={() => handleStartVerify('email')}
                  className="underline font-bold text-amber-800 hover:text-amber-900 ms-1 cursor-pointer"
                >
                  {isAr ? 'تحقق الآن' : 'Bestätigen'}
                </button>
              )}
            </span>

            {/* Phone badge */}
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${customer?.phoneVerified ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200'}`}>
              <Phone className="w-3.5 h-3.5" />
              <span>{customer?.phone}</span>
              {customer?.phoneVerified ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <>
                  <button
                    onClick={() => handleStartVerify('phone')}
                    className="underline font-bold text-amber-800 hover:text-amber-900 ms-1 cursor-pointer"
                  >
                    {isAr ? 'تحقق الآن' : 'Bestätigen'}
                  </button>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center w-full md:w-auto">
        <Link
          to="/"
          className="w-full md:w-auto px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 touch-manipulation"
        >
          <ShoppingBag className="w-4 h-4 shrink-0" />
          <span>{isAr ? 'طلب جديد للتوصيل' : 'Neue Bestellung aufgeben'}</span>
        </Link>
      </div>
    </div>
  );
};
