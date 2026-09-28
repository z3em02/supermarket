import {
  Truck,
  MapPin,
  RefreshCw,
  Clock,
  Power,
  Trash2,
  Plus
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { windowLabel } from '../../utils/deliverySlot';

export const DeliveryTab = ({
  deliveryWindowSettings,
  formData,
  geocodingStore,
  handleChange,
  handleGeocodeStoreAddress
}) => {
  const { t, language } = useLanguage();
  const {
    loadingWindows,
    deliveryWindows,
    handleToggleDeliveryWindow,
    savingWindowId,
    handleDeleteDeliveryWindow,
    newStartHour,
    setNewStartHour,
    handleAddDeliveryWindow,
    newEndHour,
    setNewEndHour,
    windowError
  } = deliveryWindowSettings;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Delivery Rules Card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-850 p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-gray-800">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              {t('deliveryRules')}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-gray-400">
              {t('deliveryRulesDesc')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
              {t('minOrderValue')} (€)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.minOrderValue}
              onChange={(e) => handleChange('minOrderValue', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
              {t('baseServiceFee')}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.deliveryFee}
              onChange={(e) => handleChange('deliveryFee', e.target.value)}
              placeholder="2.00"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
              {t('deliveryFeePerKm')}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.deliveryFeePerKm}
              onChange={(e) => handleChange('deliveryFeePerKm', e.target.value)}
              placeholder="0.10"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none transition"
            />
            <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">
              {t('deliveryFeePerKmHint')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-gray-800">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
              {t('freeDeliveryThreshold')}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.freeDeliveryThreshold}
              onChange={(e) => handleChange('freeDeliveryThreshold', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none transition"
            />
            <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">
              {t('freeDeliveryThresholdHint')}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
              {t('maxDeliveryDistanceKm')}
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={formData.maxDeliveryDistanceKm}
              onChange={(e) => handleChange('maxDeliveryDistanceKm', e.target.value)}
              placeholder="0"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none transition"
            />
            <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">
              {t('maxDeliveryDistanceKmHint')}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-gray-800">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
            {t('allowedPostalCodes')}
          </label>
          <input
            type="text"
            value={formData.allowedPostalCodes}
            onChange={(e) => handleChange('allowedPostalCodes', e.target.value)}
            placeholder={t('allowedPostalCodesPlaceholder')}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none transition"
          />
          <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">
            {t('allowedPostalCodesHint')}
          </p>
        </div>

        {/* Supermarket Origin Coordinates */}
        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-gray-950/60 border border-slate-200/70 dark:border-gray-800/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  {t('storeCoordinates')}
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-gray-500">
                  {formData.address ? formData.address : 'Koppreitergasse 8, 1120 Wien'}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={geocodingStore || !formData.address}
              onClick={handleGeocodeStoreAddress}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 hover:border-emerald-500 text-slate-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-semibold shadow-2xs transition disabled:opacity-40 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${geocodingStore ? 'animate-spin text-emerald-600' : ''}`} />
              <span>{geocodingStore ? (language === 'ar' ? 'جارٍ التحديد...' : 'Ermittle...') : t('updateCoordsFromAddress')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 mb-1">
                {t('storeLatitude')}
              </label>
              <input
                type="number"
                step="any"
                value={formData.storeLatitude}
                onChange={(e) => handleChange('storeLatitude', e.target.value)}
                placeholder="48.1746605"
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 mb-1">
                {t('storeLongitude')}
              </label>
              <input
                type="number"
                step="any"
                value={formData.storeLongitude}
                onChange={(e) => handleChange('storeLongitude', e.target.value)}
                placeholder="16.3272662"
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Time Windows Card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-850 p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-gray-800">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              {language === 'ar' ? 'أوقات التوصيل (Zeitfenster)' : 'Liefer-Zeitfenster'}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-gray-400">
              {language === 'ar'
                ? 'الأوقات التي يمكن للعملاء اختيارها عند إتمام الطلب.'
                : 'Zeitfenster, die Kunden beim Checkout auswählen können. Nur aktive werden angezeigt.'}
            </p>
          </div>
        </div>

        {loadingWindows ? (
          <p className="text-xs text-slate-400">{language === 'ar' ? 'جارٍ التحميل...' : 'Wird geladen...'}</p>
        ) : (
          <div className="space-y-3">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
              {language === 'ar' ? 'الأوقات المتاحة حالياً:' : 'Vorhandene Zeitfenster:'}
            </span>
            <div className="flex flex-wrap gap-2">
              {deliveryWindows.length === 0 && (
                <p className="text-xs text-slate-400 italic">
                  {language === 'ar' ? 'لا توجد أوقات مضافة بعد.' : 'Noch keine Zeitfenster angelegt.'}
                </p>
              )}
              {deliveryWindows.map((win) => (
                <div
                  key={win.id}
                  className={`flex items-center gap-2 pl-3.5 pr-2 py-1.5 rounded-xl border text-xs font-bold transition ${
                    win.isActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-850 text-emerald-800 dark:text-emerald-300'
                      : 'bg-slate-50 dark:bg-gray-950 border-slate-200 dark:border-gray-800 text-slate-400 dark:text-gray-500'
                  }`}
                >
                  <span>{windowLabel(win.startHour, win.endHour, language === 'ar')}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleDeliveryWindow(win)}
                    disabled={savingWindowId === win.id}
                    title={win.isActive ? (language === 'ar' ? 'إيقاف' : 'Deaktivieren') : (language === 'ar' ? 'تفعيل' : 'Aktivieren')}
                    className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 cursor-pointer"
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDeliveryWindow(win.id)}
                    title={language === 'ar' ? 'حذف' : 'Löschen'}
                    className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-500 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Window Inline (No page refresh) */}
        <div className="pt-3 border-t border-slate-100 dark:border-gray-800 space-y-2">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
            {language === 'ar' ? 'إضافة وقت جديد:' : 'Neues Zeitfenster anlegen:'}
          </span>
          <div className="flex flex-wrap items-end gap-2.5">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-400 mb-1">
                {language === 'ar' ? 'من (ساعة 0–23)' : 'Von (Stunde 0–23)'}
              </label>
              <input
                type="number"
                min="0"
                max="23"
                value={newStartHour}
                onChange={(e) => setNewStartHour(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDeliveryWindow(e);
                  }
                }}
                className="w-20 px-3 py-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-400 mb-1">
                {language === 'ar' ? 'إلى (ساعة 1–24)' : 'Bis (Stunde 1–24)'}
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={newEndHour}
                onChange={(e) => setNewEndHour(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDeliveryWindow(e);
                  }
                }}
                className="w-20 px-3 py-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none transition"
              />
            </div>
            <button
              type="button"
              onClick={handleAddDeliveryWindow}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold cursor-pointer shadow-xs transition touch-manipulation"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'إضافة وقت' : 'Zeitfenster hinzufügen'}</span>
            </button>
          </div>
          {windowError && (
            <p className="text-xs text-rose-600 dark:text-rose-400">{windowError}</p>
          )}
        </div>
      </div>
    </div>
  );
};
