import { useState, useEffect } from 'react';
import { getApiUrl } from '../../utils/api';
import axios from '../../utils/adminAxios';
import { useLanguage } from '../../context/LanguageContext';
import { useConfirm } from '../../context/FeedbackContext';

// Driver accounts (each courier has their own name + PIN), managed on the
// Settings page.
export const useDriverAccounts = () => {
  const { language } = useLanguage();
  const confirm = useConfirm();

  // Driver accounts (each courier now has their own name + PIN, instead of
  // one PIN shared by everyone) — managed from this page.
  const [drivers, setDrivers] = useState([]);
  const [driversLoading, setDriversLoading] = useState(true);
  const [driverError, setDriverError] = useState('');
  const [driverMessage, setDriverMessage] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [creatingDriver, setCreatingDriver] = useState(false);

  // A PIN is only ever shown once, right after it's generated (create or
  // reset) — the backend never returns pinHash, so this is the one chance
  // to relay it to the driver.
  const [revealedPin, setRevealedPin] = useState(null); // { driverId, name, pin }
  const [busyDriverId, setBusyDriverId] = useState(null);

  const fetchDrivers = async () => {
    try {
      const apiUrl = getApiUrl();
      const res = await axios.get(`${apiUrl}/api/settings/drivers`);
      setDrivers(res.data);
    } catch (err) {
      console.error('Error fetching drivers:', err);
    } finally {
      setDriversLoading(false);
    }
  };

  useEffect(() => { fetchDrivers(); }, []);

  const handleCreateDriver = async (e) => {
    e.preventDefault();
    setDriverError('');
    setDriverMessage('');
    const cleanName = newDriverName.trim();
    if (!cleanName) {
      setDriverError(language === 'ar' ? 'يرجى إدخال اسم السائق' : 'Bitte Fahrername eingeben');
      return;
    }
    try {
      setCreatingDriver(true);
      const apiUrl = getApiUrl();
      const res = await axios.post(`${apiUrl}/api/settings/drivers`, { name: cleanName });
      setNewDriverName('');
      await fetchDrivers();
      if (res.data.pin) {
        setRevealedPin({ driverId: res.data.id, name: res.data.name, pin: res.data.pin });
      }
      setDriverMessage(language === 'ar' ? 'تم إنشاء حساب السائق' : 'Fahrerkonto erstellt');
    } catch (err) {
      setDriverError(err.response?.data?.error || (language === 'ar' ? 'حدث خطأ' : 'Ein Fehler ist aufgetreten'));
    } finally {
      setCreatingDriver(false);
    }
  };

  const handleToggleDriverActive = async (driver) => {
    setDriverError('');
    setDriverMessage('');
    try {
      setBusyDriverId(driver.id);
      const apiUrl = getApiUrl();
      await axios.put(`${apiUrl}/api/settings/drivers/${driver.id}`, { active: !driver.active });
      await fetchDrivers();
    } catch (err) {
      setDriverError(err.response?.data?.error || (language === 'ar' ? 'حدث خطأ' : 'Ein Fehler ist aufgetreten'));
    } finally {
      setBusyDriverId(null);
    }
  };

  const handleResetDriverPin = async (driver) => {
    setDriverError('');
    setDriverMessage('');
    try {
      setBusyDriverId(driver.id);
      const apiUrl = getApiUrl();
      const res = await axios.post(`${apiUrl}/api/settings/drivers/${driver.id}/reset-pin`, {});
      if (res.data.pin) {
        setRevealedPin({ driverId: driver.id, name: driver.name, pin: res.data.pin });
      }
      setDriverMessage(language === 'ar' ? 'تم إنشاء رمز جديد' : 'Neuer PIN erstellt');
    } catch (err) {
      setDriverError(err.response?.data?.error || (language === 'ar' ? 'حدث خطأ' : 'Ein Fehler ist aufgetreten'));
    } finally {
      setBusyDriverId(null);
    }
  };

  const handleDeleteDriver = async (driver) => {
    const confirmText = language === 'ar'
      ? `هل تريد حذف السائق "${driver.name}"؟`
      : `Fahrer "${driver.name}" wirklich löschen?`;
    if (!(await confirm({ message: confirmText, confirmText: language === 'ar' ? 'حذف' : 'Löschen', variant: 'danger' }))) return;
    setDriverError('');
    setDriverMessage('');
    try {
      setBusyDriverId(driver.id);
      const apiUrl = getApiUrl();
      await axios.delete(`${apiUrl}/api/settings/drivers/${driver.id}`);
      await fetchDrivers();
    } catch (err) {
      setDriverError(err.response?.data?.error || (language === 'ar' ? 'حدث خطأ' : 'Ein Fehler ist aufgetreten'));
    } finally {
      setBusyDriverId(null);
    }
  };

  return {
    drivers,
    setDrivers,
    driversLoading,
    setDriversLoading,
    driverError,
    setDriverError,
    driverMessage,
    setDriverMessage,
    newDriverName,
    setNewDriverName,
    creatingDriver,
    setCreatingDriver,
    revealedPin,
    setRevealedPin,
    busyDriverId,
    setBusyDriverId,
    fetchDrivers,
    handleCreateDriver,
    handleToggleDriverActive,
    handleResetDriverPin,
    handleDeleteDriver
  };
};
