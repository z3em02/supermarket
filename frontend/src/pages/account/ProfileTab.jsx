import {
  User,
  AlertTriangle,
  CheckCircle2,
  Globe,
  Lock,
  MapPin,
  Save
} from 'lucide-react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { strongPasswordHint } from '../../utils/validation';

export const ProfileTab = ({
  handleProfileChange,
  handleProfileSubmit,
  isAr,
  profileError,
  profileForm,
  saveSuccess,
  savingProfile
}) => {
  const { customer } = useCustomerAuth();

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-2xl border border-slate-200/80 dark:border-gray-800 p-4 sm:p-6 md:p-10 shadow-sm">

      <div className="mb-6">
        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <User className="w-5 h-5 text-brand-600" />
          <span>{isAr ? 'تعديل البيانات وعنوان التوصيل' : 'Profil & Lieferadresse bearbeiten'}</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
          {isAr 
            ? 'يمكنك تغيير اسمك أو رقم هاتفك أو بريدك وعنوان التوصيل المعتمد لطلباتك القادمة.' 
            : 'Hier können Sie Ihre persönlichen Daten und die Standardadresse für Lieferungen ändern.'}
        </p>
      </div>

      {profileError && (
        <div className="mb-6 p-4 rounded-2xl bg-danger-50 dark:bg-danger-950/50 border border-danger-200 dark:border-danger-900/50 text-danger-700 dark:text-danger-300 text-xs sm:text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{profileError}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="mb-6 p-4 rounded-2xl bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-900/50 text-brand-700 dark:text-brand-300 text-xs sm:text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{saveSuccess}</span>
        </div>
      )}

      <form onSubmit={handleProfileSubmit} className="space-y-6">
        {/* Contact Data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              {isAr ? 'الاسم الكامل' : 'Vollständiger Name'}
            </label>
            <input
              type="text"
              name="name"
              value={profileForm.name}
              onChange={handleProfileChange}
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>{isAr ? 'رقم الهاتف' : 'Telefonnummer'}</span>
              {customer?.phoneVerified ? (
                <span className="text-[11px] text-brand-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {isAr ? 'مؤكد' : 'Verifiziert'}
                </span>
              ) : (
                <span className="text-[11px] text-warning-600 font-bold">
                  {isAr ? 'غير مؤكد' : 'Nicht verifiziert'}
                </span>
              )}
            </label>
            <input
              type="tel"
              name="phone"
              value={profileForm.phone}
              onChange={handleProfileChange}
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>{isAr ? 'البريد الإلكتروني' : 'E-Mail-Adresse'}</span>
              {customer?.emailVerified ? (
                <span className="text-[11px] text-brand-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {isAr ? 'مؤكد' : 'Verifiziert'}
                </span>
              ) : (
                <span className="text-[11px] text-warning-600 font-bold">
                  {isAr ? 'غير مؤكد (مطلوب للطلب)' : 'Nicht verifiziert (für Bestellung nötig)'}
                </span>
              )}
            </label>
            <input
              type="email"
              name="email"
              value={profileForm.email}
              onChange={handleProfileChange}
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-brand-600" />
              <span>{isAr ? 'اللغة المفضلة للإشعارات والمراسلات' : 'Bevorzugte Sprache'}</span>
            </label>
            <select
              name="preferredLanguage"
              value={profileForm.preferredLanguage || 'de'}
              onChange={handleProfileChange}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
            >
              <option value="de">🇩🇪 Deutsch (Standard)</option>
              <option value="ar">🇦🇪 العربية</option>
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {isAr 
                ? 'سيتم إرسال رسائل البريد الإلكتروني والإشعارات باللغة المحددة.' 
                : 'Bestellbestätigungen, E-Mails & Benachrichtigungen werden in dieser Sprache gesendet.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              {isAr ? 'تغيير كلمة المرور (اختياري)' : 'Neues Passwort (optional)'}
            </label>
            <input
              type="password"
              name="password"
              value={profileForm.password}
              onChange={handleProfileChange}
              placeholder={isAr ? 'اتركه فارغاً للإبقاء على الحالية' : 'Leer lassen, um beizubehalten'}
              minLength={8}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
            {profileForm.password && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {strongPasswordHint(isAr)}
              </p>
            )}
          </div>

          {(Boolean(profileForm.password) || profileForm.email !== (customer?.email || '') || profileForm.phone !== (customer?.phone || '')) && (
            <div className="sm:col-span-2 p-3.5 rounded-2xl bg-warning-50/70 dark:bg-warning-950/40 border border-warning-200/80 dark:border-warning-800/60 transition-all">
              <label className="block text-xs font-bold text-warning-900 dark:text-warning-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-warning-600" />
                <span>{isAr ? 'كلمة المرور الحالية (لتأكيد الهوية)' : 'Aktuelles Passwort (Sicherheitsbestätigung)'}</span>
                <span className="text-danger-500">*</span>
              </label>
              <input
                type="password"
                name="currentPassword"
                value={profileForm.currentPassword || ''}
                onChange={handleProfileChange}
                required
                placeholder={isAr ? 'أدخل كلمة المرور الحالية لتأكيد التغييرات' : 'Aktuelles Passwort eingeben, um Änderungen zu bestätigen'}
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-warning-300 dark:border-warning-700 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-warning-500"
              />
              <p className="text-[11px] text-warning-700 dark:text-warning-300 mt-1">
                {isAr ? 'مطلوبة لتأكيد تغيير كلمة المرور أو البريد الإلكتروني أو رقم الهاتف.' : 'Erforderlich zur Bestätigung von Passwort-, E-Mail- oder Telefonänderungen.'}
              </p>
            </div>
          )}
        </div>

        {/* Delivery Address Section */}
        <div className="pt-4 border-t border-slate-100 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {isAr ? 'عنوان التوصيل المعتمد للمنزل' : 'Standard-Lieferadresse'}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">
                {isAr ? 'اسم الشارع' : 'Straße'}
              </label>
              <input
                type="text"
                name="street"
                value={profileForm.street}
                onChange={handleProfileChange}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">
                {isAr ? 'رقم المنزل' : 'Hausnummer'}
              </label>
              <input
                type="text"
                name="houseNumber"
                value={profileForm.houseNumber}
                onChange={handleProfileChange}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">
                {isAr ? 'الرمز البريدي (PLZ)' : 'Postleitzahl'}
              </label>
              <input
                type="text"
                name="postalCode"
                value={profileForm.postalCode}
                onChange={handleProfileChange}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">
                {isAr ? 'المدينة' : 'Stadt'}
              </label>
              <input
                type="text"
                name="city"
                value={profileForm.city}
                onChange={handleProfileChange}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">
                {isAr ? 'الطابق / رقم الشقة' : 'Stock / Tür'}
              </label>
              <input
                type="text"
                name="floorApartment"
                value={profileForm.floorApartment}
                onChange={handleProfileChange}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">
                {isAr ? 'ملاحظات للسائق (اختياري)' : 'Lieferhinweis für den Fahrer'}
              </label>
              <input
                type="text"
                name="deliveryNotes"
                value={profileForm.deliveryNotes}
                onChange={handleProfileChange}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={savingProfile}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 touch-manipulation"
          >
            <Save className="w-4 h-4 shrink-0" />
            <span>{savingProfile ? (isAr ? 'جارٍ الحفظ...' : 'Wird gespeichert...') : (isAr ? 'حفظ التعديلات' : 'Änderungen speichern')}</span>
          </button>
        </div>

      </form>
    </div>
  );
};
