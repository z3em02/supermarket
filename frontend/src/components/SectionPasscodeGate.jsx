import { useState, useEffect } from 'react';
import axios from '../utils/adminAxios';
import { getApiUrl } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { Lock, AlertCircle } from 'lucide-react';

const SESSION_KEY = 'admin_section_unlocked';

// Step-up PIN gate for the Settings/Accounting/Customers/Promotions admin
// pages. This is a shop-terminal deterrent (the dashboard being left open
// and someone without the admin password browsing into sensitive sections),
// not a separate privilege boundary — there is only one Admin account, and
// the real security boundary is the JWT auth already required to reach any
// admin page at all.
export const SectionPasscodeGate = ({ children }) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === 'true');
  const [status, setStatus] = useState('loading'); // 'loading' | 'setup' | 'enter'
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (unlocked) return;
    const checkStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = getApiUrl();
        const res = await axios.get(`${apiUrl}/api/settings/passcode-status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStatus(res.data.isSet ? 'enter' : 'setup');
      } catch (err) {
        console.error('Passcode status error:', err);
        // Fail closed: if we can't confirm whether a PIN is set, still
        // require one rather than risk skipping the gate entirely.
        setStatus('enter');
      }
    };
    checkStatus();
  }, [unlocked]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (status === 'setup') {
      if (!/^\d{4,8}$/.test(pin)) {
        setError(isAr ? 'يجب أن يتكون الرمز من 4 إلى 8 أرقام' : 'Der PIN muss 4–8 Ziffern haben');
        return;
      }
      if (pin !== confirmPin) {
        setError(isAr ? 'الرمزان غير متطابقين' : 'Die PINs stimmen nicht überein');
        return;
      }
      try {
        setSubmitting(true);
        const token = localStorage.getItem('token');
        const apiUrl = getApiUrl();
        await axios.put(`${apiUrl}/api/settings/passcode`, { passcode: pin }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        sessionStorage.setItem(SESSION_KEY, 'true');
        setUnlocked(true);
      } catch (err) {
        setError(err.response?.data?.error || (isAr ? 'حدث خطأ' : 'Ein Fehler ist aufgetreten'));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      const res = await axios.post(`${apiUrl}/api/settings/passcode/verify`, { passcode: pin }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.valid) {
        sessionStorage.setItem(SESSION_KEY, 'true');
        setUnlocked(true);
      } else {
        setError(isAr ? 'رمز غير صحيح' : 'Falscher PIN');
        setPin('');
      }
    } catch (err) {
      setError(err.response?.data?.error || (isAr ? 'حدث خطأ' : 'Ein Fehler ist aufgetreten'));
    } finally {
      setSubmitting(false);
    }
  };

  if (unlocked) return children;

  if (status === 'loading') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-xl p-6 space-y-5">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-900/40">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="font-black text-lg text-slate-900 dark:text-white">
            {status === 'setup'
              ? (isAr ? 'إعداد رمز الدخول' : 'Zugangs-PIN einrichten')
              : (isAr ? 'أدخل رمز الدخول' : 'PIN erforderlich')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            {status === 'setup'
              ? (isAr ? 'أنشئ رمزاً من 4 إلى 8 أرقام لحماية هذا القسم.' : 'Legen Sie einen 4–8-stelligen PIN fest, um diesen Bereich zu schützen.')
              : (isAr ? 'هذا القسم محمي برمز دخول.' : 'Dieser Bereich ist PIN-geschützt.')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={8}
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
          {status === 'setup' && (
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder={isAr ? 'تأكيد الرمز' : 'PIN bestätigen'}
              className="w-full px-4 py-3 text-center text-lg tracking-[0.4em] font-mono bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          {error && (
            <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 justify-center">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || pin.length < 4}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-sm transition cursor-pointer"
          >
            {submitting
              ? '...'
              : status === 'setup'
                ? (isAr ? 'إنشاء ودخول' : 'Einrichten & Fortfahren')
                : (isAr ? 'دخول' : 'Entsperren')}
          </button>
        </form>
      </div>
    </div>
  );
};
