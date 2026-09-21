import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Building2, Store } from 'lucide-react';
import { LanguageSelector } from '../components/LanguageSelector';
import { ThemeToggle } from '../components/ThemeToggle';

export const Login = () => {
  const { t, language } = useLanguage();
  const { settings, getStoreName } = useStoreSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      navigate('/secret/admin/dashboard');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-white dark:from-gray-950 dark:via-gray-950 dark:to-gray-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6 transition-colors duration-200">
      {/* Top Header bar with Language and Theme switches */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          {settings?.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={getStoreName(language)}
              className="w-9 h-9 object-contain rounded-xl bg-white p-1 border border-slate-200/60 dark:border-gray-800 shadow-sm"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
          )}
          <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
            {getStoreName(language) || t('appName')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-8">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl shadow-blue-500/5 dark:shadow-none border border-slate-200/80 dark:border-gray-850 p-8 sm:p-10 transition-colors duration-200">
          <div className="text-center mb-8">
            {settings?.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={getStoreName(language)}
                className="w-16 h-16 object-contain rounded-2xl mx-auto mb-4 bg-white p-2 border border-slate-100 dark:border-gray-800 shadow-md"
              />
            ) : (
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/70 border border-blue-100 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-7 h-7" />
              </div>
            )}
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {t('signIn')}
            </h1>
            <p className="text-sm text-slate-500 dark:text-gray-400 mt-1.5">
              {t('signInToManage')}
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-sm px-4 py-3 rounded-xl mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                {t('emailAddress')}
              </label>
              <div className="relative">
                <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full ps-11 pe-4 py-3 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition"
                  placeholder="admin@supermarket.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                {t('password')}
              </label>
              <div className="relative">
                <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 w-5 h-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full ps-11 pe-4 py-3 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-3.5 rounded-xl font-bold text-sm shadow-md shadow-blue-500/20 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? t('loading') : t('signIn')}
            </button>
          </form>

          {/* Link to Public Storefront */}
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-gray-800 text-center">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              <Store className="w-4 h-4" />
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