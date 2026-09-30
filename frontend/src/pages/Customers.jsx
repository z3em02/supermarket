import { useEffect, useState, useMemo } from 'react';
import axios from '../utils/adminAxios';
import { getApiUrl } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { Users, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui';
import { CustomerDetailModal } from './customers/CustomerDetailModal';
import { CustomerTable } from './customers/CustomerTable';
import { CustomerFilters } from './customers/CustomerFilters';
import { CustomerStats } from './customers/CustomerStats';
import { useStatusBadge } from './orders/useStatusBadge';
import { useToast, useConfirm } from '../context/FeedbackContext';

export const Customers = () => {
  const { t, language } = useLanguage();
  const toast = useToast();
  const confirm = useConfirm();
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
      const response = await axios.get(`${apiUrl}/api/customers`);
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
    if (!(await confirm({ message: confirmMsg, confirmText: t('delete'), variant: 'danger' }))) return;

    try {
      setDeletingId(id);
      const apiUrl = getApiUrl();
      await axios.delete(`${apiUrl}/api/customers/${id}`);
      setCustomers(prev => Array.isArray(prev) ? prev.filter(c => c.id !== id) : []);
      if (selectedCustomer?.id === id) {
        setSelectedCustomer(null);
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error(error.response?.data?.error || t('error'));
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

  const getOrderStatusBadge = useStatusBadge();


  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-success-600 to-info-600 flex items-center justify-center text-white shadow-md shadow-success-500/20 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-heading-xl">
                {language === 'ar' ? 'إدارة العملاء' : 'Kundenverwaltung'}
              </h1>
              <p className="text-body-muted">
                {language === 'ar' 
                  ? 'قائمة العملاء المسجلين، التحقق من الهاتف والبريد، وعناوين التوصيل المنزلي' 
                  : 'Registrierte Privatkunden, Verifizierungsstatus & Lieferadressen für Hauszustellung'}
              </p>
            </div>
          </div>
        </div>

        <Button variant="secondary" icon={RefreshCw} onClick={fetchCustomers} className="w-full sm:w-auto">
          {language === 'ar' ? 'تحديث البيانات' : 'Aktualisieren'}
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-danger-50 border border-danger-200 text-danger-700 dark:bg-danger-950/40 dark:border-danger-900/60 dark:text-danger-300 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="danger" size="sm" onClick={fetchCustomers} className="self-end sm:self-auto">
            {language === 'ar' ? 'إعادة المحاولة' : 'Erneut versuchen'}
          </Button>
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
