import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from '../utils/adminAxios';
import { getApiUrl } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { ADMIN_BASE } from '../config/adminPath';
import { 
  Truck, 
  MapPin, 
  Phone, 
  Clock, 
  CheckCircle2, 
  Package, 
  Navigation, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  AlertCircle, 
  Banknote, 
  CreditCard, 
  FileText, 
  Search, 
  Calendar,
  Layers,
  ArrowLeft,
  Moon,
  Sun,
  Globe,
  Building,
  KeyRound,
  LogOut,
  UserCheck,
  Check,
  Hourglass,
  XCircle
} from 'lucide-react';
import { formatDeliverySlot, todayIso, parseDeliverySlot } from '../utils/deliverySlot';

export const DriverDeliveryView = () => {
  const { language, setLanguage, direction, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { getStoreName } = useStoreSettings();
  const isAr = language === 'ar';

  const { user: adminUser } = useAuth();

  // Driver Authentication state
  const [driverUser, setDriverUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('driver_user') || localStorage.getItem('driver_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = Boolean(adminUser || driverUser);
  const activeDisplayName = adminUser?.name || driverUser?.name || (isAr ? 'سائق' : 'Fahrer');

  const [inputDriverName, setInputDriverName] = useState(() => {
    return localStorage.getItem('driver_name_saved') || '';
  });
  const [inputPasscode, setInputPasscode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  // Login is now a two-step approval flow: a correct PIN only creates a
  // pending request — this holds the pollToken while we wait for an admin
  // to approve/reject it from the dashboard.
  const [pendingPollToken, setPendingPollToken] = useState(null);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active' (to deliver), 'on_route', 'delivered', 'all'
  const [filterTodayOnly, setFilterTodayOnly] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const [confirmModal, setConfirmModal] = useState(null); // { order, action: 'start'|'deliver' }
  const [deliveredCashCollected, setDeliveredCashCollected] = useState(true);
  const [driverNote, setDriverNote] = useState('');

  const handleDriverLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!inputPasscode.trim()) {
      setLoginError(isAr ? 'يرجى إدخال رمز الدخول (PIN)' : 'Bitte Fahrer-PIN eingeben');
      return;
    }

    try {
      setLoggingIn(true);
      const apiUrl = getApiUrl();
      const res = await axios.post(`${apiUrl}/api/settings/driver/login`, {
        driverName: inputDriverName.trim() || (isAr ? 'سائق' : 'Fahrer'),
        passcode: inputPasscode.trim()
      });

      if (inputDriverName.trim()) {
        localStorage.setItem('driver_name_saved', inputDriverName.trim());
      }
      // Correct PIN, but not logged in yet — wait for admin approval.
      setPendingPollToken(res.data.pollToken);
      setInputPasscode('');
    } catch (err) {
      console.error('Driver login error:', err);
      setLoginError(err.response?.data?.error || (isAr ? 'رمز الدخول غير صحيح' : 'Ungültiger Fahrer-PIN'));
    } finally {
      setLoggingIn(false);
    }
  };

  // Polls while pendingPollToken is set; stops on approved/rejected/expired/error.
  useEffect(() => {
    if (!pendingPollToken) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const apiUrl = getApiUrl();
        const res = await axios.get(`${apiUrl}/api/settings/driver/login-poll/${pendingPollToken}`);
        if (cancelled) return;

        if (res.data.status === 'approved') {
          const { token, driver } = res.data;
          sessionStorage.setItem('driver_token', token);
          localStorage.setItem('driver_token', token);
          sessionStorage.setItem('driver_user', JSON.stringify(driver));
          localStorage.setItem('driver_user', JSON.stringify(driver));
          setDriverUser(driver);
          setPendingPollToken(null);
        } else if (res.data.status === 'rejected') {
          setPendingPollToken(null);
          setLoginError(isAr ? 'تم رفض طلب تسجيل الدخول من قبل المشرف' : 'Login wurde vom Administrator abgelehnt');
        } else if (res.data.status === 'expired' || res.data.status === 'not_found') {
          setPendingPollToken(null);
          setLoginError(isAr ? 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى' : 'Anfrage ist abgelaufen. Bitte erneut versuchen');
        }
        // 'pending' — keep polling
      } catch (err) {
        if (!cancelled) {
          setPendingPollToken(null);
          setLoginError(isAr ? 'خطأ في الاتصال أثناء انتظار الموافقة' : 'Verbindungsfehler beim Warten auf Freigabe');
        }
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [pendingPollToken, isAr]);

  const handleDriverLogout = () => {
    sessionStorage.removeItem('driver_token');
    localStorage.removeItem('driver_token');
    sessionStorage.removeItem('driver_user');
    localStorage.removeItem('driver_user');
    setDriverUser(null);
    setInputPasscode('');
    setPendingPollToken(null);
  };

  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const apiUrl = getApiUrl();
      const res = await axios.get(`${apiUrl}/api/orders`);
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load orders for delivery view:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        if (!adminUser) {
          handleDriverLogout();
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, adminUser]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      // Also doubles as the driver's session-validity check: if an admin
      // force-logs this driver out from the Dashboard, the very next one of
      // these calls gets a 401 and fetchOrders() already redirects to the
      // login screen on that — 8s keeps that redirect feeling immediate
      // instead of leaving a revoked driver looking at stale orders for
      // up to a minute.
      const interval = setInterval(() => {
        fetchOrders(true);
      }, 8000);
      // Also re-check the instant the tab regains focus (e.g. phone screen
      // was off) rather than waiting for the next interval tick.
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') fetchOrders(true);
      };
      document.addEventListener('visibilitychange', handleVisibility);
      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchOrders]);

  const toggleExpandItems = (orderId) => {
    setExpandedItems(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const handleUpdateStatus = async (order, targetStatus, cashCollected = true, customNote = '') => {
    setUpdatingId(order.id);
    try {
      const apiUrl = getApiUrl();
      let updatedAdminNotes = order.adminNotes ? `${order.adminNotes}\n` : '';
      const nowStr = new Date().toLocaleString(isAr ? 'ar-EG' : 'de-AT');
      
      if (targetStatus === 'out_for_delivery') {
        updatedAdminNotes += isAr
          ? `[السائق انطلق للتوصيل في: ${nowStr}]`
          : `[Fahrer ist unterwegs seit: ${nowStr}]`;
      } else if (targetStatus === 'delivered') {
        const cashNote = order.paymentMethod === 'cash_on_delivery'
          ? (cashCollected 
              ? (isAr ? `(تم استلام المبلغ نقداً: €${order.totalAmount?.toFixed(2)})` : `(Barbetrag von €${order.totalAmount?.toFixed(2)} kassiert)`)
              : (isAr ? '(لم يتم استلام المبلغ نقداً)' : '(Kein Barbetrag kassiert)'))
          : '';
        updatedAdminNotes += isAr
          ? `[تم التسليم بنجاح في: ${nowStr} ${cashNote}]`
          : `[Erfolgreich zugestellt am: ${nowStr} ${cashNote}]`;
      }

      if (customNote.trim()) {
        updatedAdminNotes += ` - ${customNote.trim()}`;
      }

      await axios.put(`${apiUrl}/api/orders/${order.id}/status`, {
        status: targetStatus,
        adminNotes: updatedAdminNotes.trim()
      });

      // Refresh orders
      await fetchOrders(true);
      setConfirmModal(null);
      setDriverNote('');
    } catch (err) {
      console.error('Error updating delivery status:', err);
      if ((err.response?.status === 401 || err.response?.status === 403) && !adminUser) {
        handleDriverLogout();
      } else {
        alert(err.response?.data?.error || (isAr ? 'فشل تحديث الحالة' : 'Statusaktualisierung fehlgeschlagen'));
      }
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter logic
  const today = todayIso();
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Exclude declined/rejected orders in driver view
      const s = (o.status || '').toLowerCase();
      if (['declined', 'rejected', 'canceled', 'cancelled'].includes(s)) {
        return false;
      }

      // Slot date check if filterTodayOnly
      if (filterTodayOnly && o.deliverySlot) {
        const parsed = parseDeliverySlot(o.deliverySlot);
        if (parsed && parsed.date !== today) {
          return false;
        }
      }

      // Tab filter
      if (activeTab === 'active') {
        // Ready or on the way: accepted, preparing, out_for_delivery, shipped
        if (!['accepted', 'preparing', 'out_for_delivery', 'shipped'].includes(s)) return false;
      } else if (activeTab === 'on_route') {
        if (!['out_for_delivery', 'shipped'].includes(s)) return false;
      } else if (activeTab === 'delivered') {
        if (s !== 'delivered') return false;
      }

      // Search query (Order #, customer name, phone, address, notes)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const idMatch = o.id?.toLowerCase().includes(q);
        const nameMatch = o.customerName?.toLowerCase().includes(q) || o.customer?.name?.toLowerCase().includes(q);
        const phoneMatch = o.customerPhone?.toLowerCase().includes(q) || o.customer?.phone?.toLowerCase().includes(q);
        const addressMatch = o.deliveryAddress?.toLowerCase().includes(q) || o.customer?.address?.toLowerCase().includes(q);
        const notesMatch = o.deliveryNotes?.toLowerCase().includes(q) || o.notes?.toLowerCase().includes(q);
        if (!idMatch && !nameMatch && !phoneMatch && !addressMatch && !notesMatch) {
          return false;
        }
      }

      return true;
    });
  }, [orders, activeTab, filterTodayOnly, today, searchQuery]);

  // Tab count badges
  const counts = useMemo(() => {
    let active = 0;
    let onRoute = 0;
    let delivered = 0;
    orders.forEach(o => {
      const s = (o.status || '').toLowerCase();
      if (['accepted', 'preparing', 'out_for_delivery', 'shipped'].includes(s)) active++;
      if (['out_for_delivery', 'shipped'].includes(s)) onRoute++;
      if (s === 'delivered') delivered++;
    });
    return { active, onRoute, delivered, all: orders.length };
  }, [orders]);

  const openMaps = (address) => {
    if (!address) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'out_for_delivery':
      case 'shipped':
        return {
          bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800',
          label: isAr ? 'في الطريق إليك' : 'Auf dem Weg'
        };
      case 'delivered':
        return {
          bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
          label: isAr ? 'تم التسليم' : 'Zugestellt'
        };
      case 'preparing':
        return {
          bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800',
          label: isAr ? 'قيد التجهيز بالمحل' : 'Wird vorbereitet'
        };
      case 'accepted':
      default:
        return {
          bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-800',
          label: isAr ? 'طلب جديد مؤكد' : 'Bestätigt'
        };
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-gray-950 px-4" dir={direction}>
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 shadow-xl p-6 sm:p-8 space-y-5">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-600 flex items-center justify-center text-white shadow-md">
              <Truck className="w-7 h-7" />
            </div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white">
              {isAr ? 'دخول السائق' : 'Fahrer-Login'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              {getStoreName(language) || 'Supermarkt'}
            </p>
          </div>

          {pendingPollToken ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center animate-pulse">
                <Hourglass className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  {isAr ? 'بانتظار موافقة المشرف...' : 'Warte auf Freigabe durch den Administrator...'}
                </p>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                  {isAr ? 'سيظهر طلبك في لوحة التحكم الخاصة بالمشرف' : 'Deine Anfrage erscheint im Admin-Dashboard'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setPendingPollToken(null); setLoginError(''); }}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200 underline cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Abbrechen'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleDriverLogin} className="space-y-4">
              {loginError && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  {isAr ? 'اسم السائق (اختياري)' : 'Fahrername (optional)'}
                </label>
                <input
                  type="text"
                  value={inputDriverName}
                  onChange={(e) => setInputDriverName(e.target.value)}
                  placeholder={isAr ? 'مثال: أحمد' : 'z.B. Ahmed'}
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  {isAr ? 'رمز السائق (PIN)' : 'Fahrer-PIN'}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={inputPasscode}
                  onChange={(e) => setInputPasscode(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition font-mono tracking-widest"
                />
              </div>
              <button
                type="submit"
                disabled={loggingIn}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {loggingIn ? (isAr ? 'جارٍ الإرسال...' : 'Wird gesendet...') : (isAr ? 'طلب تسجيل الدخول' : 'Login anfragen')}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-100 dark:bg-gray-950 text-slate-900 dark:text-gray-100 pb-16 font-sans transition-colors duration-200`} dir={direction}>
      {/* Sticky Mobile Driver Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-gray-800 shadow-xs px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {adminUser && (
              <Link
                to={`${ADMIN_BASE}/orders`}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 transition"
                title={isAr ? 'العودة لإدارة الطلبات' : 'Zurück zur Bestellübersicht'}
              >
                <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
              </Link>
            )}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white truncate">
                  {isAr ? 'واجهة التوصيل والسائق' : 'Fahrer- & Lieferansicht'}
                </h1>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 uppercase">
                  {isAr ? 'سائق' : 'Driver'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
                {getStoreName(language) || 'Supermarkt'} · {activeDisplayName}
              </p>
            </div>
          </div>

          {/* Quick controls: Language, Darkmode, Refresh */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => fetchOrders(true)}
              disabled={refreshing}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 transition"
              title={isAr ? 'تحديث الطلبات' : 'Aktualisieren'}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 transition"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            <button
              onClick={() => setLanguage(language === 'de' ? 'ar' : 'de')}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-xs font-bold text-slate-700 dark:text-gray-200 transition"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{language === 'de' ? 'العربية' : 'DE'}</span>
            </button>

            {driverUser && !adminUser && (
              <button
                onClick={handleDriverLogout}
                className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 transition"
                title={isAr ? 'تسجيل الخروج' : 'Abmelden'}
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all shadow-xs ${
              activeTab === 'active'
                ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                : 'bg-white dark:bg-gray-900 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 border border-slate-200 dark:border-gray-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{isAr ? 'الطلبات النشطة' : 'Zu liefern'}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
              activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300'
            }`}>
              {counts.active}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('on_route')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all shadow-xs ${
              activeTab === 'on_route'
                ? 'bg-amber-600 text-white shadow-amber-600/20'
                : 'bg-white dark:bg-gray-900 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 border border-slate-200 dark:border-gray-800'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>{isAr ? 'في الطريق' : 'Unterwegs'}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
              activeTab === 'on_route' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300'
            }`}>
              {counts.onRoute}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('delivered')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all shadow-xs ${
              activeTab === 'delivered'
                ? 'bg-blue-600 text-white shadow-blue-600/20'
                : 'bg-white dark:bg-gray-900 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 border border-slate-200 dark:border-gray-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isAr ? 'تم التسليم' : 'Zugestellt'}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
              activeTab === 'delivered' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300'
            }`}>
              {counts.delivered}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all shadow-xs ${
              activeTab === 'all'
                ? 'bg-slate-800 dark:bg-gray-700 text-white'
                : 'bg-white dark:bg-gray-900 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 border border-slate-200 dark:border-gray-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{isAr ? 'الكل' : 'Alle'}</span>
          </button>
        </div>

        {/* Filter Toolbar: Search & Today only toggle */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-3 sm:p-4 border border-slate-200/80 dark:border-gray-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث برقم الطلب، اسم العميل، الهاتف، العنوان...' : 'Suche nach Bestell-Nr., Name, Tel, Adresse...'}
              className="w-full ps-9 pe-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-slate-900 dark:text-gray-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 -translate-y-1/2 end-3 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={() => setFilterTodayOnly(prev => !prev)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition ${
              filterTodayOnly
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300'
                : 'bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{isAr ? 'طلبات موعد اليوم فقط' : 'Nur heutige Liefertermine'}</span>
            {filterTodayOnly && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
          </button>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-500 dark:text-gray-400">
              {isAr ? 'جاري تحميل جولة التوصيل...' : 'Lade Lieferaufträge...'}
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-10 text-center border border-slate-200/80 dark:border-gray-800 shadow-xs space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              {isAr ? 'لا توجد طلبات توصيل هنا حالياً' : 'Keine Lieferungen in diesem Bereich'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 max-w-sm mx-auto">
              {isAr 
                ? 'جميع الطلبات المسندة إما تم تسليمها أو لا توجد نتائج مطابقة لبحثك الحالي.'
                : 'Alle Aufträge sind bereits erledigt oder entsprechen nicht dem gewählten Filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order, index) => {
              const badge = getStatusBadge(order.status);
              const isOutForDelivery = ['out_for_delivery', 'shipped'].includes((order.status || '').toLowerCase());
              const isDelivered = (order.status || '').toLowerCase() === 'delivered';
              const itemsExpanded = !!expandedItems[order.id];
              const isUpdating = updatingId === order.id;

              // Parse customer delivery address & contact details
              const customerName = order.customerName || order.customer?.name || (isAr ? 'عميل' : 'Kunde');
              const customerPhone = order.customerPhone || order.customer?.phone;
              const deliveryAddress = order.deliveryAddress || order.customer?.address || '';
              const deliveryNotes = order.deliveryNotes || order.notes;
              const slotFormatted = order.deliverySlot ? formatDeliverySlot(order.deliverySlot, isAr) : null;
              const totalAmount = typeof order.totalAmount === 'number' ? order.totalAmount.toFixed(2) : '0.00';
              const isCash = order.paymentMethod === 'cash_on_delivery' || !order.paymentMethod;

              return (
                <article 
                  key={order.id}
                  className={`bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md ${
                    isOutForDelivery
                      ? 'border-amber-400/80 dark:border-amber-500/60 ring-2 ring-amber-400/20'
                      : isDelivered
                      ? 'border-slate-200/80 dark:border-gray-800 opacity-80'
                      : 'border-slate-200/90 dark:border-gray-800'
                  }`}
                >
                  {/* Top card banner */}
                  <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-gray-300 font-black text-xs flex items-center justify-center">
                        #{index + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </div>
                        {slotFormatted && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>{slotFormatted}</span>
                          </div>
                        )}
                        {order.assignedDriverName && (
                          <div className={`flex items-center gap-1.5 text-xs font-bold mt-0.5 ${
                            order.assignedDriverName === activeDisplayName
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-slate-400 dark:text-gray-500'
                          }`}>
                            <UserCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {order.assignedDriverName === activeDisplayName
                                ? (isAr ? 'مُعيَّن لك' : 'Dir zugewiesen')
                                : (isAr ? `مُعيَّن لـ ${order.assignedDriverName}` : `Zugewiesen an ${order.assignedDriverName}`)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Price & Cash Badge */}
                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
                        isCash 
                          ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/70 dark:border-amber-800 dark:text-amber-200' 
                          : 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/70 dark:border-emerald-800 dark:text-emerald-200'
                      }`}>
                        {isCash ? <Banknote className="w-4 h-4 text-amber-600 dark:text-amber-400" /> : <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                        <div className="text-right rtl:text-left">
                          <div className="text-xs font-medium leading-none">
                            {isCash 
                              ? (isAr ? 'الدفع نقداً عند الاستلام' : 'Barzahlung bei Erhalt') 
                              : (isAr ? 'مدفوع إلكترونياً' : 'Bereits bezahlt')}
                          </div>
                          <div className="text-sm font-black mt-0.5">
                            €{totalAmount}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Body: Recipient & Location */}
                  <div className="p-4 sm:p-5 space-y-4">
                    {/* Customer Name & Direct Call */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          {isAr ? 'المستلم' : 'Empfänger'}
                        </div>
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                          {customerName}
                        </h2>
                      </div>

                      {customerPhone ? (
                        <a
                          href={`tel:${customerPhone}`}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm transition active:scale-95 shrink-0"
                          title={isAr ? 'اتصال بالعميل' : 'Kunde anrufen'}
                        >
                          <Phone className="w-4 h-4" />
                          <span>{isAr ? 'اتصال' : 'Anrufen'}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-gray-500 italic">
                          {isAr ? 'بدون رقم هاتف' : 'Keine Telefonnummer'}
                        </span>
                      )}
                    </div>

                    {/* Address with One-Tap Maps Button */}
                    <div className="bg-slate-50 dark:bg-gray-800/60 rounded-2xl p-3.5 border border-slate-200/70 dark:border-gray-750 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <MapPin className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                            {deliveryAddress || (isAr ? 'العنوان غير محدد' : 'Keine Adresse hinterlegt')}
                          </p>
                          {order.customer?.floorApartment && (
                            <p className="text-xs font-semibold text-slate-600 dark:text-gray-300 mt-0.5">
                              {isAr ? `الطابق / الشقة: ${order.customer.floorApartment}` : `Stock / Tür: ${order.customer.floorApartment}`}
                            </p>
                          )}
                        </div>
                      </div>

                      {deliveryAddress && (
                        <button
                          type="button"
                          onClick={() => openMaps(deliveryAddress)}
                          className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-xs transition active:scale-95 shrink-0"
                        >
                          <Navigation className="w-4 h-4" />
                          <span>{isAr ? 'فتح في خرائط جوجل' : 'In Google Maps öffnen'}</span>
                        </button>
                      )}
                    </div>

                    {/* Delivery Notes for Driver */}
                    {deliveryNotes && (
                      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl p-3 flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block">
                            {isAr ? 'ملاحظة خاصة للتوصيل:' : 'Wichtiger Lieferhinweis:'}
                          </span>
                          <p className="text-xs text-amber-900 dark:text-amber-200 font-medium whitespace-pre-line mt-0.5">
                            {deliveryNotes}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Collapsible Order Items Checklist */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => toggleExpandItems(order.id)}
                        className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition"
                      >
                        <span className="flex items-center gap-1.5">
                          <Package className="w-4 h-4 text-slate-400" />
                          <span>
                            {isAr 
                              ? `محتويات الطلب (${order.orderItems?.length || 0} صنف)` 
                              : `Warenliste (${order.orderItems?.length || 0} Artikel)`}
                          </span>
                        </span>
                        {itemsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {itemsExpanded && (
                        <div className="mt-2 divide-y divide-slate-100 dark:divide-gray-800 rounded-xl bg-slate-50/70 dark:bg-gray-800/40 p-2 border border-slate-200/60 dark:border-gray-800">
                          {order.orderItems && order.orderItems.length > 0 ? (
                            order.orderItems.map((item, idx) => (
                              <div key={item.id || idx} className="py-1.5 px-2 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                                    {item.quantity}x
                                  </span>
                                  <span className="font-semibold text-slate-800 dark:text-gray-200">
                                    {isAr && item.product?.nameAr ? item.product.nameAr : (item.product?.name || item.productName || item.product?.sku || 'Artikel')}
                                  </span>
                                </div>
                                <span className="font-bold text-slate-600 dark:text-gray-400">
                                  €{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 italic p-2">
                              {isAr ? 'لا توجد تفاصيل للمنتجات' : 'Keine Artikeldetails hinterlegt'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-4 sm:p-5 bg-slate-50 dark:bg-gray-900/80 border-t border-slate-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-slate-500 dark:text-gray-400">
                      {isAr 
                        ? `تاريخ الطلب: ${new Date(order.createdAt).toLocaleDateString('ar-EG')}` 
                        : `Bestellt am: ${new Date(order.createdAt).toLocaleDateString('de-AT')}`}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {!isOutForDelivery && !isDelivered && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => setConfirmModal({ order, action: 'start' })}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm shadow-sm transition active:scale-95 disabled:opacity-50"
                        >
                          <Truck className="w-4 h-4" />
                          <span>{isAr ? 'بدء التوصيل / في الطريق' : 'Fahrt starten (Unterwegs)'}</span>
                        </button>
                      )}

                      {!isDelivered && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => {
                            setDeliveredCashCollected(isCash);
                            setConfirmModal({ order, action: 'deliver' });
                          }}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition active:scale-95 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isAr ? 'تم التسليم بنجاح' : 'Erfolgreich zugestellt'}</span>
                        </button>
                      )}

                      {isDelivered && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isAr ? 'مكتمل ومسلّم' : 'Abgeschlossen & Übergeben'}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
            </div>
          )}
        </main>

        {/* Confirmation Modal for Driver Actions */}
        {confirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-gray-800 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmModal.action === 'deliver' 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {confirmModal.action === 'deliver' ? <CheckCircle2 className="w-6 h-6" /> : <Truck className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {confirmModal.action === 'deliver' 
                      ? (isAr ? 'تأكيد تسليم الطلب' : 'Zustellung bestätigen') 
                      : (isAr ? 'بدء جولة التوصيل' : 'Lieferfahrt starten')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400">
                    #{confirmModal.order.id.slice(0, 8).toUpperCase()} - {confirmModal.order.customerName || (isAr ? 'العميل' : 'Kunde')}
                  </p>
                </div>
              </div>

              {confirmModal.action === 'deliver' ? (
                <div className="space-y-3 pt-2">
                  <p className="text-sm text-slate-700 dark:text-gray-300">
                    {isAr 
                      ? 'هل تم تسليم جميع الأكياس والمنتجات للعميل بنجاح؟' 
                      : 'Wurden alle Artikel und Liefertaschen vollständig an den Kunden übergeben?'}
                  </p>

                  {/* Cash collection checkbox for Cash On Delivery orders */}
                  {(confirmModal.order.paymentMethod === 'cash_on_delivery' || !confirmModal.order.paymentMethod) && (
                    <label className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={deliveredCashCollected}
                        onChange={(e) => setDeliveredCashCollected(e.target.checked)}
                        className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="text-xs">
                        <span className="font-extrabold text-amber-900 dark:text-amber-200 block">
                          {isAr 
                            ? `تم استلام المبلغ نقداً (€${(confirmModal.order.totalAmount || 0).toFixed(2)})` 
                            : `Barbetrag (€${(confirmModal.order.totalAmount || 0).toFixed(2)}) erfolgreich kassiert`}
                        </span>
                        <span className="text-amber-700 dark:text-amber-400">
                          {isAr ? 'يرجى التأكد من عد المبلغ قبل المغادرة' : 'Bitte Geld vor der Abfahrt nachzählen'}
                        </span>
                      </div>
                    </label>
                  )}

                  {/* Optional short driver note */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-gray-400 mb-1">
                      {isAr ? 'ملاحظة تسليم إضافية (اختياري)' : 'Zusätzliche Fahrernotiz (optional)'}
                    </label>
                    <input
                      type="text"
                      value={driverNote}
                      onChange={(e) => setDriverNote(e.target.value)}
                      placeholder={isAr ? 'مثال: تم التسليم للجار / أمام الباب' : 'z.B. Bei Nachbar abgegeben / vor Tür'}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-slate-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-700 dark:text-gray-300 pt-2">
                  {isAr 
                    ? 'سيتم تحديث حالة الطلب إلى "في الطريق" وإرسال إشعار فوري للعميل برقم سيارتك أو باقتراب الوصول.'
                    : 'Der Status wechselt auf „Auf dem Weg“ und der Kunde erhält eine Push-Benachrichtigung über die bevorstehende Ankunft.'}
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmModal(null);
                    setDriverNote('');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 font-bold text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-gray-800 transition"
                >
                  {isAr ? 'إلغاء' : 'Abbrechen'}
                </button>
                <button
                  type="button"
                  disabled={updatingId === confirmModal.order.id}
                  onClick={() => {
                    if (confirmModal.action === 'deliver') {
                      handleUpdateStatus(confirmModal.order, 'delivered', deliveredCashCollected, driverNote);
                    } else {
                      handleUpdateStatus(confirmModal.order, 'out_for_delivery', true, driverNote);
                    }
                  }}
                  className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md transition ${
                    confirmModal.action === 'deliver' 
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' 
                      : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                  }`}
                >
                  {confirmModal.action === 'deliver' 
                    ? (isAr ? 'تأكيد التسليم' : 'Zustellung bestätigen') 
                    : (isAr ? 'انطلاق الآن' : 'Jetzt starten')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
