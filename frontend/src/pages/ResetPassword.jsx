import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { LanguageSelector } from '../components/LanguageSelector';
import { ThemeToggle } from '../components/ThemeToggle';
import { isStrongPassword, strongPasswordHint } from '../utils/validation';
import {
  KeyRound,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Truck,
  LogIn
} from 'lucide-react';

export const ResetPassword = () => {
  const { resetPassword } = useCustomerAuth();
  const { language } = useLanguage();
  const { getStoreName } = useStoreSettings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const isAr = language === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      setError(isAr ? 'رابط إعادة التعيين غير صالح.' : 'Der Reset-Link ist ungültig.');
      return;
    }
    if (!isStrongPassword(password)) {
      setError(strongPasswordHint(isAr));
      return;
    }
    if (password !== confirmPassword) {
      setError(isAr ? 'كلمتا المرور غير متطابقتين' : 'Die Passwörter stimmen nicht überein');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/customer/login'), 3000);
    } catch (err) {
      console.error('Reset password error:', err);
      setError(
        err.response?.data?.error ||
        (isAr ? 'فشلت إعادة تعيين كلمة المرور. يرجى طلب رابط جديد' : 'Zurücksetzen des Passworts fehlgeschlagen. Bitte fordern Sie einen neuen Link an')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-gray-100 transition-colors">
      {/* Top Header */}
      <header className="px-3 xs:px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-slate-200/80 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-30">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-105 transition">
            <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <span className="font-extrabold text-sm sm:text-base md:text-lg text-slate-900 dark:text-white block leading-tight truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none">
              {getStoreName()}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 block truncate">
              {isAr ? 'تعيين كلمة مرور جديدة' : 'Neues Passwort festlegen'}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Card */}
      <main className="flex-1 flex items-center justify-center px-3 xs:px-4 py-6 sm:py-12">
        <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-5 sm:p-8">

          <div className="text-center mb-6 sm:mb-8">
            <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 mb-3 sm:mb-4 shadow-sm">
              <KeyRound className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {isAr ? 'تعيين كلمة مرور جديدة' : 'Neues Passwort festlegen'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1.5 leading-relaxed break-words">
              {isAr
                ? 'أدخل كلمة المرور الجديدة لحسابك أدناه.'
                : 'Geben Sie unten Ihr neues Passwort ein.'}
            </p>
          </div>

          {error && (
            <div className="mb-5 sm:mb-6 p-3.5 sm:p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5" />
              <span className="break-words">{error}</span>
            </div>
          )}

          {done ? (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5" />
                <span className="break-words">
                  {isAr
                    ? 'تم تغيير كلمة المرور بنجاح! سيتم تحويلك إلى صفحة تسجيل الدخول...'
                    : 'Ihr Passwort wurde erfolgreich geändert! Sie werden zur Anmeldung weitergeleitet ...'}
                </span>
              </div>
              <Link
                to="/customer/login"
                className="w-full flex items-center justify-center gap-2 py-3.5 sm:py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition touch-manipulation"
              >
                <LogIn className="w-4 h-4" />
                <span>{isAr ? 'تسجيل الدخول الآن' : 'Jetzt anmelden'}</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!token && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-850 text-amber-800 dark:text-amber-300 text-xs">
                  {isAr
                    ? 'رابط إعادة التعيين مفقود أو غير صالح. يرجى استخدام الرابط من رسالة البريد الإلكتروني.'
                    : 'Der Reset-Link fehlt oder ist ungültig. Bitte verwenden Sie den Link aus der E-Mail.'}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 sm:mb-2">
                  {isAr ? 'كلمة المرور الجديدة' : 'Neues Passwort'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition"
                />
                <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">
                  {strongPasswordHint(isAr)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 sm:mb-2">
                  {isAr ? 'تأكيد كلمة المرور' : 'Passwort bestätigen'}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full py-3.5 sm:py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2 touch-manipulation"
              >
                {loading ? (
                  <span>{isAr ? 'جارٍ الحفظ...' : 'Wird gespeichert...'}</span>
                ) : (
                  <>
                    <span>{isAr ? 'تعيين كلمة المرور' : 'Passwort festlegen'}</span>
                    <ArrowIcon className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 dark:text-gray-600 border-t border-slate-200/50 dark:border-gray-900">
        &copy; {new Date().getFullYear()} {getStoreName()} &bull; {isAr ? 'خدمة التوصيل المباشر إلى المنزل' : 'Direkter Lieferservice nach Hause'}
      </footer>
    </div>
  );
};
