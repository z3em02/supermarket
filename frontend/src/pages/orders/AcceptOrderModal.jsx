import { useLanguage } from '../../context/LanguageContext';
import { Button, Modal, Select } from '../../components/ui';

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
  const isAr = language === 'ar';
  const close = () => { setAcceptModalOrder(null); setAcceptModalDriver(''); };

  return (
    <Modal
      isOpen
      onClose={close}
      size="sm"
      title={isAr ? 'قبول الطلب وتعيين السائق' : 'Bestellung annehmen & Fahrer zuweisen'}
      description={<span className="font-mono">Order #{acceptModalOrder.id.slice(0, 8)}</span>}
      footer={(
        <>
          <Button variant="secondary" onClick={close}>{isAr ? 'إلغاء' : 'Abbrechen'}</Button>
          <Button disabled={!acceptModalDriver} loading={acceptingOrder} onClick={handleConfirmAccept}>
            {acceptingOrder
              ? (isAr ? 'جارٍ...' : 'Wird bestätigt...')
              : (isAr ? 'قبول وتعيين' : 'Annehmen & zuweisen')}
          </Button>
        </>
      )}
    >
      <Select
        label={isAr ? 'السائق *' : 'Fahrer *'}
        hint={knownDriverNames.length === 0
          ? (isAr
            ? 'لا يوجد سائقون معروفون بعد. يجب على سائق تسجيل الدخول عبر /driver مرة واحدة على الأقل.'
            : 'Noch kein Fahrer bekannt. Ein Fahrer muss sich mindestens einmal über /driver anmelden.')
          : undefined}
        value={acceptModalDriver}
        onChange={(e) => setAcceptModalDriver(e.target.value)}
      >
        <option value="">
          {isAr ? '— اختر السائق —' : '— Fahrer auswählen —'}
        </option>
        {knownDriverNames.map((name) => (
          <option key={name} value={name}>
            {name}{!activeDrivers.some((s) => s.driverName === name) ? (isAr ? ' (غير متصل)' : ' (offline)') : ''}
          </option>
        ))}
      </Select>
    </Modal>
  );
};
