import { Truck, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const AcceptOrderModal = ({
  acceptModalDriver,
  acceptModalOrder,
  acceptingOrder,
  activeDrivers,
  handleConfirmAccept,
  knownDriverNames,
  setAcceptModalDriver,
  setAcceptModalOrder
}) => {
  const { language } = useLanguage();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md overflow-y-auto border border-slate-200 dark:border-gray-800 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100/80 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'ar' ? 'قبول الطلب وتعيين السائق' : 'Bestellung annehmen & Fahrer zuweisen'}
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Order #{acceptModalOrder.id.slice(0, 8)}
              </span>
            </div>
          </div>
          <button
            onClick={() => { setAcceptModalOrder(null); setAcceptModalDriver(''); }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              {language === 'ar' ? 'السائق *' : 'Fahrer *'}
            </label>
            <select
              value={acceptModalDriver}
              onChange={(e) => setAcceptModalDriver(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 text-sm font-semibold text-slate-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">
                {language === 'ar' ? '— اختر السائق —' : '— Fahrer auswählen —'}
              </option>
              {knownDriverNames.map((name) => (
                <option key={name} value={name}>
                  {name}{!activeDrivers.some((s) => s.driverName === name) ? (language === 'ar' ? ' (غير متصل)' : ' (offline)') : ''}
                </option>
              ))}
            </select>
            {knownDriverNames.length === 0 && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1.5">
                {language === 'ar'
                  ? 'لا يوجد سائقون معروفون بعد. يجب على سائق تسجيل الدخول عبر /driver مرة واحدة على الأقل.'
                  : 'Noch kein Fahrer bekannt. Ein Fahrer muss sich mindestens einmal über /driver anmelden.'}
              </p>
            )}
          </div>
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => { setAcceptModalOrder(null); setAcceptModalDriver(''); }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-gray-800 transition cursor-pointer"
            >
              {language === 'ar' ? 'إلغاء' : 'Abbrechen'}
            </button>
            <button
              type="button"
              disabled={!acceptModalDriver || acceptingOrder}
              onClick={handleConfirmAccept}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              {acceptingOrder
                ? (language === 'ar' ? 'جارٍ...' : 'Wird bestätigt...')
                : (language === 'ar' ? 'قبول وتعيين' : 'Annehmen & zuweisen')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
