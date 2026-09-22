import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { LanguageSelector } from '../components/LanguageSelector';
import { ThemeToggle } from '../components/ThemeToggle';
import { 
  LogIn, 
  Phone, 
  Mail, 
  Lock, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  Truck,
  UserPlus
} from 'lucide-react';

export const CustomerLogin = () => {
  const { login } = useCustomerAuth();
  const { t, direction, language } = useLanguage();
  const { getStoreName } = useStoreSettings();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAr = language === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError(isAr ? 'يرجى إدخال البريد الإلكتروني أو رقم الهاتف وكلمة المرور' : 'Bitte E-Mail / Telefon und Passwort eingeben');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login(identifier.trim(), password);
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err.response?.data?.error || 
        (isAr ? 'فشل تسجيل الدخول. يرجى التحقق من البيانات' : 'Anmeldung fehlgeschlagen. Bitte Daten prüfen.')
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
              {isAr ? 'خدمة التوصيل للمنازل' : 'Home Delivery Service'}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center px-3 xs:px-4 py-6 sm:py-12">
        <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-5 sm:p-8">
          
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 mb-3 sm:mb-4 shadow-sm">
              <LogIn className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {isAr ? 'تسجيل دخول العملاء' : 'Kunden-Anmeldung'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1.5 leading-relaxed break-words">
              {isAr 
                ? 'سجل دخولك لطلب منتجاتك المفضلة مباشرة إلى باب منزلك مع الدفع عند الاستلام' 
                : 'Melden Sie sich an, um Lebensmittel bequem nach Hause liefern zu lassen mit Barzahlung an der Tür.'}
            </p>
          </div>

          {error && (
            <div className="mb-5 sm:mb-6 p-3.5 sm:p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5" />
              <span className="break-words">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 sm:mb-2">
                {isAr ? 'البريد الإلكتروني أو رقم الهاتف' : 'E-Mail oder Telefonnummer'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={isAr ? 'مثال: name@gmail.com أو 01511234567' : 'z.B. max@muster.de oder 01511234567'}
                  required
                  className="w-full px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">
                  {isAr ? 'كلمة المرور' : 'Passwort'}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  {isAr ? 'نسيت كلمة المرور؟' : 'Passwort vergessen?'}
                </Link>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 sm:py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2 touch-manipulation"
            >
              {loading ? (
                <span>{isAr ? 'جارٍ تسجيل الدخول...' : 'Wird angemeldet...'}</span>
              ) : (
                <>
                  <span>{isAr ? 'تسجيل الدخول' : 'Anmelden'}</span>
                  <ArrowIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Registration Prompt */}
          <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-slate-100 dark:border-gray-800 text-center">
            <p className="text-xs text-slate-500 dark:text-gray-400 mb-2.5 sm:mb-3">
              {isAr ? 'ليس لديك حساب توصيل منزلي حتى الآن؟' : 'Noch kein Kundenkonto für Lieferungen?'}
            </p>
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-slate-800 dark:text-gray-200 font-bold text-xs transition w-full touch-manipulation"
            >
              <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{isAr ? 'إنشاء حساب عميل جديد مجاناً' : 'Kostenloses Kundenkonto erstellen'}</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 dark:text-gray-600 border-t border-slate-200/50 dark:border-gray-900">
        &copy; {new Date().getFullYear()} {getStoreName()} &bull; {isAr ? 'خدمة التوصيل المباشر إلى المنزل' : 'Direkter Lieferservice nach Hause'}
      </footer>
    </div>
  );
};
