import { useEffect, useState, useMemo } from 'react';
import axios from '../utils/adminAxios';
import { getApiUrl } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import {
  ScrollText,
  Eye,
  Download,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  ShoppingBag,
  Package,
  Layers,
  KeyRound,
  Tag,
  Sparkles,
  AlertTriangle,
  UserX,
  FileEdit,
  Clock,
  UserCheck,
  ChevronDown
} from 'lucide-react';

const ACTION_DEFINITIONS = {
  // Authentication & Security
  ADMIN_LOGIN: {
    de: 'Admin-Anmeldung (2FA)',
    ar: 'تسجيل دخول المشرف (2FA)',
    category: 'auth',
    icon: ShieldCheck,
    color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800'
  },
  ADMIN_CHANGE_PASSWORD: {
    de: 'Admin-Passwort geändert',
    ar: 'تم تغيير كلمة مرور المشرف',
    category: 'auth',
    icon: KeyRound,
    color: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800'
  },
  SET_SECTION_PASSCODE: {
    de: 'Bereichs-PIN geändert',
    ar: 'تم تحديث رمز PIN للأقسام',
    category: 'security',
    icon: KeyRound,
    color: 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800'
  },
  REMOVE_SECTION_PASSCODE: {
    de: 'Bereichs-PIN entfernt',
    ar: 'تمت إزالة رمز PIN للأقسام',
    category: 'security',
    icon: AlertTriangle,
    color: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800'
  },

  // Customers
  VIEW_CUSTOMERS: {
    de: 'Kundenliste eingesehen',
    ar: 'تم عرض قائمة العملاء',
    category: 'customers',
    icon: Eye,
    color: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800'
  },
  DELETE_CUSTOMER: {
    de: 'Kundenkonto gelöscht',
    ar: 'تم حذف حساب العميل',
    category: 'customers',
    icon: UserX,
    color: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800'
  },

  // Orders
  ADMIN_CREATE_ORDER: {
    de: 'Bestellung im Auftrag erstellt',
    ar: 'تم إنشاء طلب بالنيابة عن العميل',
    category: 'orders',
    icon: ShoppingBag,
    color: 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800'
  },
  UPDATE_ORDER_STATUS: {
    de: 'Bestellstatus geändert',
    ar: 'تم تغيير حالة الطلب',
    category: 'orders',
    icon: RefreshCw,
    color: 'text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800'
  },
  EDIT_ORDER: {
    de: 'Bestellung angepasst',
    ar: 'تم تعديل عناصر الطلب',
    category: 'orders',
    icon: FileEdit,
    color: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800'
  },
  DELETE_ORDER_REJECTED: {
    de: 'Löschversuch abgewiesen (§ 132 BAO)',
    ar: 'محاولة حذف مرفوضة (متطلبات الاحتفاظ القانوني)',
    category: 'orders',
    icon: AlertTriangle,
    color: 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800'
  },

  // Products & Inventory
  CREATE_PRODUCT: {
    de: 'Produkt angelegt',
    ar: 'تمت إضافة منتج جديد',
    category: 'catalog',
    icon: Package,
    color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800'
  },
  UPDATE_PRODUCT: {
    de: 'Produkt bearbeitet',
    ar: 'تم تعديل بيانات المنتج',
    category: 'catalog',
    icon: FileEdit,
    color: 'text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
  },
  UPDATE_STOCK: {
    de: 'Lagerbestand angepasst',
    ar: 'تم تحديث كمية المخزون',
    category: 'catalog',
    icon: Layers,
    color: 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800'
  },
  DELETE_PRODUCT: {
    de: 'Produkt entfernt',
    ar: 'تم حذف المنتج من النظام',
    category: 'catalog',
    icon: AlertTriangle,
    color: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800'
  },

  // Coupons & Promotions
  CREATE_COUPON: {
    de: 'Gutscheincode erstellt',
    ar: 'تم إنشاء كود خصم جديد',
    category: 'promotions',
    icon: Tag,
    color: 'text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 border-violet-200 dark:border-violet-800'
  },
  UPDATE_COUPON: {
    de: 'Gutscheincode bearbeitet',
    ar: 'تم تعديل كود الخصم',
    category: 'promotions',
    icon: Tag,
    color: 'text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 border-violet-200 dark:border-violet-800'
  },
  DELETE_COUPON: {
    de: 'Gutscheincode gelöscht',
    ar: 'تم حذف كود الخصم',
    category: 'promotions',
    icon: Tag,
    color: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800'
  },
  CREATE_PROMOTION: {
    de: 'Aktion / Angebot erstellt',
    ar: 'تم إنشاء عرض ترويجي',
    category: 'promotions',
    icon: Sparkles,
    color: 'text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/60 border-pink-200 dark:border-pink-800'
  },
  UPDATE_PROMOTION: {
    de: 'Aktion / Angebot bearbeitet',
    ar: 'تم تعديل العرض الترويجي',
    category: 'promotions',
    icon: Sparkles,
    color: 'text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/60 border-pink-200 dark:border-pink-800'
  },
  DELETE_PROMOTION: {
    de: 'Aktion / Angebot gelöscht',
    ar: 'تم حذف العرض الترويجي',
    category: 'promotions',
    icon: Sparkles,
    color: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800'
  },

  // Accounting & Settings
  EXPORT_ACCOUNTING: {
    de: 'Buchhaltungsdaten exportiert',
    ar: 'تم تصدير سجل المحاسبة',
    category: 'accounting',
    icon: Download,
    color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800'
  },
  UPDATE_SETTINGS: {
    de: 'Geschäftseinstellungen geändert',
    ar: 'تم تعديل إعدادات المتجر والتوصيل',
    category: 'settings',
    icon: FileEdit,
    color: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800'
  }
};

