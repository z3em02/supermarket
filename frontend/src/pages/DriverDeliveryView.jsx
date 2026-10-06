import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from '../utils/adminAxios';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  Truck,
  Clock,
  CheckCircle2,
  Search,
  Calendar,
  Layers,
  Check
} from 'lucide-react';
import { todayIso, parseDeliverySlot } from '../utils/deliverySlot';
import { DriverConfirmModal } from './driver/DriverConfirmModal';
import { DriverOrderCard } from './driver/DriverOrderCard';
import { DriverLoginScreen } from './driver/DriverLoginScreen';
import { DriverHeader } from './driver/DriverHeader';
import { useStatusBadge } from './orders/useStatusBadge';
import { useToast } from '../context/FeedbackContext';

export const DriverDeliveryView = () => {
  const { language, direction } = useLanguage();
  const toast = useToast();
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
    // Each driver now has their own account (name + individual PIN), so the
    // name can no longer default to a generic "Fahrer" — it has to match a
    // real registered driver.
    if (!inputDriverName.trim()) {
      setLoginError(isAr ? 'يرجى إدخال اسم السائق' : 'Bitte Fahrername eingeben');
      return;
    }
    if (!inputPasscode.trim()) {
      setLoginError(isAr ? 'يرجى إدخال رمز الدخول (PIN)' : 'Bitte Fahrer-PIN eingeben');
      return;
    }

    try {
      setLoggingIn(true);
      const res = await axios.post(`/api/settings/driver/login`, {
        driverName: inputDriverName.trim(),
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
        const res = await axios.get(`/api/settings/driver/login-poll/${pendingPollToken}`);
        if (cancelled) return;

        if (res.data.status === 'approved') {
          // The session itself now lives entirely in the HttpOnly
          // `driver_token` cookie the backend just set — nothing for the
          // frontend to store beyond the display-only driver name/role.
          const { driver } = res.data;
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
      } catch {
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
    // Fire-and-forget: revokes the DriverSession row and clears the HttpOnly
    // driver_token cookie server-side (JS can't clear an HttpOnly cookie
    // itself). Local UI state is cleared immediately regardless of outcome.
    axios.post(`/api/settings/driver/logout`).catch(() => {});
    // Clears any leftover driver_token from before this session moved to an
    // HttpOnly cookie — harmless no-op once nothing is left to remove.
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
      const res = await axios.get(`/api/orders`);
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
      // Only the new line is sent — the backend appends it to the order's
      // current notes, so nothing an admin added meanwhile gets overwritten.
      let driverNote = '';
      const nowStr = new Date().toLocaleString(isAr ? 'ar-EG' : 'de-AT');

      if (targetStatus === 'out_for_delivery') {
        driverNote = isAr
          ? `[السائق انطلق للتوصيل في: ${nowStr}]`
          : `[Fahrer ist unterwegs seit: ${nowStr}]`;
      } else if (targetStatus === 'delivered') {
        const cashNote = order.paymentMethod === 'cash_on_delivery'
          ? (cashCollected
              ? (isAr ? `(تم استلام المبلغ نقداً: €${order.totalAmount?.toFixed(2)})` : `(Barbetrag von €${order.totalAmount?.toFixed(2)} kassiert)`)
              : (isAr ? '(لم يتم استلام المبلغ نقداً)' : '(Kein Barbetrag kassiert)'))
          : '';
        driverNote = isAr
          ? `[تم التسليم بنجاح في: ${nowStr} ${cashNote}]`
          : `[Erfolgreich zugestellt am: ${nowStr} ${cashNote}]`;
      }

      if (customNote.trim()) {
        driverNote += ` - ${customNote.trim()}`;
      }

      await axios.put(`/api/orders/${order.id}/status`, {
        status: targetStatus,
        driverNote: driverNote.trim() || undefined
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
        toast.error(err.response?.data?.error || (isAr ? 'فشل تحديث الحالة' : 'Statusaktualisierung fehlgeschlagen'));
      }
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter logic
  const today = todayIso();
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Exclude declined orders in driver view
      const s = (o.status || '').toLowerCase();
      if (s === 'declined') {
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
        // Ready or on the way: accepted, preparing, out_for_delivery
        if (!['accepted', 'preparing', 'out_for_delivery'].includes(s)) return false;
      } else if (activeTab === 'on_route') {
        if (s !== 'out_for_delivery') return false;
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
      if (['accepted', 'preparing', 'out_for_delivery'].includes(s)) active++;
      if (s === 'out_for_delivery') onRoute++;
      if (s === 'delivered') delivered++;
    });
    return { active, onRoute, delivered, all: orders.length };
  }, [orders]);

  const openMaps = (address) => {
    if (!address) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getStatusBadge = useStatusBadge('driver');


  if (!isAuthenticated) {
    return (
      <DriverLoginScreen
        handleDriverLogin={handleDriverLogin}
        inputDriverName={inputDriverName}
        inputPasscode={inputPasscode}
        isAr={isAr}
        loggingIn={loggingIn}
        loginError={loginError}
        pendingPollToken={pendingPollToken}
        setInputDriverName={setInputDriverName}
        setInputPasscode={setInputPasscode}
        setLoginError={setLoginError}
        setPendingPollToken={setPendingPollToken}
      />
    );
  }

  return (
    <div className={`min-h-screen bg-slate-100 dark:bg-gray-950 text-slate-900 dark:text-gray-100 pb-16 font-sans transition-colors duration-200`} dir={direction}>
      {/* Sticky Mobile Driver Header */}
      <DriverHeader
        activeDisplayName={activeDisplayName}
        driverUser={driverUser}
        fetchOrders={fetchOrders}
        handleDriverLogout={handleDriverLogout}
        isAr={isAr}
        refreshing={refreshing}
      />

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all shadow-sm ${
              activeTab === 'active'
                ? 'bg-success-600 text-white shadow-success-600/20'
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
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all shadow-sm ${
              activeTab === 'on_route'
                ? 'bg-warning-600 text-white shadow-warning-600/20'
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
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all shadow-sm ${
              activeTab === 'delivered'
                ? 'bg-primary-600 text-white shadow-primary-600/20'
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
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all shadow-sm ${
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
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-3 sm:p-4 border border-slate-200/80 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث برقم الطلب، اسم العميل، الهاتف، العنوان...' : 'Suche nach Bestell-Nr., Name, Tel, Adresse...'}
              className="w-full ps-9 pe-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-slate-900 dark:text-gray-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-success-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 -translate-y-1/2 end-3 text-slate-500 hover:text-slate-600 dark:hover:text-gray-200 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={() => setFilterTodayOnly(prev => !prev)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition ${
              filterTodayOnly
                ? 'bg-success-50 border-success-300 text-success-800 dark:bg-success-950/60 dark:border-success-800 dark:text-success-300'
                : 'bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4 text-success-600 dark:text-success-400" />
            <span>{isAr ? 'طلبات موعد اليوم فقط' : 'Nur heutige Liefertermine'}</span>
            {filterTodayOnly && <Check className="w-3.5 h-3.5 text-success-600 dark:text-success-400" />}
          </button>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-[3px] border-success-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-500 dark:text-gray-400">
              {isAr ? 'جاري تحميل جولة التوصيل...' : 'Lade Lieferaufträge...'}
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-10 text-center border border-slate-200/80 dark:border-gray-800 shadow-sm space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-success-50 dark:bg-success-950/50 flex items-center justify-center text-success-600 dark:text-success-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              {isAr ? 'لا توجد طلبات توصيل هنا حالياً' : 'Keine Lieferungen in diesem Bereich'}
            </h3>
            <p className="text-body-muted max-w-sm mx-auto">
              {isAr 
                ? 'جميع الطلبات المسندة إما تم تسليمها أو لا توجد نتائج مطابقة لبحثك الحالي.'
                : 'Alle Aufträge sind bereits erledigt oder entsprechen nicht dem gewählten Filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order, index) => {
              const badge = getStatusBadge(order.status);
              const itemsExpanded = !!expandedItems[order.id];
              const isUpdating = updatingId === order.id;

              return (
                <DriverOrderCard
                  key={order.id}
                  activeDisplayName={activeDisplayName}
                  badge={badge}
                  index={index}
                  isAr={isAr}
                  isUpdating={isUpdating}
                  itemsExpanded={itemsExpanded}
                  openMaps={openMaps}
                  order={order}
                  setConfirmModal={setConfirmModal}
                  setDeliveredCashCollected={setDeliveredCashCollected}
                  toggleExpandItems={toggleExpandItems}
                />
              );
            })}
            </div>
          )}
        </main>

        {/* Confirmation Modal for Driver Actions */}
        {confirmModal && (
          <DriverConfirmModal
            confirmModal={confirmModal}
            deliveredCashCollected={deliveredCashCollected}
            driverNote={driverNote}
            handleUpdateStatus={handleUpdateStatus}
            isAr={isAr}
            setConfirmModal={setConfirmModal}
            setDeliveredCashCollected={setDeliveredCashCollected}
            setDriverNote={setDriverNote}
            updatingId={updatingId}
          />
        )}
      </div>
    );
  };
