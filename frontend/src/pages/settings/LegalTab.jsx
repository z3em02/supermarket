import { Gavel, FileText } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const LegalTab = ({
  formData,
  handleChange
}) => {
  const { language, direction } = useLanguage();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-2xl border border-slate-200/80 dark:border-gray-850 p-4 sm:p-8 shadow-sm space-y-5 sm:space-y-6">
        <div className="flex items-center gap-2.5 sm:gap-3 pb-4 border-b border-slate-100 dark:border-gray-800">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-promo-50 dark:bg-promo-950/50 text-promo-600 dark:text-promo-400 flex items-center justify-center shrink-0">
            <Gavel className="w-4 sm:w-5 h-4 sm:h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white">
              {language === 'ar' ? 'البيانات القانونية' : 'Rechtliche Angaben'}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-gray-400">
              {language === 'ar'
                ? 'تُستخدم هذه البيانات مباشرة في صفحتي Impressum و AGB.'
                : 'Diese Angaben werden direkt auf den Seiten Impressum und AGB angezeigt.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
              {language === 'ar' ? 'المالك / الشخص المسؤول' : 'Inhaber / Verantwortliche Person'}
            </label>
            <input
              type="text"
              value={formData.legalOwnerName}
              onChange={(e) => handleChange('legalOwnerName', e.target.value)}
              placeholder={language === 'ar' ? 'الاسم القانوني الكامل' : 'z.B. Max Mustermann'}
              className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 focus:outline-none transition"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {language === 'ar' ? 'مطلوب قانونياً لصفحة Impressum (§ 5 ECG).' : 'Gesetzlich für das Impressum erforderlich (§ 5 ECG).'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
              {language === 'ar' ? 'رقم GISA / رخصة العمل' : 'GISA-Zahl / Gewerbeschein'}
            </label>
            <input
              type="text"
              value={formData.gisaNumber}
              onChange={(e) => handleChange('gisaNumber', e.target.value)}
              placeholder="z.B. 12345678"
              className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 focus:outline-none transition"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
              {language === 'ar' ? 'طبيعة النشاط (بالألمانية)' : 'Unternehmensgegenstand (Deutsch)'}
            </label>
            <input
              type="text"
              value={formData.businessPurposeDe}
              onChange={(e) => handleChange('businessPurposeDe', e.target.value)}
              className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 focus:outline-none transition"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
              {language === 'ar' ? 'طبيعة النشاط (بالعربية)' : 'Unternehmensgegenstand (Arabisch)'}
            </label>
            <input
              type="text"
              dir="rtl"
              value={formData.businessPurposeAr}
              onChange={(e) => handleChange('businessPurposeAr', e.target.value)}
              className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 focus:outline-none transition"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-gray-800 space-y-4">
          <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-gray-950 px-3.5 sm:px-4 py-3 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-gray-800">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-gray-200 block">
                {language === 'ar' ? 'منشأة صغيرة (بدون ضريبة القيمة المضافة)' : 'Kleinunternehmer (keine USt.)'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                {language === 'ar' ? '§ 6 Abs. 1 Z 27 UStG' : 'Gemäß § 6 Abs. 1 Z 27 UStG'}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={formData.isKleinunternehmer}
              onClick={() => handleChange('isKleinunternehmer', !formData.isKleinunternehmer)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none touch-manipulation ${
                formData.isKleinunternehmer ? 'bg-primary-600' : 'bg-slate-300 dark:bg-gray-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                  formData.isKleinunternehmer ? (direction === 'rtl' ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {!formData.isKleinunternehmer && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
                {language === 'ar' ? 'رقم ضريبة القيمة المضافة (UID)' : 'UID-Nummer'}
              </label>
              <input
                type="text"
                value={formData.vatId}
                onChange={(e) => handleChange('vatId', e.target.value)}
                placeholder="ATU12345678"
                className="w-full sm:w-64 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 focus:outline-none transition"
              />
            </div>
          )}
        </div>

        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-warning-50 dark:bg-warning-950/40 border border-warning-200 dark:border-warning-900/60 text-warning-800 dark:text-warning-300 text-xs">
          <FileText className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {language === 'ar'
              ? 'يُنصح بمراجعة نص AGB من قبل محامٍ مختص أو الاستعانة بالاستشارة القانونية المجانية من غرفة التجارة النمساوية (WKO) قبل النشر النهائي.'
              : 'Wir empfehlen, den AGB-Text vor der endgültigen Veröffentlichung von einem/einer Rechtsanwalt/-anwältin oder der kostenlosen WKO-Rechtsberatung prüfen zu lassen.'}
          </span>
        </div>
      </div>
    </div>
  );
};
