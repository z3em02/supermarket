import { useLanguage } from '../../context/LanguageContext';
import { Truck, Hourglass, AlertCircle } from 'lucide-react';
import { useStoreSettings } from '../../context/StoreSettingsContext';

export const DriverLoginScreen = ({
  handleDriverLogin,
  inputDriverName,
  inputPasscode,
  isAr,
  loggingIn,
  loginError,
  pendingPollToken,
  setInputDriverName,
  setInputPasscode,
  setLoginError,
  setPendingPollToken
}) => {
  const { direction, language } = useLanguage();
  const { getStoreName } = useStoreSettings();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-gray-950 px-4" dir={direction}>
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 shadow-xl p-6 sm:p-8 space-y-5">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-600 flex items-center justify-center text-white shadow-md">
            <Truck className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white">
            {isAr ? 'دخول السائق' : 'Fahrer-Login'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            {getStoreName(language) || 'Supermarkt'}
          </p>
        </div>

        {pendingPollToken ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center animate-pulse">
              <Hourglass className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">
                {isAr ? 'بانتظار موافقة المشرف...' : 'Warte auf Freigabe durch den Administrator...'}
              </p>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                {isAr ? 'سيظهر طلبك في لوحة التحكم الخاصة بالمشرف' : 'Deine Anfrage erscheint im Admin-Dashboard'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setPendingPollToken(null); setLoginError(''); }}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200 underline cursor-pointer"
            >
              {isAr ? 'إلغاء' : 'Abbrechen'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleDriverLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                {isAr ? 'اسم السائق' : 'Fahrername'}
              </label>
              <input
                type="text"
                required
                value={inputDriverName}
                onChange={(e) => setInputDriverName(e.target.value)}
                placeholder={isAr ? 'مثال: أحمد' : 'z.B. Ahmed'}
                className="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                {isAr ? 'رمزك الشخصي (PIN)' : 'Dein persönlicher PIN'}
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={inputPasscode}
                onChange={(e) => setInputPasscode(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition font-mono tracking-widest"
              />
            </div>
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {loggingIn ? (isAr ? 'جارٍ الإرسال...' : 'Wird gesendet...') : (isAr ? 'طلب تسجيل الدخول' : 'Login anfragen')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
