import { useCustomerAuth } from '../../context/CustomerAuthContext';
import {
  AlertCircle,
  MapPin,
  ExternalLink,
  AlertTriangle,
  Navigation,
  CalendarDays,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  todayIso,
  maxDeliveryDateIso,
  getAvailableWindowsForDate,
  tomorrowIso,
  windowLabel
} from '../../utils/deliverySlot';

export const DeliveryDetailsForm = ({
  allowedPostalCodes,
  deliveryAddress,
  deliveryDate,
  deliveryNotes,
  deliveryWindows,
  distanceInfo,
  isAr,
  isPostalCodeAllowed,
  onClose,
  selectedWindow,
  setDeliveryAddress,
  setDeliveryDate,
  setDeliveryNotes,
  setSelectedWindow
}) => {
  const { customer } = useCustomerAuth();

  return (
    <div className="pt-2 border-t border-slate-100 dark:border-gray-800 space-y-3">
      {/* Verification warning (combined if both missing) */}
      {(!customer?.emailVerified || !customer?.phoneVerified) && (
        <div className="p-3 rounded-xl bg-warning-50 dark:bg-warning-950/40 border border-warning-200 dark:border-warning-900/60 text-warning-800 dark:text-warning-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-warning-600 shrink-0" />
            <span className="truncate">
              {!customer?.emailVerified && !customer?.phoneVerified
                ? (isAr ? 'البريد الإلكتروني ورقم الهاتف غير مؤكدين' : 'E-Mail & Telefon nicht bestätigt')
                : !customer?.emailVerified
                  ? (isAr ? 'البريد الإلكتروني غير مؤكد' : 'E-Mail-Adresse nicht bestätigt')
                  : (isAr ? 'رقم الهاتف غير مؤكد' : 'Telefonnummer nicht bestätigt')}
            </span>
          </div>
          <Link
            to="/account"
            onClick={onClose}
            className="font-bold underline text-warning-900 dark:text-warning-200 shrink-0"
          >
            {isAr ? 'تأكيد الآن' : 'Jetzt bestätigen'}
          </Link>
        </div>
      )}

      {/* Delivery details card */}
      <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50/60 dark:bg-gray-950/40 divide-y divide-slate-200/70 dark:divide-gray-800">
        <div className="p-3.5 flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-brand-600" />
            <span>{isAr ? 'تفاصيل التوصيل' : 'Lieferdetails'}</span>
          </span>
          <Link
            to="/account"
            onClick={onClose}
            className="text-[11px] text-brand-600 dark:text-brand-400 font-bold hover:underline flex items-center gap-1"
          >
            <span>{isAr ? 'تعديل الحساب' : 'Konto anpassen'}</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className="p-3.5">
          <textarea
            rows={2}
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder={isAr ? 'الشارع، رقم المنزل، الرمز البريدي، المدينة، الطابق...' : 'Straße, Hausnummer, PLZ, Ort, Stock/Tür'}
            required
            className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
          />
          {!isPostalCodeAllowed && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-warning-50 dark:bg-warning-950/40 border border-warning-200 dark:border-warning-800 text-warning-800 dark:text-warning-200 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-warning-600 mt-0.5" />
              <div>
                <p className="font-bold">
                  {isAr ? 'عذراً، هذا العنوان خارج نطاق التوصيل حالياً.' : 'Lieferadresse liegt außerhalb des aktuellen Liefergebiets.'}
                </p>
                <p className="text-[11px] mt-0.5 text-warning-700 dark:text-warning-300">
                  {isAr
                    ? `الرموز البريدية المتاحة حالياً: ${allowedPostalCodes.join(', ')}`
                    : `Wir liefern aktuell nur an: ${allowedPostalCodes.join(', ')}`}
                </p>
              </div>
            </div>
          )}
          {!distanceInfo.isWithinMaxDistance && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-800 text-danger-800 dark:text-danger-200 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-danger-600 mt-0.5" />
              <div>
                <p className="font-bold">
                  {isAr ? 'عذراً، العنوان بعيد جداً عن السوبرماركت.' : 'Lieferadresse ist zu weit entfernt.'}
                </p>
                <p className="text-[11px] mt-0.5 text-danger-700 dark:text-danger-300">
                  {isAr
                    ? `المسافة الحالية تقريباً ${distanceInfo.distanceKm} كم (الحد الأقصى المسموح: ${distanceInfo.maxDeliveryDistanceKm} كم).`
                    : `Entfernung ca. ${distanceInfo.distanceKm} km (Maximale Lieferdistanz: ${distanceInfo.maxDeliveryDistanceKm} km).`}
                </p>
              </div>
            </div>
          )}
          {distanceInfo.distanceKm > 0 && distanceInfo.isWithinMaxDistance && (
            <div className="mt-2 text-[11px] text-slate-500 dark:text-gray-400 flex items-center gap-1.5 font-medium">
              <Navigation className="w-3 h-3 text-brand-600 dark:text-brand-400 shrink-0" />
              <span>
                {distanceInfo.isExactAddress
                  ? (isAr
                      ? `مسافة التوصيل لعنوانك: ${distanceInfo.distanceKm} كم`
                      : `Fahrtstrecke zu Ihrer Adresse: ${distanceInfo.distanceKm} km`)
                  : (isAr
                      ? `المسافة التقديرية: ~${distanceInfo.distanceKm} كم`
                      : `Geschätzte Entfernung: ~${distanceInfo.distanceKm} km`)}
              </span>
            </div>
          )}
        </div>

        <div className="p-3.5 space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-400 mb-1 flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              <span>{isAr ? 'التاريخ' : 'Datum'}</span>
            </label>
            <input
              type="date"
              value={deliveryDate}
              min={todayIso()}
              max={maxDeliveryDateIso()}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-400 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{isAr ? 'الوقت' : 'Zeitfenster'}</span>
            </label>
            {deliveryWindows.length === 0 ? (
              <p className="text-[11px] text-slate-400 dark:text-gray-500">
                {isAr ? 'لا توجد أوقات توصيل متاحة حالياً' : 'Derzeit keine Zeitfenster verfügbar'}
              </p>
            ) : getAvailableWindowsForDate(deliveryWindows, deliveryDate).length === 0 ? (
              <div className="p-3 rounded-xl bg-warning-50 dark:bg-warning-950/40 border border-warning-200 dark:border-warning-800 text-warning-800 dark:text-warning-200 text-xs space-y-1.5">
                <p>
                  {isAr
                    ? 'عذراً، انتهت أوقات التوصيل المتاحة لهذا اليوم.'
                    : 'Für das gewählte Datum sind keine Lieferfenster mehr verfügbar.'}
                </p>
                <button
                  type="button"
                  onClick={() => setDeliveryDate(tomorrowIso())}
                  className="text-xs font-bold text-brand-700 dark:text-brand-400 underline hover:text-brand-800 dark:hover:text-brand-300 cursor-pointer block"
                >
                  {isAr ? '← التبديل إلى يوم الغد' : '→ Auf morgen wechseln'}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {getAvailableWindowsForDate(deliveryWindows, deliveryDate).map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setSelectedWindow(w)}
                    className={`px-3 py-2 rounded-lg border text-[11px] font-bold transition cursor-pointer touch-manipulation ${
                      selectedWindow?.id === w.id
                        ? 'bg-brand-600 border-brand-600 text-white shadow-xs'
                        : 'bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-300 hover:border-brand-400'
                    }`}
                  >
                    {windowLabel(w.startHour, w.endHour, isAr)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-3.5">
          <input
            type="text"
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            placeholder={isAr ? 'ملاحظات للسائق (اختياري)' : 'Lieferhinweis für den Fahrer (optional)'}
            className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>
    </div>
  );
};
