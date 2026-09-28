import { useState, useEffect } from 'react';
import { getApiUrl } from '../../utils/api';
import axios from '../../utils/adminAxios';
import { useLanguage } from '../../context/LanguageContext';

export const useSectionPasscode = () => {
  const { language } = useLanguage();

  // Section passcode (Settings/Buchhaltung/Kunden/Aktionen gate)
  const [passcodeIsSet, setPasscodeIsSet] = useState(null);
  const [showPasscodeForm, setShowPasscodeForm] = useState(false);
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [passcodeMessage, setPasscodeMessage] = useState('');
  const [savingPasscode, setSavingPasscode] = useState(false);

  useEffect(() => {
    const fetchPasscodeStatus = async () => {
      try {
        const apiUrl = getApiUrl();
        const res = await axios.get(`${apiUrl}/api/settings/passcode-status`);
        setPasscodeIsSet(res.data.isSet);
      } catch (err) {
        console.error('Error fetching passcode status:', err);
      }
    };
    fetchPasscodeStatus();
  }, []);

  const handleSavePasscode = async (e) => {
    e.preventDefault();
    setPasscodeError('');
    setPasscodeMessage('');
    if (!/^\d{4,8}$/.test(newPasscode)) {
      setPasscodeError(language === 'ar' ? 'يجب أن يتكون الرمز من 4 إلى 8 أرقام' : 'Der PIN muss 4–8 Ziffern haben');
      return;
    }
    if (newPasscode !== confirmPasscode) {
      setPasscodeError(language === 'ar' ? 'الرمزان غير متطابقين' : 'Die PINs stimmen nicht überein');
      return;
    }
    if (passcodeIsSet && !/^\d{4,8}$/.test(currentPasscode)) {
      setPasscodeError(language === 'ar' ? 'يرجى إدخال الرمز الحالي' : 'Bitte aktuellen PIN eingeben');
      return;
    }
    try {
      setSavingPasscode(true);
      const apiUrl = getApiUrl();
      await axios.put(`${apiUrl}/api/settings/passcode`, { passcode: newPasscode, currentPasscode: passcodeIsSet ? currentPasscode : undefined });
      setPasscodeIsSet(true);
      setShowPasscodeForm(false);
      setNewPasscode('');
      setConfirmPasscode('');
      setCurrentPasscode('');
      setPasscodeMessage(language === 'ar' ? 'تم حفظ الرمز بنجاح' : 'PIN erfolgreich gespeichert');
    } catch (err) {
      setPasscodeError(err.response?.data?.error || (language === 'ar' ? 'حدث خطأ' : 'Ein Fehler ist aufgetreten'));
    } finally {
      setSavingPasscode(false);
    }
  };

  const handleRemovePasscode = async () => {
    const promptText = language === 'ar' ? 'أدخل الرمز الحالي لإزالة الحماية' : 'Aktuellen PIN zum Entfernen eingeben';
    const entered = window.prompt(promptText);
    if (entered === null) return;
    try {
      setSavingPasscode(true);
      const apiUrl = getApiUrl();
      await axios.put(`${apiUrl}/api/settings/passcode`, { passcode: null, currentPasscode: entered });
      setPasscodeIsSet(false);
      setPasscodeMessage(language === 'ar' ? 'تمت إزالة الرمز' : 'PIN entfernt');
    } catch (err) {
      setPasscodeError(err.response?.data?.error || (language === 'ar' ? 'حدث خطأ' : 'Ein Fehler ist aufgetreten'));
    } finally {
      setSavingPasscode(false);
    }
  };

  return {
    passcodeIsSet,
    setPasscodeIsSet,
    showPasscodeForm,
    setShowPasscodeForm,
    newPasscode,
    setNewPasscode,
    confirmPasscode,
    setConfirmPasscode,
    currentPasscode,
    setCurrentPasscode,
    passcodeError,
    setPasscodeError,
    passcodeMessage,
    setPasscodeMessage,
    savingPasscode,
    setSavingPasscode,
    handleSavePasscode,
    handleRemovePasscode
  };
};
