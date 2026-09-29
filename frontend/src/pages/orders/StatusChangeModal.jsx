import { Lock, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const StatusChangeModal = ({
  adminNoteInput,
  customerNoteInput,
  handleConfirmStatusChange,
  setAdminNoteInput,
  setCustomerNoteInput,
  setStatusModalOrder,
  setTargetStatus,
  statusModalOrder,
  targetStatus,
  updating
}) => {
  const { t, language } = useLanguage();

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-lg overflow-y-auto border border-slate-200 dark:border-gray-800 shadow-2xl space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-950/60 border border-primary-100/80 dark:border-primary-900/50 text-primary-600 dark:text-primary-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t('changeStatusPrompt')}
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Order #{statusModalOrder.id.slice(0, 8)}
            </span>
          </div>
        </div>
        <button
          onClick={() => setStatusModalOrder(null)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Status Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            {t('status')} *
          </label>
          <select
            value={targetStatus}
            onChange={(e) => setTargetStatus(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 text-sm capitalize"
          >
            <option value="pending" className="dark:bg-gray-900 dark:text-white">{t('pending')}</option>
            <option value="accepted" className="dark:bg-gray-900 dark:text-white">{t('accepted')}</option>
            <option value="preparing" className="dark:bg-gray-900 dark:text-white">{t('preparing')}</option>
            <option value="out_for_delivery" className="dark:bg-gray-900 dark:text-white">{language === 'ar' ? 'جاري التوصيل للمنزل' : 'In Zustellung (Lieferung)'}</option>
            <option value="shipped" className="dark:bg-gray-900 dark:text-white">{t('shipped')}</option>
            <option value="delivered" className="dark:bg-gray-900 dark:text-white">{t('delivered')}</option>
            <option value="declined" className="dark:bg-gray-900 dark:text-white">{t('declined')}</option>
          </select>
          {targetStatus === 'declined' && (
            <p className="mt-1.5 text-xs text-danger-600 dark:text-danger-400 font-medium">
              Note: If previously accepted or preparing, deducted stock will be automatically restored to inventory.
            </p>
          )}
        </div>

        {/* Admin Note Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-promo-700 dark:text-promo-400 uppercase tracking-wider">
              {t('adminNotes')} ({t('internalNoteOnly')})
            </label>
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Lock className="w-3 h-3 text-promo-500" /> Private
            </span>
          </div>
          <textarea
            rows="3"
            value={adminNoteInput}
            onChange={(e) => setAdminNoteInput(e.target.value)}
            placeholder="z.B. 2. Stock links klingeln, Lieferzeitfenster 18:00-19:00, passend bar..."
            className="w-full px-3.5 py-2.5 bg-promo-50/50 dark:bg-promo-950/20 border border-promo-200/80 dark:border-promo-800/60 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-promo-500 text-sm placeholder-slate-400"
          />
        </div>

        {/* Customer Note Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            {t('customerNotes')}
          </label>
          <textarea
            rows="2"
            value={customerNoteInput}
            onChange={(e) => setCustomerNoteInput(e.target.value)}
            placeholder={t('notesPlaceholder')}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 text-sm placeholder-slate-400"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-gray-800">
        <button
          type="button"
          onClick={() => setStatusModalOrder(null)}
          className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition"
        >
          {t('cancel')}
        </button>
        <button
          type="button"
          onClick={handleConfirmStatusChange}
          disabled={updating}
          className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
        >
          {updating ? t('loading') : t('save')}
        </button>
      </div>
    </div>
  );
};
