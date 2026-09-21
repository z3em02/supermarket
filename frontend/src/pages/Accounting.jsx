import { useEffect, useState } from 'react';
import axios from 'axios';
import { getApiUrl } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  DollarSign, 
  TrendingUp, 
  ShoppingCart, 
  Users, 
  Calendar,
  ArrowUp,
  FileSpreadsheet
} from 'lucide-react';

export const Accounting = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [data, setData] = useState({
    summary: {
      totalRevenue: 0,
      totalOrders: 0,
      pendingOrders: 0,
      totalTransactions: 0
    },
    customerSales: [],
    monthlyRevenue: [],
    recentTransactions: []
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const fetchAccountingData = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      const params = {};
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;

      const response = await axios.get(`${apiUrl}/api/accounting/summary`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching accounting data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      const params = {};
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;

      const response = await axios.get(`${apiUrl}/api/accounting/export`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { ...params, format: 'csv' },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'accounting_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting data:', error);
      alert(t('error'));
    }
  };

  const formatCurrency = (value) => `€${Number(value || 0).toFixed(2)}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t('accountingDashboard')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
            {t('financialOverview')}
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium rounded-xl shadow-sm transition cursor-pointer"
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span>{t('exportCSV')}</span>
        </button>
      </div>

      {/* Date Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-slate-200/80 dark:border-gray-850 shadow-sm">
        <div className="flex items-center gap-2 text-slate-400 dark:text-gray-500">
          <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300">
            {t('dateFilter')}:
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-3 py-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
          />
          <span className="text-slate-400 dark:text-gray-500 text-sm">{t('to')}</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-3 py-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
          />
          <button
            onClick={fetchAccountingData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-medium transition cursor-pointer shadow-sm"
          >
            {t('applyFilter')}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-slate-200/80 dark:border-gray-850 shadow-sm hover:border-slate-300 dark:hover:border-gray-750 transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                {t('totalRevenue')}
              </p>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
                {formatCurrency(data.summary.totalRevenue)}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/40 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center mt-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <ArrowUp className="w-3.5 h-3.5 mr-1 rtl:mr-0 rtl:ml-1" />
            <span>{t('totalEarningsBadge')}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-slate-200/80 dark:border-gray-850 shadow-sm hover:border-slate-300 dark:hover:border-gray-750 transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                {t('totalOrders')}
              </p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
                {data.summary.totalOrders}
              </p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 dark:text-blue-400 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/40 rounded-xl">
              <ShoppingCart className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center mt-3 text-xs text-slate-500 dark:text-gray-400">
            <span>{t('completedOrdersBadge')}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-slate-200/80 dark:border-gray-850 shadow-sm hover:border-slate-300 dark:hover:border-gray-750 transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                {t('pendingOrders')}
              </p>
              <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">
                {data.summary.pendingOrders}
              </p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 dark:text-amber-400 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/40 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center mt-3 text-xs text-slate-500 dark:text-gray-400">
            <span>{t('awaitingBadge')}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-slate-200/80 dark:border-gray-850 shadow-sm hover:border-slate-300 dark:hover:border-gray-750 transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                {t('totalTransactions')}
              </p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
                {data.summary.totalTransactions}
              </p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 dark:text-purple-400 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-900/40 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center mt-3 text-xs text-slate-500 dark:text-gray-400">
            <span>{t('transactionsBadge')}</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-slate-200/80 dark:border-gray-850 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            {t('monthlyRevenue')}
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#2a3447' : '#e2e8f0'} opacity={0.6} />
                <XAxis 
                  dataKey="month" 
                  stroke={theme === 'dark' ? '#64748b' : '#94a3b8'}
                  fontSize={12}
                />
                <YAxis 
                  stroke={theme === 'dark' ? '#64748b' : '#94a3b8'}
                  fontSize={12}
                  tickFormatter={(val) => `€${val}`}
                />
                <Tooltip 
                  formatter={(value) => [`€${Number(value).toFixed(2)}`, t('amount')]}
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#111726' : '#ffffff', 
                    borderColor: theme === 'dark' ? '#2a3447' : '#e2e8f0', 
                    borderRadius: '12px', 
                    color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="total_revenue" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#3B82F6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Customers List */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-slate-200/80 dark:border-gray-850 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {t('topCustomers') || 'Top Customers'}
            </h2>
            <div className="space-y-3 overflow-y-auto max-h-64">
              {(data.customerSales || []).map((c, idx) => (
                <div 
                  key={c.customerId || idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200/80 dark:border-gray-800/80"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/70 border border-blue-100 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white text-sm">
                        {c.customerName || 'Kunde'}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-gray-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span>{c.orderCount} {t('ordersCount') || 'Bestellungen'}</span>
                        {c.customerPhone && <span className="font-mono text-[11px] text-slate-500">📞 {c.customerPhone}</span>}
                      </p>
                    </div>
                  </div>
                  <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">
                    {formatCurrency(c.totalSales)}
                  </span>
                </div>
              ))}
              {(!data.customerSales || data.customerSales.length === 0) && (
                <p className="text-sm text-slate-400 dark:text-gray-500 py-6 text-center">{t('noTransactionsFound')}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-850 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-gray-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {t('recentTransactions')}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left rtl:text-right">
            <thead className="bg-slate-50/80 dark:bg-gray-850 text-xs uppercase text-slate-500 dark:text-gray-400 border-b border-slate-100 dark:border-gray-800">
              <tr>
                <th className="px-5 py-3.5">{t('date')}</th>
                <th className="px-5 py-3.5">{t('orderId')}</th>
                <th className="px-5 py-3.5">{t('customer')}</th>
                <th className="px-5 py-3.5">{t('transactionType')}</th>
                <th className="px-5 py-3.5 text-end">{t('amount')}</th>
                <th className="px-5 py-3.5 text-center">{t('status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
              {(data.recentTransactions || []).map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-gray-850/50 transition">
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {new Date(tx.transactionDate || tx.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-400 dark:text-gray-500 whitespace-nowrap">
                    #{(tx.orderId || tx.id)?.slice(0, 8)}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                    {tx.customerName || tx.order?.customerName || tx.order?.customer?.name || 'Kunde'}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 capitalize whitespace-nowrap">
                    {tx.type || 'Barzahlung'}
                  </td>
                  <td className="px-5 py-3.5 text-end font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {formatCurrency(tx.amount)}
                  </td>
                  <td className="px-5 py-3.5 text-center whitespace-nowrap">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900/50 capitalize">
                      {tx.status || t('completed')}
                    </span>
                  </td>
                </tr>
              ))}
              {(!data.recentTransactions || data.recentTransactions.length === 0) && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400 dark:text-gray-500">
                    {t('noTransactionsFound')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};