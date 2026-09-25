import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Building2, Store, ShieldCheck } from 'lucide-react';
import { LanguageSelector } from '../components/LanguageSelector';
import { ThemeToggle } from '../components/ThemeToggle';
import { ADMIN_BASE } from '../config/adminPath';

export const Login = () => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const { settings, getStoreName } = useStoreSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { requestLogin, verifyLoginCode, resendLoginCode } = useAuth();
  const navigate = useNavigate();

  // Step 1 (password) vs step 2 (emailed 2FA code)
  const [pendingToken, setPendingToken] = useState(null);
  const [code, setCode] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await requestLogin(email, password);

    if (result.success) {
      setPendingToken(result.pendingToken);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await verifyLoginCode(pendingToken, code);

    if (result.success) {
      navigate(`${ADMIN_BASE}/dashboard`);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const handleResend = async () => {
    setError('');
    setResendMessage('');
    setResending(true);
    const result = await resendLoginCode(pendingToken);
    if (result.success) {
      setPendingToken(result.pendingToken);
      setCode('');
      setResendMessage(isAr ? 'تم إرسال رمز جديد' : 'Neuer Code wurde gesendet');
    } else {
      setError(result.error);
    }
    setResending(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-white dark:from-gray-950 dark:via-gray-950 dark:to-gray-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-3 xs:p-4 sm:p-6 transition-colors duration-200">
      {/* Top Header bar with Language and Theme switches */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between py-2 gap-2">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {settings?.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={getStoreName(language)}
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-xl bg-white p-1 border border-slate-200/60 dark:border-gray-800 shadow-sm shrink-0"
            />
          ) : (
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          )}
          <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white truncate max-w-[150px] xs:max-w-[220px] sm:max-w-none">
            {getStoreName(language) || t('appName')}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-6 sm:my-8 px-1">
        <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl shadow-xl shadow-blue-500/5 dark:shadow-none border border-slate-200/80 dark:border-gray-850 p-5 sm:p-8 md:p-10 transition-colors duration-200">
          <div className="text-center mb-6 sm:mb-8">
            {settings?.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={getStoreName(language)}
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-2xl mx-auto mb-3 sm:mb-4 bg-white p-2 border border-slate-100 dark:border-gray-800 shadow-md"
              />
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-50 dark:bg-blue-950/70 border border-blue-100 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Building2 className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
            )}
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {pendingToken ? (isAr ? 'التحقق بخطوتين' : 'Zwei-Faktor-Anmeldung') : t('signIn')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1.5 break-words">
              {pendingToken
                ? (isAr ? `تم إرسال رمز إلى ${email}` : `Ein Code wurde an ${email} gesendet`)
                : t('signInToManage')}
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs sm:text-sm px-3.5 sm:px-4 py-3 rounded-xl mb-5 sm:mb-6 break-words">
              {error}
            </div>
          )}
          {resendMessage && (
            <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm px-3.5 sm:px-4 py-3 rounded-xl mb-5 sm:mb-6 break-words">
              {resendMessage}
            </div>
          )}

          {!pendingToken ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 sm:mb-2">
                  {t('emailAddress')}
                </label>
                <div className="relative">
                  <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 w-4 h-4 sm:w-5 sm:h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full ps-10 sm:ps-11 pe-4 py-2.5 sm:py-3 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition text-sm"
                    placeholder="admin@supermarket.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 sm:mb-2">
                  {t('password')}
                </label>
                <div className="relative">
                  <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 w-4 h-4 sm:w-5 sm:h-5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full ps-10 sm:ps-11 pe-4 py-2.5 sm:py-3 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition text-sm"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-3 sm:py-3.5 rounded-xl font-bold text-sm shadow-md shadow-blue-500/20 transition disabled:opacity-50 cursor-pointer touch-manipulation"
              >
                {loading ? t('loading') : t('signIn')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCodeSubmit} className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 sm:mb-2">
                  {isAr ? 'رمز التحقق' : 'Anmeldecode'}
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 w-4 h-4 sm:w-5 sm:h-5" />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoFocus
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full ps-10 sm:ps-11 pe-4 py-2.5 sm:py-3 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition text-sm text-center tracking-[0.4em] font-mono"
                    placeholder="••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || code.length < 6}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-3 sm:py-3.5 rounded-xl font-bold text-sm shadow-md shadow-blue-500/20 transition disabled:opacity-50 cursor-pointer touch-manipulation"
              >
                {loading ? t('loading') : (isAr ? 'تأكيد' : 'Bestätigen')}
              </button>

              <div className="flex items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => { setPendingToken(null); setCode(''); setError(''); setResendMessage(''); }}
                  className="text-slate-500 dark:text-gray-400 hover:underline cursor-pointer"
                >
                  {isAr ? 'رجوع' : 'Zurück'}
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer disabled:opacity-50"
                >
                  {resending ? '...' : (isAr ? 'إعادة إرسال الرمز' : 'Code erneut senden')}
                </button>
              </div>
            </form>
          )}

          {/* Link to Public Storefront */}
          <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-slate-100 dark:border-gray-800 text-center">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer touch-manipulation"
            >
              <Store className="w-4 h-4 shrink-0" />
              <span>{language === 'ar' ? 'الذهاب إلى المتجر الرئيسي' : 'Zum Online-Shop'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 dark:text-gray-500 py-2">
        © {new Date().getFullYear()} {getStoreName(language)} &bull; Admin Portal
      </footer>
    </div>
  );
};