import { useEffect, useState, useMemo } from 'react';
import axios from '../utils/adminAxios';
import { getApiUrl } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { Users, AlertCircle } from 'lucide-react';
import { CustomerDetailModal } from './customers/CustomerDetailModal';
import { CustomerTable } from './customers/CustomerTable';
import { CustomerFilters } from './customers/CustomerFilters';
import { CustomerStats } from './customers/CustomerStats';

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
  const [revealedIds, setRevealedIds] = useState(new Set());

  const isRevealed = (id) => revealedIds.has(id);
  const toggleReveal = (id) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError('');
      const apiUrl = getApiUrl();
      const response = await axios.get(`${apiUrl}/api/customer-auth/customers`);
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
      const apiUrl = getApiUrl();
      await axios.delete(`${apiUrl}/api/customer-auth/customers/${id}`);
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
      <CustomerStats metrics={metrics} />

      {/* Filter & Search Bar */}
      <CustomerFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setSortBy={setSortBy}
        setVerificationFilter={setVerificationFilter}
        sortBy={sortBy}
        verificationFilter={verificationFilter}
      />

      {/* Customer List Table */}
      <CustomerTable
        deletingId={deletingId}
        filteredCustomers={filteredCustomers}
        handleDeleteCustomer={handleDeleteCustomer}
        isRevealed={isRevealed}
        loading={loading}
        searchTerm={searchTerm}
        setSelectedCustomer={setSelectedCustomer}
        toggleReveal={toggleReveal}
      />

      {/* Customer Orders & Profile Modal */}
      {selectedCustomer && (
        <CustomerDetailModal getOrderStatusBadge={getOrderStatusBadge} selectedCustomer={selectedCustomer} setSelectedCustomer={setSelectedCustomer} />
      )}
    </div>
  );
};
