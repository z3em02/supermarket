import { useEffect, useState } from 'react';
import axios from '../utils/adminAxios';
import { getApiUrl } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { ScrollText, Eye, Download, RefreshCw } from 'lucide-react';

const ACTION_LABELS = {
  VIEW_CUSTOMERS: { de: 'Kundenliste angesehen', ar: 'تم عرض قائمة العملاء', icon: Eye },
  EXPORT_ACCOUNTING: { de: 'Buchhaltung exportiert', ar: 'تم تصدير المحاسبة', icon: Download }
};

export const AuditLog = () => {
  const { language } = useLanguage();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEntries = async () => {
    try {
      setLoading(true);
      setError('');
      const apiUrl = getApiUrl();
      const res = await axios.get(`${apiUrl}/api/audit-log`);
      setEntries(res.data);
    } catch (err) {
      console.error('Error fetching audit log:', err);
      setError(language === 'ar' ? 'فشل تحميل السجل' : 'Fehler beim Laden des Protokolls');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEntries(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-700 to-slate-900 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 dark:border dark:border-gray-800 text-white rounded-2xl p-5 sm:p-8 shadow-lg">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2.5">
            <ScrollText className="w-6 h-6" />
            {language === 'ar' ? 'سجل الوصول' : 'Zugriffsprotokoll'}
          </h1>
          <p className="text-slate-300 mt-1 text-xs sm:text-sm">
            {language === 'ar' ? 'من عرض أو صدّر بيانات العملاء، ومتى' : 'Wer Kundendaten angesehen oder exportiert hat, und wann'}
          </p>
        </div>
        <button
          onClick={fetchEntries}
          className="flex items-center gap-2 self-start sm:self-auto bg-white/15 hover:bg-white/25 backdrop-blur px-3.5 py-2 rounded-xl text-sm font-medium transition cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          {language === 'ar' ? 'تحديث' : 'Aktualisieren'}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-850 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <p className="text-sm text-rose-600 dark:text-rose-400 p-6">{error}</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-400 p-6">{language === 'ar' ? 'لا توجد سجلات بعد' : 'Noch keine Einträge'}</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-gray-850">
            {entries.map((entry) => {
              const meta = ACTION_LABELS[entry.action];
              const Icon = meta?.icon || Eye;
              return (
                <div key={entry.id} className="flex items-center gap-3 px-4 sm:px-6 py-3.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-gray-100 truncate">
                      {meta ? (language === 'ar' ? meta.ar : meta.de) : entry.action}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-gray-500 truncate">
                      {entry.adminEmail}{entry.detail ? ` · ${entry.detail}` : ''}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-gray-500 shrink-0">
                    {new Date(entry.createdAt).toLocaleString(language === 'ar' ? 'ar-DE' : 'de-DE')}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
