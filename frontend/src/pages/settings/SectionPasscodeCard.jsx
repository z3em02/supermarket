import { Lock } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const SectionPasscodeCard = ({
  sectionPasscode
}) => {
  const { language } = useLanguage();
  const {
    passcodeMessage,
    passcodeError,
    passcodeIsSet,
    showPasscodeForm,
    setShowPasscodeForm,
    setPasscodeError,
    setPasscodeMessage,
    handleRemovePasscode,
    savingPasscode,
    currentPasscode,
    setCurrentPasscode,
    newPasscode,
    setNewPasscode,
    confirmPasscode,
    setConfirmPasscode,
    handleSavePasscode
  } = sectionPasscode;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-850 p-4 sm:p-8 shadow-sm space-y-5">
      <div className="flex items-center gap-2.5 sm:gap-3 pb-4 border-b border-slate-100 dark:border-gray-800">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-danger-50 dark:bg-danger-950/50 text-danger-600 dark:text-danger-400 flex items-center justify-center shrink-0">
          <Lock className="w-4 sm:w-5 h-4 sm:h-5" />
        </div>
        <div>
          <h2 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white">
            {language === 'ar' ? 'رمز حماية الأقسام الحساسة' : 'Zugangs-PIN für sensible Bereiche'}
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-gray-400">
            {language === 'ar'
              ? 'يُطلب هذا الرمز عند الدخول إلى: الإعدادات، المحاسبة، العملاء، والأكشن (العروض).'
              : 'Wird beim Öffnen von Einstellungen, Buchhaltung, Kunden und Aktionen abgefragt.'}
          </p>
        </div>
      </div>

      {passcodeMessage && (
        <p className="text-xs text-success-600 dark:text-success-400 font-semibold">{passcodeMessage}</p>
      )}
      {passcodeError && (
        <p className="text-xs text-danger-600 dark:text-danger-400 font-semibold">{passcodeError}</p>
      )}

      {passcodeIsSet === null ? (
        <p className="text-xs text-slate-400">{language === 'ar' ? 'جارٍ التحميل...' : 'Wird geladen...'}</p>
      ) : !showPasscodeForm ? (
        <div className="flex items-center justify-between gap-3">
          <span className={`text-xs font-bold ${passcodeIsSet ? 'text-success-600 dark:text-success-400' : 'text-slate-400 dark:text-gray-500'}`}>
            {passcodeIsSet
              ? (language === 'ar' ? 'الرمز مفعّل حالياً' : 'PIN ist aktiv')
              : (language === 'ar' ? 'لا يوجد رمز حالياً' : 'Kein PIN eingerichtet')}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setShowPasscodeForm(true); setPasscodeError(''); setPasscodeMessage(''); }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-gray-800 dark:hover:bg-gray-700 text-white text-xs font-bold cursor-pointer"
            >
              {passcodeIsSet ? (language === 'ar' ? 'تغيير الرمز' : 'PIN ändern') : (language === 'ar' ? 'إعداد رمز' : 'PIN einrichten')}
            </button>
            {passcodeIsSet && (
              <button
                type="button"
                onClick={handleRemovePasscode}
                disabled={savingPasscode}
                className="px-3.5 py-2 rounded-xl bg-danger-50 hover:bg-danger-100 dark:bg-danger-950/40 dark:hover:bg-danger-950/60 text-danger-600 dark:text-danger-400 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {language === 'ar' ? 'إزالة' : 'Entfernen'}
              </button>
            )}
          </div>
        </div>
      ) : (
        // Not a <form> — this whole page is already one <form onSubmit={handleSubmit}>
        // (see the "Einstellungen speichern" button), and nested <form> elements are
        // invalid HTML: browsers silently break out of the nesting on submit, which
        // fires a real page navigation instead of running this handler.
        <div className="flex flex-wrap items-end gap-2.5">
          {passcodeIsSet && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-1">
                {language === 'ar' ? 'الرمز الحالي' : 'Aktueller PIN'}
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={currentPasscode}
                onChange={(e) => setCurrentPasscode(e.target.value.replace(/\D/g, ''))}
                className="w-32 px-3 py-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 focus:outline-none transition"
              />
            </div>
          )}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-1">
              {language === 'ar' ? 'رمز جديد (4-8 أرقام)' : 'Neuer PIN (4–8 Ziffern)'}
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={newPasscode}
              onChange={(e) => setNewPasscode(e.target.value.replace(/\D/g, ''))}
              className="w-32 px-3 py-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 focus:outline-none transition"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-1">
              {language === 'ar' ? 'تأكيد الرمز' : 'PIN bestätigen'}
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={confirmPasscode}
              onChange={(e) => setConfirmPasscode(e.target.value.replace(/\D/g, ''))}
              className="w-32 px-3 py-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 focus:outline-none transition"
            />
          </div>
          <button
            type="button"
            disabled={savingPasscode}
            onClick={handleSavePasscode}
            className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
          >
            {savingPasscode ? '...' : (language === 'ar' ? 'حفظ' : 'Speichern')}
          </button>
          <button
            type="button"
            onClick={() => { setShowPasscodeForm(false); setNewPasscode(''); setConfirmPasscode(''); setCurrentPasscode(''); setPasscodeError(''); }}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 text-xs font-bold cursor-pointer"
          >
            {language === 'ar' ? 'إلغاء' : 'Abbrechen'}
          </button>
        </div>
      )}
    </div>
  );
};
