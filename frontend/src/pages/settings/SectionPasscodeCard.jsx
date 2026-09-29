import { Lock } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Button, Card, CardHeader, Input } from '../../components/ui';

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
    <Card className="space-y-5">
      <CardHeader
        icon={Lock}
        title={language === 'ar' ? 'رمز حماية الأقسام الحساسة' : 'Zugangs-PIN für sensible Bereiche'}
        description={language === 'ar'
          ? 'يُطلب هذا الرمز عند الدخول إلى: الإعدادات، المحاسبة، العملاء، والأكشن (العروض).'
          : 'Wird beim Öffnen von Einstellungen, Buchhaltung, Kunden und Aktionen abgefragt.'}
      />

      {passcodeMessage && (
        <p className="text-xs text-success-600 dark:text-success-400 font-semibold">{passcodeMessage}</p>
      )}
      {passcodeError && (
        <p className="text-xs text-danger-600 dark:text-danger-400 font-semibold">{passcodeError}</p>
      )}

      {passcodeIsSet === null ? (
        <p className="text-xs text-slate-500">{language === 'ar' ? 'جارٍ التحميل...' : 'Wird geladen...'}</p>
      ) : !showPasscodeForm ? (
        <div className="flex items-center justify-between gap-3">
          <span className={`text-xs font-bold ${passcodeIsSet ? 'text-success-600 dark:text-success-400' : 'text-slate-500 dark:text-slate-400'}`}>
            {passcodeIsSet
              ? (language === 'ar' ? 'الرمز مفعّل حالياً' : 'PIN ist aktiv')
              : (language === 'ar' ? 'لا يوجد رمز حالياً' : 'Kein PIN eingerichtet')}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => { setShowPasscodeForm(true); setPasscodeError(''); setPasscodeMessage(''); }}
            >
              {passcodeIsSet ? (language === 'ar' ? 'تغيير الرمز' : 'PIN ändern') : (language === 'ar' ? 'إعداد رمز' : 'PIN einrichten')}
            </Button>
            {passcodeIsSet && (
              <Button variant="danger" onClick={handleRemovePasscode} disabled={savingPasscode}>
                {language === 'ar' ? 'إزالة' : 'Entfernen'}
              </Button>
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
            <div className="w-36">
              <Input
                label={language === 'ar' ? 'الرمز الحالي' : 'Aktueller PIN'}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={currentPasscode}
                onChange={(e) => setCurrentPasscode(e.target.value.replace(/\D/g, ''))}
                className="font-mono"
              />
            </div>
          )}
          <div className="w-36">
              <Input
                label={language === 'ar' ? 'رمز جديد (4-8 أرقام)' : 'Neuer PIN (4–8 Ziffern)'}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={newPasscode}
                onChange={(e) => setNewPasscode(e.target.value.replace(/\D/g, ''))}
                className="font-mono"
              />
            </div>
          <div className="w-36">
              <Input
                label={language === 'ar' ? 'تأكيد الرمز' : 'PIN bestätigen'}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={confirmPasscode}
                onChange={(e) => setConfirmPasscode(e.target.value.replace(/\D/g, ''))}
                className="font-mono"
              />
            </div>
          <Button loading={savingPasscode} onClick={handleSavePasscode}>
            {language === 'ar' ? 'حفظ' : 'Speichern'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => { setShowPasscodeForm(false); setNewPasscode(''); setConfirmPasscode(''); setCurrentPasscode(''); setPasscodeError(''); }}
          >
            {language === 'ar' ? 'إلغاء' : 'Abbrechen'}
          </Button>
        </div>
      )}
    </Card>
  );
};