const CATEGORIES = [
  { id: 'all', de: 'Alle Aktivitäten', ar: 'جميع الأنشطة' },
  { id: 'auth', de: 'Anmeldung & Auth', ar: 'تسجيل الدخول والأمان' },
  { id: 'orders', de: 'Bestellungen', ar: 'الطلبات' },
  { id: 'catalog', de: 'Produkte & Lager', ar: 'المنتجات والمخزون' },
  { id: 'customers', de: 'Kundendaten', ar: 'بيانات العملاء' },
  { id: 'promotions', de: 'Gutscheine & Aktionen', ar: 'الكوبونات والعروض' },
  { id: 'accounting', de: 'Buchhaltung', ar: 'المحاسبة' },
  { id: 'settings', de: 'Einstellungen', ar: 'الإعدادات' }
];

export const AuditLog = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const fetchEntries = async () => {
    try {
      setLoading(true);
      setError('');
      const apiUrl = getApiUrl();
      const res = await axios.get(`${apiUrl}/api/audit-log?limit=200`);
      setEntries(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching audit log:', err);
      setError(isAr ? 'فشل تحميل سجل الأنشطة والوصول' : 'Fehler beim Laden des Prüfprotokolls');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const def = ACTION_DEFINITIONS[entry.action];
      const category = def?.category || 'other';

      if (selectedCategory !== 'all' && category !== selectedCategory) {
        return false;
      }

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase().trim();

      const labelDe = (def?.de || '').toLowerCase();
      const labelAr = (def?.ar || '').toLowerCase();
      const actionName = (entry.action || '').toLowerCase();
      const adminEmail = (entry.adminEmail || '').toLowerCase();
      const detail = (entry.detail || '').toLowerCase();

      return (
        labelDe.includes(q) ||
        labelAr.includes(q) ||
        actionName.includes(q) ||
        adminEmail.includes(q) ||
        detail.includes(q)
      );
    });
  }, [entries, selectedCategory, searchTerm]);

  // Quick Statistics
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = entries.filter((e) => new Date(e.createdAt) >= today).length;
    const loginsCount = entries.filter((e) => e.action === 'ADMIN_LOGIN').length;
    const mutationsCount = entries.filter((e) =>
      ['UPDATE_ORDER_STATUS', 'EDIT_ORDER', 'CREATE_PRODUCT', 'UPDATE_PRODUCT', 'UPDATE_STOCK', 'DELETE_PRODUCT', 'UPDATE_SETTINGS', 'SET_SECTION_PASSCODE'].includes(e.action)
    ).length;

    return { total: entries.length, today: todayCount, logins: loginsCount, mutations: mutationsCount };
  }, [entries]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-800 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 sm:p-8 shadow-lg border border-slate-700/60 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md shrink-0">
              <ScrollText className="w-5 h-5 text-indigo-300" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              {isAr ? 'سجل العمليات والتدقيق الأمني' : 'Audit- & Zugriffsprotokoll'}
            </h1>
          </div>
          <p className="text-slate-300 mt-2 text-xs sm:text-sm max-w-2xl leading-relaxed">
            {isAr
              ? 'سجل مركزي غير قابل للتلاعب لجميع عمليات الإدارة، بما في ذلك تسجيلات الدخول وتعديل الطلبات والأسعار والمخزون، والاطلاع على بيانات العملاء طبقاً لمعايير الخصوصية.'
              : 'Vollständiger Nachweis aller administrativen Aktionen: Anmeldungen, Statusänderungen, Preis- & Lagerkorrekturen sowie Zugriffe auf Kundendaten gemäß DSGVO-Nachweispflicht.'}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchEntries}
          disabled={loading}
          className="flex items-center justify-center gap-2 self-start sm:self-auto bg-white/15 hover:bg-white/25 active:bg-white/30 backdrop-blur px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer disabled:opacity-50 touch-manipulation"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{isAr ? 'تحديث السجل' : 'Aktualisieren'}</span>
        </button>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-slate-200/80 dark:border-gray-800 shadow-2xs">
          <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
            {isAr ? 'إجمالي السجلات' : 'Protokolleinträge'}
          </p>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            {stats.total}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-slate-200/80 dark:border-gray-800 shadow-2xs">
          <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
            {isAr ? 'عمليات اليوم' : 'Aktionen heute'}
          </p>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.today}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-slate-200/80 dark:border-gray-800 shadow-2xs">
          <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
            {isAr ? 'جلسات تسجيل الدخول' : 'Admin-Anmeldungen'}
          </p>
          <p className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {stats.logins}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-slate-200/80 dark:border-gray-800 shadow-2xs">
          <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
            {isAr ? 'تعديلات البيانات' : 'Datenänderungen'}
          </p>
          <p className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {stats.mutations}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-gray-800 shadow-2xs space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isAr ? 'بحث في السجل بالمسؤول، الإجراء، أو التفاصيل...' : 'Im Protokoll suchen nach Admin, Aktion, Detail...'}
              className="w-full ps-10 pe-4 py-2.5 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Category Dropdown */}
          <div className="sm:w-64 relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full appearance-none px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {isAr ? cat.ar : cat.de}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute end-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Quick Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer touch-manipulation ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-slate-600 dark:text-gray-300'
                }`}
              >
                {isAr ? cat.ar : cat.de}
              </button>
            );
          })}
        </div>
      </div>

      {/* Audit Log Entries List */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-56 space-y-3">
            <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-indigo-600" />
            <p className="text-xs text-slate-400">{isAr ? 'جارٍ تحميل السجلات...' : 'Protokolle werden geladen...'}</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{error}</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <ScrollText className="w-10 h-10 mx-auto text-slate-300 dark:text-gray-700" />
            <h3 className="font-bold text-slate-800 dark:text-gray-200 text-sm">
              {isAr ? 'لا توجد سجلات مطابقة' : 'Keine Protokolleinträge gefunden'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {isAr ? 'جرب تغيير فئة الفلتر أو مصطلح البحث أعلاه.' : 'Passen Sie Ihre Suche oder den gewählten Filter an.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-gray-800/80">
            {filteredEntries.map((entry) => {
              const def = ACTION_DEFINITIONS[entry.action];
              const Icon = def?.icon || ShieldCheck;
              const badgeColor = def?.color || 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-gray-800 border-slate-200 dark:border-gray-700';

              const actionTitle = def ? (isAr ? def.ar : def.de) : entry.action;

              const entryDate = new Date(entry.createdAt);
              const formattedDate = entryDate.toLocaleDateString(isAr ? 'ar-EG' : 'de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              });
              const formattedTime = entryDate.toLocaleTimeString(isAr ? 'ar-EG' : 'de-DE', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });

              return (
                <div
                  key={entry.id}
                  className="p-4 sm:px-6 hover:bg-slate-50/70 dark:hover:bg-gray-850/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border ${badgeColor}`}>
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {actionTitle}
                        </span>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-gray-700">
                          {entry.action}
                        </span>
                      </div>

                      {entry.detail && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 break-words leading-relaxed">
                          {entry.detail}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-gray-500">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {entry.adminEmail}
                        </span>
                        <span>&bull;</span>
                        <span className="sm:hidden">{formattedDate} - {formattedTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Timestamp Desktop */}
                  <div className="hidden sm:flex flex-col items-end shrink-0 text-end">
                    <span className="text-xs font-bold text-slate-700 dark:text-gray-300 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {formattedTime}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-gray-500">
                      {formattedDate}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
