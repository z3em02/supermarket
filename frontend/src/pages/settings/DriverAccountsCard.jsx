import {
  Truck,
  Lock,
  Plus,
  RefreshCw,
  Power,
  Trash2
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const DriverAccountsCard = ({
  driverAccounts
}) => {
  const { language } = useLanguage();
  const {
    driverMessage,
    driverError,
    revealedPin,
    setRevealedPin,
    newDriverName,
    setNewDriverName,
    creatingDriver,
    handleCreateDriver,
    driversLoading,
    drivers,
    busyDriverId,
    handleResetDriverPin,
    handleToggleDriverActive,
    handleDeleteDriver
  } = driverAccounts;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-850 p-4 sm:p-8 shadow-sm space-y-5">
      <div className="flex items-center gap-2.5 sm:gap-3 pb-4 border-b border-slate-100 dark:border-gray-800">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <Truck className="w-4 sm:w-5 h-4 sm:h-5" />
        </div>
        <div>
          <h2 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white">
            {language === 'ar' ? 'حسابات السائقين' : 'Fahrerkonten'}
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-gray-400">
            {language === 'ar'
              ? 'كل سائق يملك اسماً ورمز دخول (PIN) خاصاً به لتسجيل الدخول إلى واجهة السائق (/driver). كل تسجيل دخول يحتاج أيضاً موافقة المشرف.'
              : 'Jeder Fahrer hat einen eigenen Namen und PIN zum Einloggen im Lieferportal (/driver). Jeder Login benötigt zusätzlich die Freigabe eines Admins.'}
          </p>
        </div>
      </div>

      {driverMessage && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{driverMessage}</p>
      )}
      {driverError && (
        <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{driverError}</p>
      )}

      {/* Freshly generated/reset PIN — shown exactly once, never stored in plaintext. */}
      {revealedPin && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-xs text-amber-900 dark:text-amber-200">
              <span className="font-bold">{revealedPin.name}</span>
              {': '}
              <span className="font-mono text-sm font-extrabold tracking-widest">{revealedPin.pin}</span>
              <span className="block text-[10px] font-semibold mt-0.5 text-amber-700 dark:text-amber-400">
                {language === 'ar' ? 'انسخه الآن، لن يظهر مرة أخرى' : 'Jetzt notieren — wird nicht erneut angezeigt'}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRevealedPin(null)}
            className="shrink-0 text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
          >
            {language === 'ar' ? 'إغلاق' : 'Schließen'}
          </button>
        </div>
      )}

      {/* Add driver — not a <form>, the whole page is already one <form onSubmit={handleSubmit}>. */}
      <div className="flex flex-wrap items-end gap-2.5">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-1">
            {language === 'ar' ? 'اسم السائق الجديد' : 'Name des neuen Fahrers'}
          </label>
          <input
            type="text"
            value={newDriverName}
            onChange={(e) => setNewDriverName(e.target.value)}
            placeholder={language === 'ar' ? 'مثال: أحمد' : 'z.B. Ahmed'}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none transition"
          />
        </div>
        <button
          type="button"
          disabled={creatingDriver}
          onClick={handleCreateDriver}
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          {creatingDriver ? '...' : (language === 'ar' ? 'إضافة سائق' : 'Fahrer hinzufügen')}
        </button>
      </div>

      {/* Driver list */}
      {driversLoading ? (
        <p className="text-xs text-slate-400">{language === 'ar' ? 'جارٍ التحميل...' : 'Wird geladen...'}</p>
      ) : drivers.length === 0 ? (
        <p className="text-xs text-slate-400">{language === 'ar' ? 'لا يوجد سائقون بعد.' : 'Noch keine Fahrer angelegt.'}</p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-gray-800 rounded-xl border border-slate-200/70 dark:border-gray-800 overflow-hidden">
          {drivers.map((driver) => (
            <div key={driver.id} className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-gray-900">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{driver.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    driver.active
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {driver.active
                      ? (language === 'ar' ? 'مفعل' : 'Aktiv')
                      : (language === 'ar' ? 'معطل' : 'Deaktiviert')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={busyDriverId === driver.id}
                  onClick={() => handleResetDriverPin(driver)}
                  title={language === 'ar' ? 'إعادة تعيين الرمز' : 'PIN zurücksetzen'}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 disabled:opacity-50 cursor-pointer transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={busyDriverId === driver.id}
                  onClick={() => handleToggleDriverActive(driver)}
                  title={driver.active ? (language === 'ar' ? 'تعطيل' : 'Deaktivieren') : (language === 'ar' ? 'تفعيل' : 'Aktivieren')}
                  className={`p-2 rounded-lg disabled:opacity-50 cursor-pointer transition ${
                    driver.active
                      ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
                {!driver.active && (
                  <button
                    type="button"
                    disabled={busyDriverId === driver.id}
                    onClick={() => handleDeleteDriver(driver)}
                    title={language === 'ar' ? 'حذف' : 'Löschen'}
                    className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 disabled:opacity-50 cursor-pointer transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
