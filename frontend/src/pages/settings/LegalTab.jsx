import { Gavel, FileText } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Card, CardHeader, Input, Switch } from '../../components/ui';

export const LegalTab = ({
  formData,
  handleChange
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="space-y-5">
        <CardHeader
          icon={Gavel}
          title={isAr ? 'البيانات القانونية' : 'Rechtliche Angaben'}
          description={isAr
            ? 'تُستخدم هذه البيانات مباشرة في صفحتي Impressum و AGB.'
            : 'Diese Angaben werden direkt auf den Seiten Impressum und AGB angezeigt.'}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={isAr ? 'المالك / الشخص المسؤول' : 'Inhaber / Verantwortliche Person'}
            hint={isAr ? 'مطلوب قانونياً لصفحة Impressum (§ 5 ECG).' : 'Gesetzlich für das Impressum erforderlich (§ 5 ECG).'}
            type="text"
            value={formData.legalOwnerName}
            onChange={(e) => handleChange('legalOwnerName', e.target.value)}
            placeholder={isAr ? 'الاسم القانوني الكامل' : 'z.B. Max Mustermann'}
          />
          <Input
            label={isAr ? 'رقم GISA / رخصة العمل' : 'GISA-Zahl / Gewerbeschein'}
            type="text"
            value={formData.gisaNumber}
            onChange={(e) => handleChange('gisaNumber', e.target.value)}
            placeholder="z.B. 12345678"
          />
          <div className="sm:col-span-2">
            <Input
              label={isAr ? 'طبيعة النشاط (بالألمانية)' : 'Unternehmensgegenstand (Deutsch)'}
              type="text"
              value={formData.businessPurposeDe}
              onChange={(e) => handleChange('businessPurposeDe', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label={isAr ? 'طبيعة النشاط (بالعربية)' : 'Unternehmensgegenstand (Arabisch)'}
              type="text"
              dir="rtl"
              value={formData.businessPurposeAr}
              onChange={(e) => handleChange('businessPurposeAr', e.target.value)}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-gray-800 space-y-4">
          <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-gray-950 ps-4 pe-1 py-1.5 rounded-xl border border-slate-200/80 dark:border-gray-800">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                {isAr ? 'منشأة صغيرة (بدون ضريبة القيمة المضافة)' : 'Kleinunternehmer (keine USt.)'}
              </span>
              <span className="text-caption block mt-0.5">
                {isAr ? '§ 6 Abs. 1 Z 27 UStG' : 'Gemäß § 6 Abs. 1 Z 27 UStG'}
              </span>
            </div>
            <Switch
              checked={formData.isKleinunternehmer}
              onChange={(next) => handleChange('isKleinunternehmer', next)}
              tone="primary"
              label={isAr ? 'منشأة صغيرة' : 'Kleinunternehmer'}
            />
          </div>

          {!formData.isKleinunternehmer && (
            <div className="sm:w-64">
              <Input
                label={isAr ? 'رقم ضريبة القيمة المضافة (UID)' : 'UID-Nummer'}
                type="text"
                value={formData.vatId}
                onChange={(e) => handleChange('vatId', e.target.value)}
                placeholder="ATU12345678"
              />
            </div>
          )}
        </div>

        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-warning-50 dark:bg-warning-950/40 border border-warning-200 dark:border-warning-900/60 text-warning-800 dark:text-warning-300 text-xs">
          <FileText className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            {isAr
              ? 'يُنصح بمراجعة نص AGB من قبل محامٍ مختص أو الاستعانة بالاستشارة القانونية المجانية من غرفة التجارة النمساوية (WKO) قبل النشر النهائي.'
              : 'Wir empfehlen, den AGB-Text vor der endgültigen Veröffentlichung von einem/einer Rechtsanwalt/-anwältin oder der kostenlosen WKO-Rechtsberatung prüfen zu lassen.'}
          </span>
        </div>
      </Card>
    </div>
  );
};
