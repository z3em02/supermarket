import { useState, useEffect } from 'react';
import { getApiUrl } from '../../utils/api';
import axios from '../../utils/adminAxios';
import { useLanguage } from '../../context/LanguageContext';

export const useDeliveryWindows = () => {
  const { language } = useLanguage();

  // Delivery time windows (admin-configurable options offered at checkout)
  const [deliveryWindows, setDeliveryWindows] = useState([]);
  const [loadingWindows, setLoadingWindows] = useState(true);
  const [newStartHour, setNewStartHour] = useState('10');
  const [newEndHour, setNewEndHour] = useState('12');
  const [windowError, setWindowError] = useState('');
  const [savingWindowId, setSavingWindowId] = useState(null);

  const fetchDeliveryWindows = async () => {
    try {
      setLoadingWindows(true);
      const apiUrl = getApiUrl();
      const res = await axios.get(`${apiUrl}/api/delivery-windows`);
      setDeliveryWindows(res.data);
    } catch (err) {
      console.error('Error fetching delivery windows:', err);
    } finally {
      setLoadingWindows(false);
    }
  };

  useEffect(() => {
    fetchDeliveryWindows();
  }, []);

  const handleAddDeliveryWindow = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setWindowError('');
    const start = parseInt(newStartHour, 10);
    const end = parseInt(newEndHour, 10);
    if (isNaN(start) || isNaN(end) || start < 0 || start > 23 || end < 1 || end > 24 || end <= start) {
      setWindowError(
        language === 'ar'
          ? 'يرجى إدخال ساعات صحيحة (من 0 إلى 23، وإلى 1 إلى 24، مع أن تكون النهاية بعد البداية).'
          : 'Bitte gültige Stunden eingeben (Von 0–23, Bis 1–24, Ende muss nach Start liegen).'
      );
      return;
    }
    try {
      const apiUrl = getApiUrl();
      await axios.post(
        `${apiUrl}/api/delivery-windows`,
        { startHour: start, endHour: end, sortOrder: deliveryWindows.length }
      );
      await fetchDeliveryWindows();
      setNewStartHour('10');
      setNewEndHour('12');
    } catch (err) {
      setWindowError(err.response?.data?.error || (language === 'ar' ? 'فشل إضافة الوقت' : 'Fehler beim Hinzufügen'));
    }
  };

  const handleToggleDeliveryWindow = async (win) => {
    setSavingWindowId(win.id);
    try {
      const apiUrl = getApiUrl();
      await axios.put(
        `${apiUrl}/api/delivery-windows/${win.id}`,
        { isActive: !win.isActive }
      );
      setDeliveryWindows((prev) => prev.map((w) => (w.id === win.id ? { ...w, isActive: !w.isActive } : w)));
    } catch (err) {
      console.error('Error toggling delivery window:', err);
    } finally {
      setSavingWindowId(null);
    }
  };

  const handleDeleteDeliveryWindow = async (id) => {
    if (!window.confirm(language === 'ar' ? 'هل تريد حذف هذا الوقت؟' : 'Dieses Zeitfenster löschen?')) return;
    try {
      const apiUrl = getApiUrl();
      await axios.delete(`${apiUrl}/api/delivery-windows/${id}`);
      setDeliveryWindows((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      console.error('Error deleting delivery window:', err);
    }
  };

  return {
    deliveryWindows,
    setDeliveryWindows,
    loadingWindows,
    setLoadingWindows,
    newStartHour,
    setNewStartHour,
    newEndHour,
    setNewEndHour,
    windowError,
    setWindowError,
    savingWindowId,
    setSavingWindowId,
    fetchDeliveryWindows,
    handleAddDeliveryWindow,
    handleToggleDeliveryWindow,
    handleDeleteDeliveryWindow
  };
};
