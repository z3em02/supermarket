import { useEffect, useState, useMemo } from 'react';
import axios from '../utils/adminAxios';
import { getApiUrl } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { 
  Users, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Phone, 
  Mail, 
  MapPin, 
  ShoppingBag, 
  Calendar, 
  Trash2, 
  X, 
  ExternalLink,
  ShieldCheck, 
  Clock, 
  Check, 
  Truck, 
  Package, 
  FileText,
  DollarSign,
  UserCheck,
  AlertCircle
} from 'lucide-react';

export const Customers = () => {
  const { t, language } = useLanguage();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('all'); // 'all' | 'both' | 'phone' | 'email' | 'unverified'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'orders' | 'revenue' | 'name'
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      const response = await axios.get(`${apiUrl}/api/customer-auth/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(response.data)) {
        setCustomers(response.data);
      } else {
        setCustomers([]);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError(err.response?.data?.error || err.message || 'Fehler beim Laden der Kunden');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleDeleteCustomer = async (id, name) => {
    const confirmMsg = language === 'ar'
      ? `هل أنت متأكد من رغبتك في حذف العميل "${name}"؟`
      : `Möchten Sie den Kunden "${name}" wirklich löschen?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setDeletingId(id);
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      await axios.delete(`${apiUrl}/api/customer-auth/customers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(prev => Array.isArray(prev) ? prev.filter(c => c.id !== id) : []);
      if (selectedCustomer?.id === id) {
        setSelectedCustomer(null);
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert(error.response?.data?.error || t('error'));
    } finally {
      setDeletingId(null);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    if (!Array.isArray(customers)) {
      return { total: 0, phoneVerified: 0, emailVerified: 0, bothVerified: 0, totalOrders: 0, totalRevenue: 0 };
    }
    const total = customers.length;
    let phoneVerified = 0;
    let emailVerified = 0;
    let bothVerified = 0;
    let totalOrders = 0;
    let totalRevenue = 0;

    customers.forEach(c => {
      if (c.phoneVerified) phoneVerified += 1;
      if (c.emailVerified) emailVerified += 1;
      if (c.phoneVerified && c.emailVerified) bothVerified += 1;
      totalOrders += c.totalOrders || c.orders?.length || 0;
      totalRevenue += Number(c.totalSpent || 0);
    });

    return { total, phoneVerified, emailVerified, bothVerified, totalOrders, totalRevenue };
  }, [customers]);

  // Filtering & Sorting
  const filteredCustomers = useMemo(() => {
    if (!Array.isArray(customers)) return [];
    return customers.filter(c => {
      // Search
      const search = searchTerm.toLowerCase().trim();
      const matchesSearch = !search ||
        (c.name && c.name.toLowerCase().includes(search)) ||
        (c.email && c.email.toLowerCase().includes(search)) ||
        (c.phone && c.phone.toLowerCase().includes(search)) ||
        (c.city && c.city.toLowerCase().includes(search)) ||
        (c.postalCode && c.postalCode.toLowerCase().includes(search)) ||
        (c.street && c.street.toLowerCase().includes(search));

      // Verification filter
      let matchesVerification = true;
      if (verificationFilter === 'both') {
        matchesVerification = c.phoneVerified && c.emailVerified;
      } else if (verificationFilter === 'phone') {
        matchesVerification = c.phoneVerified;
      } else if (verificationFilter === 'email') {
        matchesVerification = c.emailVerified;
      } else if (verificationFilter === 'unverified') {
        matchesVerification = !c.phoneVerified || !c.emailVerified;
      }

      return matchesSearch && matchesVerification;
    }).sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (sortBy === 'orders') {
        return (b.totalOrders || 0) - (a.totalOrders || 0);
      } else if (sortBy === 'revenue') {
        return (b.totalSpent || 0) - (a.totalSpent || 0);
      } else if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
    });
  }, [customers, searchTerm, verificationFilter, sortBy]);

  const getOrderStatusBadge = (status) => {
    const s = status?.toLowerCase();
    switch (s) {
      case 'accepted':
        return { label: language === 'ar' ? 'مقبول' : 'Angenommen', classes: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300' };
      case 'preparing':
        return { label: language === 'ar' ? 'قيد التحضير' : 'In Vorbereitung', classes: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300' };
      case 'shipped':
      case 'out_for_delivery':
        return { label: language === 'ar' ? 'في الطريق' : 'In Zustellung', classes: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300' };
      case 'delivered':
        return { label: language === 'ar' ? 'تم التوصيل' : 'Geliefert', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300' };
      case 'declined':
      case 'rejected':
        return { label: language === 'ar' ? 'مرفوض' : 'Abgelehnt', classes: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300' };
      default:
        return { label: language === 'ar' ? 'قيد الانتظار' : 'Ausstehend', classes: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-gray-800 dark:text-slate-300' };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {language === 'ar' ? 'إدارة العملاء' : 'Kundenverwaltung'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
                {language === 'ar' 
                  ? 'قائمة العملاء المسجلين، التحقق من الهاتف والبريد، وعناوين التوصيل المنزلي' 
                  : 'Registrierte Privatkunden, Verifizierungsstatus & Lieferadressen für Hauszustellung'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchCustomers}
          className="w-full sm:w-auto justify-center px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5 touch-manipulation"
        >
          <span>{language === 'ar' ? 'تحديث البيانات' : 'Aktualisieren'}</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchCustomers}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer touch-manipulation self-end sm:self-auto"
          >
            {language === 'ar' ? 'إعادة المحاولة' : 'Erneut versuchen'}
          </button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-gray-850 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
              {language === 'ar' ? 'إجمالي العملاء' : 'Gesamte Kunden'}
            </span>
            <div className="p-1.5 sm:p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
              <Users className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
            {metrics.total}
          </p>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">
            {metrics.bothVerified} {language === 'ar' ? 'موثق بالكامل' : 'voll verifiziert'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-gray-850 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
              {language === 'ar' ? 'هاتف موثق' : 'Handy verifiziert'}
            </span>
            <div className="p-1.5 sm:p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
              <Phone className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {metrics.phoneVerified}
          </p>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">
            {metrics.total ? Math.round((metrics.phoneVerified / metrics.total) * 100) : 0}% {language === 'ar' ? 'نسبة التحقق' : 'Verifizierungsquote'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-gray-850 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
              {language === 'ar' ? 'بريد موثق' : 'E-Mail verifiziert'}
            </span>
            <div className="p-1.5 sm:p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
              <Mail className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2">
            {metrics.emailVerified}
          </p>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">
            {metrics.total ? Math.round((metrics.emailVerified / metrics.total) * 100) : 0}% {language === 'ar' ? 'تأكيد بالبريد' : 'E-Mail Bestätigt'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-gray-850 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
              {language === 'ar' ? 'إجمالي المبيعات' : 'Kundenumsatz'}
            </span>
            <div className="p-1.5 sm:p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-lg shrink-0">
              <DollarSign className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-2 font-mono truncate">
            €{metrics.totalRevenue.toFixed(2)}
          </p>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">
            {metrics.totalOrders} {language === 'ar' ? 'إجمالي الطلبات' : 'Bestellungen gesamt'}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-gray-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-gray-850 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={language === 'ar' ? 'البحث بالاسم، الهاتف، البريد أو المدينة...' : 'Name, Telefon, E-Mail, Adresse oder Stadt suchen...'}
            className="w-full ps-10 pe-9 py-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Verification Filter & Sort */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex items-center gap-2">
          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="w-full md:w-auto px-3 py-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
          >
            <option value="all">{language === 'ar' ? 'كل حالات التحقق' : 'Alle Verifizierungen'}</option>
            <option value="both">{language === 'ar' ? 'موثق بالكامل (هاتف + بريد)' : 'Voll verifiziert (Handy + E-Mail)'}</option>
            <option value="phone">{language === 'ar' ? 'هاتف موثق فقط' : 'Handy verifiziert'}</option>
            <option value="email">{language === 'ar' ? 'بريد موثق فقط' : 'E-Mail verifiziert'}</option>
            <option value="unverified">{language === 'ar' ? 'غير موثق بالكامل' : 'Unvollständig verifiziert'}</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full md:w-auto px-3 py-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
          >
            <option value="newest">{language === 'ar' ? 'الأحدث تسجيلاً' : 'Neueste zuerst'}</option>
            <option value="orders">{language === 'ar' ? 'الأعلى طلباً' : 'Meiste Bestellungen'}</option>
            <option value="revenue">{language === 'ar' ? 'الأعلى إنفاقاً' : 'Höchster Umsatz'}</option>
            <option value="name">{language === 'ar' ? 'الاسم (أ-ي)' : 'Name (A-Z)'}</option>
          </select>
        </div>
      </div>

      {/* Customer List Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-850 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Users className="w-12 h-12 text-slate-300 dark:text-gray-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {language === 'ar' ? 'لم يتم العثور على عملاء' : 'Keine Kunden gefunden'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {searchTerm 
                ? (language === 'ar' ? 'جرّب تعديل كلمة البحث' : 'Passen Sie Ihre Suchfilter an')
                : (language === 'ar' ? 'لم يقم أي عميل بالتسجيل بعد' : 'Es haben sich noch keine Kunden registriert')}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Cards View (< md) */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-gray-850">
              {filteredCustomers.map((cust) => {
                const initials = (cust.name || 'K')
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                const addressStr = [
                  cust.street && `${cust.street} ${cust.houseNumber || ''}`.trim(),
                  cust.postalCode && cust.city && `${cust.postalCode} ${cust.city}`.trim(),
                  cust.floorApartment && `Etage: ${cust.floorApartment}`
                ].filter(Boolean).join(', ');

                return (
                  <div key={cust.id} className="p-4 space-y-3">
                    {/* Header Row: Avatar, Name, and Actions */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 dark:text-white text-sm truncate">
                            {cust.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span>{new Date(cust.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setSelectedCustomer(cust)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-semibold text-xs transition cursor-pointer flex items-center gap-1 touch-manipulation"
                          title={language === 'ar' ? 'عرض الطلبات' : 'Bestellungen ansehen'}
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{language === 'ar' ? 'عرض' : 'Details'}</span>
                        </button>

                        <button
                          disabled={deletingId === cust.id}
                          onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer touch-manipulation"
                          title={language === 'ar' ? 'حذف العميل' : 'Kunde löschen'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Contact & Verification Row */}
                    <div className="grid grid-cols-1 gap-1.5 bg-slate-50 dark:bg-gray-950/60 rounded-xl p-2.5 border border-slate-100 dark:border-gray-800 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-700 dark:text-gray-300 font-mono truncate inline-flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{cust.phone || '—'}</span>
                        </span>
                        {cust.phoneVerified ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-850 text-[10px] font-bold shrink-0">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>{language === 'ar' ? 'موثق' : 'Verifiziert'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-850 text-[10px] font-bold shrink-0">
                            <AlertCircle className="w-2.5 h-2.5" />
                            <span>{language === 'ar' ? 'غير موثق' : 'Offen'}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-600 dark:text-gray-300 truncate inline-flex items-center gap-1.5 min-w-0" title={cust.email}>
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{cust.email}</span>
                        </span>
                        {cust.emailVerified ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-850 text-[10px] font-bold shrink-0">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>{language === 'ar' ? 'موثق' : 'Verifiziert'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-850 text-[10px] font-bold shrink-0">
                            <AlertCircle className="w-2.5 h-2.5" />
                            <span>{language === 'ar' ? 'غير موثق' : 'Offen'}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delivery Address */}
                    {addressStr && (
                      <div className="text-xs text-slate-700 dark:text-gray-300 flex items-start gap-1.5 px-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-800 dark:text-slate-200 break-words">{addressStr}</p>
                          {cust.deliveryNotes && (
                            <p className="text-[11px] text-slate-400 italic mt-0.5 break-words">
                              Hinweis: {cust.deliveryNotes}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Stats Footer */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-gray-800">
                      <button
                        onClick={() => setSelectedCustomer(cust)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-xs font-bold text-slate-800 dark:text-slate-200 transition cursor-pointer flex items-center gap-1.5 touch-manipulation"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{cust.totalOrders} {language === 'ar' ? 'طلبات' : 'Bestellungen'}</span>
                      </button>
                      <div className="text-end font-mono">
                        <span className="text-[11px] text-slate-400 me-1">{language === 'ar' ? 'الإنفاق:' : 'Umsatz:'}</span>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                          €{(cust.totalSpent || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-start" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                <thead className="bg-slate-50/80 dark:bg-gray-850 text-[11px] uppercase tracking-wider text-slate-500 dark:text-gray-400 border-b border-slate-100 dark:border-gray-800">
                  <tr>
                    <th className="px-5 py-3.5 text-start">{language === 'ar' ? 'العميل' : 'Kunde'}</th>
                    <th className="px-5 py-3.5 text-start">{language === 'ar' ? 'بيانات الاتصال والتحقق' : 'Kontakt & Verifizierung'}</th>
                    <th className="px-5 py-3.5 text-start">{language === 'ar' ? 'عنوان التوصيل' : 'Lieferadresse'}</th>
                    <th className="px-5 py-3.5 text-center">{language === 'ar' ? 'الطلبات والإنفاق' : 'Bestellungen & Umsatz'}</th>
                    <th className="px-5 py-3.5 text-end">{language === 'ar' ? 'الإجراءات' : 'Aktionen'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-850">
                  {filteredCustomers.map((cust) => {
                    const initials = (cust.name || 'K')
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);

                    const addressStr = [
                      cust.street && `${cust.street} ${cust.houseNumber || ''}`.trim(),
                      cust.postalCode && cust.city && `${cust.postalCode} ${cust.city}`.trim(),
                      cust.floorApartment && `Etage: ${cust.floorApartment}`
                    ].filter(Boolean).join(', ');

                    return (
                      <tr key={cust.id} className="hover:bg-slate-50/70 dark:hover:bg-gray-850/50 transition">
                        {/* Customer Name & Initials */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                              {initials}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white text-sm">
                                {cust.name}
                              </p>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(cust.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact & Verification Badges */}
                        <td className="px-5 py-4">
                          <div className="space-y-1.5 text-xs">
                            {/* Phone */}
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className="text-slate-700 dark:text-gray-300 inline-flex items-center gap-1.5">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{cust.phone || '—'}</span>
                              </span>
                              {cust.phoneVerified ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-850 text-[10px] font-bold">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  <span>{language === 'ar' ? 'موثق' : 'Verifiziert'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-850 text-[10px] font-bold">
                                  <AlertCircle className="w-2.5 h-2.5" />
                                  <span>{language === 'ar' ? 'غير موثق' : 'Offen'}</span>
                                </span>
                              )}
                            </div>

                            {/* Email */}
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-gray-300">
                              <span className="truncate max-w-xs inline-flex items-center gap-1.5 min-w-0" title={cust.email}>
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{cust.email}</span>
                              </span>
                              {cust.emailVerified ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-850 text-[10px] font-bold">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  <span>{language === 'ar' ? 'موثق' : 'Verifiziert'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-850 text-[10px] font-bold">
                                  <AlertCircle className="w-2.5 h-2.5" />
                                  <span>{language === 'ar' ? 'غير موثق' : 'Offen'}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Delivery Address */}
                        <td className="px-5 py-4 max-w-xs">
                          <div className="text-xs text-slate-700 dark:text-gray-300 leading-relaxed">
                            {addressStr ? (
                              <div className="flex items-start gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-medium text-slate-800 dark:text-slate-200">{addressStr}</p>
                                  {cust.deliveryNotes && (
                                    <p className="text-[11px] text-slate-400 italic mt-0.5">
                                      Hinweis: {cust.deliveryNotes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">{language === 'ar' ? 'لم يُحدد عنوان' : 'Keine Adresse hinterlegt'}</span>
                            )}
                          </div>
                        </td>

                        {/* Order Count & Total Spent */}
                        <td className="px-5 py-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <button
                              onClick={() => setSelectedCustomer(cust)}
                              className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-xs font-bold text-slate-800 dark:text-slate-200 transition cursor-pointer flex items-center gap-1.5"
                            >
                              <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{cust.totalOrders} {language === 'ar' ? 'طلبات' : 'Bestellungen'}</span>
                            </button>
                            <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1">
                              €{(cust.totalSpent || 0).toFixed(2)}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-end">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedCustomer(cust)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-semibold text-xs transition cursor-pointer flex items-center gap-1"
                              title={language === 'ar' ? 'عرض الطلبات' : 'Bestellungen ansehen'}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>{language === 'ar' ? 'عرض' : 'Details'}</span>
                            </button>

                            <button
                              disabled={deletingId === cust.id}
                              onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                              title={language === 'ar' ? 'حذف العميل' : 'Kunde löschen'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Customer Orders & Profile Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90dvh] overflow-y-auto border border-slate-200 dark:border-gray-800 shadow-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b border-slate-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-xs shrink-0">
                  {selectedCustomer.name?.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                    {selectedCustomer.name}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 truncate flex items-center gap-1.5 flex-wrap">
                    <span>{selectedCustomer.email}</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{selectedCustomer.phone}</span>
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition cursor-pointer touch-manipulation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Address summary */}
            <div className="mt-3.5 sm:mt-4 p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200/80 dark:border-gray-800 text-xs space-y-1">
              <p className="font-bold text-slate-700 dark:text-slate-300">
                {language === 'ar' ? 'عنوان التوصيل المسجل:' : 'Lieferadresse:'}
              </p>
              <p className="text-slate-600 dark:text-slate-400 break-words leading-relaxed">
                {[
                  selectedCustomer.street && `${selectedCustomer.street} ${selectedCustomer.houseNumber || ''}`.trim(),
                  selectedCustomer.postalCode && selectedCustomer.city && `${selectedCustomer.postalCode} ${selectedCustomer.city}`.trim(),
                  selectedCustomer.floorApartment && `Apt/Floor: ${selectedCustomer.floorApartment}`
                ].filter(Boolean).join(', ') || 'Keine Adresse'}
              </p>
              {selectedCustomer.deliveryNotes && (
                <p className="text-slate-500 italic mt-1 break-words">
                  Hinweis: {selectedCustomer.deliveryNotes}
                </p>
              )}
            </div>

            {/* Orders Table */}
            <div className="mt-4 sm:mt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-2.5 sm:mb-3">
                {language === 'ar' ? 'سجل طلبات العميل' : 'Bestellhistorie'} ({selectedCustomer.orders?.length || 0})
              </h4>

              {(!selectedCustomer.orders || selectedCustomer.orders.length === 0) ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  {language === 'ar' ? 'لا توجد طلبات مسجلة لهذا العميل حتى الآن' : 'Dieser Kunde hat noch keine Bestellungen getätigt.'}
                </p>
              ) : (
                <div className="space-y-2.5 sm:space-y-3">
                  {selectedCustomer.orders.map((ord) => {
                    const badge = getOrderStatusBadge(ord.status);
                    return (
                      <div
                        key={ord.id}
                        className="p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2.5 sm:gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              #{ord.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.classes}`}>
                              {badge.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {new Date(ord.createdAt).toLocaleDateString()} um {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        <div className="text-start xs:text-end">
                          <span className="font-black text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                            €{Number(ord.totalAmount).toFixed(2)}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {ord.orderItems?.length || 0} {language === 'ar' ? 'عناصر' : 'Artikel'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-5 sm:mt-6 pt-3.5 sm:pt-4 border-t border-slate-100 dark:border-gray-800 flex justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer touch-manipulation"
              >
                {t('close') || 'Schließen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
