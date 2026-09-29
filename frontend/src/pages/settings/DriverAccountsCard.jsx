import {
  Truck,
  Lock,
  Plus,
  RefreshCw,
  Power,
  Trash2
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Badge, Button, Card, CardHeader, IconButton, Input } from '../../components/ui';

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
    <Card className="space-y-5">
      <CardHeader
        icon={Truck}
        title={language === 'ar' ? 'حسابات السائقين' : 'Fahrerkonten'}
        description={language === 'ar'
          ? 'كل سائق يملك اسماً ورمز دخول (PIN) خاصاً به لتسجيل الدخول إلى واجهة السائق (/driver). كل تسجيل دخول يحتاج أيضاً موافقة المشرف.'
          : 'Jeder Fahrer hat einen eigenen Namen und PIN zum Einloggen im Lieferportal (/driver). Jeder Login benötigt zusätzlich die Freigabe eines Admins.'}
      />

      {driverMessage && (
        <p className="text-xs text-success-600 dark:text-success-400 font-semibold">{driverMessage}</p>
      )}
      {driverError && (
        <p className="text-xs text-danger-600 dark:text-danger-400 font-semibold">{driverError}</p>
      )}

      {/* Freshly generated/reset PIN — shown exactly once, never stored in plaintext. */}
      {revealedPin && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-warning-50 dark:bg-warning-950/40 border border-warning-200 dark:border-warning-900/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <Lock className="w-4 h-4 text-warning-600 dark:text-warning-400 shrink-0" />
            <p className="text-xs text-warning-900 dark:text-warning-200">
              <span className="font-bold">{revealedPin.name}</span>
              {': '}
              <span className="font-mono text-sm font-extrabold tracking-widest">{revealedPin.pin}</span>
              <span className="block text-[11px] font-semibold mt-0.5 text-warning-700 dark:text-warning-400">
                {language === 'ar' ? 'انسخه الآن، لن يظهر مرة أخرى' : 'Jetzt notieren — wird nicht erneut angezeigt'}
              </span>
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setRevealedPin(null)} className="shrink-0 !text-warning-800 dark:!text-warning-300">
            {language === 'ar' ? 'إغلاق' : 'Schließen'}
          </Button>
        </div>
      )}

      {/* Add driver — not a <form>, the whole page is already one <form onSubmit={handleSubmit}>. */}
      <div className="flex flex-wrap items-end gap-2.5">
        <div className="flex-1 min-w-[160px]">
          <Input
            label={language === 'ar' ? 'اسم السائق الجديد' : 'Name des neuen Fahrers'}
            type="text"
            value={newDriverName}
            onChange={(e) => setNewDriverName(e.target.value)}
            placeholder={language === 'ar' ? 'مثال: أحمد' : 'z.B. Ahmed'}
          />
        </div>
        <Button icon={Plus} loading={creatingDriver} onClick={handleCreateDriver}>
          {language === 'ar' ? 'إضافة سائق' : 'Fahrer hinzufügen'}
        </Button>
      </div>

      {/* Driver list */}
      {driversLoading ? (
        <p className="text-xs text-slate-500">{language === 'ar' ? 'جارٍ التحميل...' : 'Wird geladen...'}</p>
      ) : drivers.length === 0 ? (
        <p className="text-xs text-slate-500">{language === 'ar' ? 'لا يوجد سائقون بعد.' : 'Noch keine Fahrer angelegt.'}</p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-gray-800 rounded-xl border border-slate-200/70 dark:border-gray-800 overflow-hidden">
          {drivers.map((driver) => (
            <div key={driver.id} className="flex items-center justify-between gap-3 ps-3 pe-1 py-1 bg-white dark:bg-gray-900">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{driver.name}</span>
                  <Badge tone={driver.active ? 'success' : 'neutral'}>
                    {driver.active
                      ? (language === 'ar' ? 'مفعل' : 'Aktiv')
                      : (language === 'ar' ? 'معطل' : 'Deaktiviert')}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <IconButton
                  icon={RefreshCw}
                  label={language === 'ar' ? 'إعادة تعيين الرمز' : 'PIN zurücksetzen'}
                  disabled={busyDriverId === driver.id}
                  onClick={() => handleResetDriverPin(driver)}
                />
                <IconButton
                  icon={Power}
                  label={driver.active ? (language === 'ar' ? 'تعطيل' : 'Deaktivieren') : (language === 'ar' ? 'تفعيل' : 'Aktivieren')}
                  disabled={busyDriverId === driver.id}
                  onClick={() => handleToggleDriverActive(driver)}
                  className={driver.active ? '!text-warning-600 dark:!text-warning-400' : '!text-success-600 dark:!text-success-400'}
                />
                {!driver.active && (
                  <IconButton
                    icon={Trash2}
                    label={language === 'ar' ? 'حذف' : 'Löschen'}
                    disabled={busyDriverId === driver.id}
                    onClick={() => handleDeleteDriver(driver)}
                    className="!text-danger-600 dark:!text-danger-400 hover:!bg-danger-50 dark:hover:!bg-danger-950/40"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
