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
import { Button, Card, CardHeader, IconButton, Input } from '../../components/ui';

export const DeliveryTab = ({
  deliveryWindowSettings,
  formData,
  geocodingStore,
  handleChange,
  handleGeocodeStoreAddress
}) => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
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

  const addOnEnter = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddDeliveryWindow(e);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Delivery Rules Card */}
      <Card className="space-y-5">
        <CardHeader icon={Truck} title={t('deliveryRules')} description={t('deliveryRulesDesc')} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label={`${t('minOrderValue')} (€)`}
            type="number"
            min="0"
            step="0.01"
            value={formData.minOrderValue}
            onChange={(e) => handleChange('minOrderValue', e.target.value)}
          />
          <Input
            label={t('baseServiceFee')}
            type="number"
            min="0"
            step="0.01"
            value={formData.deliveryFee}
            onChange={(e) => handleChange('deliveryFee', e.target.value)}
            placeholder="2.00"
          />
          <Input
            label={t('deliveryFeePerKm')}
            hint={t('deliveryFeePerKmHint')}
            type="number"
            min="0"
            step="0.01"
            value={formData.deliveryFeePerKm}
            onChange={(e) => handleChange('deliveryFeePerKm', e.target.value)}
            placeholder="0.10"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-gray-800">
          <Input
            label={t('freeDeliveryThreshold')}
            hint={t('freeDeliveryThresholdHint')}
            type="number"
            min="0"
            step="0.01"
            value={formData.freeDeliveryThreshold}
            onChange={(e) => handleChange('freeDeliveryThreshold', e.target.value)}
          />
          <Input
            label={t('maxDeliveryDistanceKm')}
            hint={t('maxDeliveryDistanceKmHint')}
            type="number"
            min="0"
            step="0.1"
            value={formData.maxDeliveryDistanceKm}
            onChange={(e) => handleChange('maxDeliveryDistanceKm', e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-gray-800">
          <Input
            label={t('allowedPostalCodes')}
            hint={t('allowedPostalCodesHint')}
            type="text"
            value={formData.allowedPostalCodes}
            onChange={(e) => handleChange('allowedPostalCodes', e.target.value)}
            placeholder={t('allowedPostalCodesPlaceholder')}
          />
        </div>

        {/* Supermarket Origin Coordinates */}
        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-gray-950/60 border border-slate-200/70 dark:border-gray-800/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-success-600 dark:text-success-400 shrink-0" aria-hidden="true" />
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  {t('storeCoordinates')}
                </h3>
                <p className="text-caption">
                  {formData.address ? formData.address : 'Koppreitergasse 8, 1120 Wien'}
                </p>
              </div>
            </div>

            <Button
              variant="secondary"
              icon={RefreshCw}
              loading={geocodingStore}
              disabled={!formData.address}
              onClick={handleGeocodeStoreAddress}
            >
              {geocodingStore ? (isAr ? 'جارٍ التحديد...' : 'Ermittle...') : t('updateCoordsFromAddress')}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <Input
              label={t('storeLatitude')}
              type="number"
              step="any"
              value={formData.storeLatitude}
              onChange={(e) => handleChange('storeLatitude', e.target.value)}
              placeholder="48.1746605"
              className="font-mono"
            />
            <Input
              label={t('storeLongitude')}
              type="number"
              step="any"
              value={formData.storeLongitude}
              onChange={(e) => handleChange('storeLongitude', e.target.value)}
              placeholder="16.3272662"
              className="font-mono"
            />
          </div>
        </div>
      </Card>

      {/* Delivery Time Windows Card */}
      <Card className="space-y-5">
        <CardHeader
          icon={Clock}
          title={isAr ? 'أوقات التوصيل (Zeitfenster)' : 'Liefer-Zeitfenster'}
          description={isAr
            ? 'الأوقات التي يمكن للعملاء اختيارها عند إتمام الطلب.'
            : 'Zeitfenster, die Kunden beim Checkout auswählen können. Nur aktive werden angezeigt.'}
        />

        {loadingWindows ? (
          <p className="text-xs text-slate-500">{isAr ? 'جارٍ التحميل...' : 'Wird geladen...'}</p>
        ) : (
          <div className="space-y-3">
            <span className="block text-xs font-bold text-slate-600 dark:text-slate-300">
              {isAr ? 'الأوقات المتاحة حالياً:' : 'Vorhandene Zeitfenster:'}
            </span>
            <div className="flex flex-wrap gap-2">
              {deliveryWindows.length === 0 && (
                <p className="text-xs text-slate-500 italic">
                  {isAr ? 'لا توجد أوقات مضافة بعد.' : 'Noch keine Zeitfenster angelegt.'}
                </p>
              )}
              {deliveryWindows.map((win) => (
                <div
                  key={win.id}
                  className={`flex items-center gap-0.5 ps-3.5 pe-0.5 rounded-xl border text-xs font-bold transition ${
                    win.isActive
                      ? 'bg-success-50 dark:bg-success-950/40 border-success-200 dark:border-success-900/60 text-success-800 dark:text-success-300'
                      : 'bg-slate-50 dark:bg-gray-950 border-slate-200 dark:border-gray-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <span className="me-1 tabular-nums">{windowLabel(win.startHour, win.endHour, isAr)}</span>
                  <IconButton
                    icon={Power}
                    label={win.isActive ? (isAr ? 'إيقاف' : 'Deaktivieren') : (isAr ? 'تفعيل' : 'Aktivieren')}
                    onClick={() => handleToggleDeliveryWindow(win)}
                    disabled={savingWindowId === win.id}
                    className="!text-current"
                  />
                  <IconButton
                    icon={Trash2}
                    label={isAr ? 'حذف' : 'Löschen'}
                    onClick={() => handleDeleteDeliveryWindow(win.id)}
                    className="!text-danger-600 dark:!text-danger-400 hover:!bg-danger-100 dark:hover:!bg-danger-950/50"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Window Inline (No page refresh) */}
        <div className="pt-4 border-t border-slate-100 dark:border-gray-800 space-y-2">
          <span className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            {isAr ? 'إضافة وقت جديد:' : 'Neues Zeitfenster anlegen:'}
          </span>
          <div className="flex flex-wrap items-end gap-2.5">
            <div className="w-32">
              <Input
                label={isAr ? 'من (ساعة 0–23)' : 'Von (Stunde 0–23)'}
                type="number"
                min="0"
                max="23"
                value={newStartHour}
                onChange={(e) => setNewStartHour(e.target.value)}
                onKeyDown={addOnEnter}
              />
            </div>
            <div className="w-32">
              <Input
                label={isAr ? 'إلى (ساعة 1–24)' : 'Bis (Stunde 1–24)'}
                type="number"
                min="1"
                max="24"
                value={newEndHour}
                onChange={(e) => setNewEndHour(e.target.value)}
                onKeyDown={addOnEnter}
              />
            </div>
            <Button icon={Plus} onClick={handleAddDeliveryWindow}>
              {isAr ? 'إضافة وقت' : 'Zeitfenster hinzufügen'}
            </Button>
          </div>
          {windowError && (
            <p className="text-xs text-danger-600 dark:text-danger-400">{windowError}</p>
          )}
        </div>
      </Card>
    </div>
  );
};
