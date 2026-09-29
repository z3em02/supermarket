import { useLanguage } from '../../context/LanguageContext';
import { Users, Phone, Mail, DollarSign } from 'lucide-react';

export const CustomerStats = ({
  metrics
}) => {
  const { language } = useLanguage();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-gray-850 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
            {language === 'ar' ? 'إجمالي العملاء' : 'Gesamte Kunden'}
          </span>
          <div className="p-1.5 sm:p-2 bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 rounded-lg shrink-0">
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
          <div className="p-1.5 sm:p-2 bg-success-50 dark:bg-success-950/60 text-success-600 dark:text-success-400 rounded-lg shrink-0">
            <Phone className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
          </div>
        </div>
        <p className="text-xl sm:text-2xl font-black text-success-600 dark:text-success-400 mt-2">
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
          <div className="p-1.5 sm:p-2 bg-promo-50 dark:bg-promo-950/60 text-promo-600 dark:text-promo-400 rounded-lg shrink-0">
            <Mail className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
          </div>
        </div>
        <p className="text-xl sm:text-2xl font-black text-promo-600 dark:text-promo-400 mt-2">
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
          <div className="p-1.5 sm:p-2 bg-warning-50 dark:bg-warning-950/60 text-warning-600 dark:text-warning-400 rounded-lg shrink-0">
            <DollarSign className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
          </div>
        </div>
        <p className="text-xl sm:text-2xl font-black text-warning-600 dark:text-warning-400 mt-2 font-mono truncate">
          €{metrics.totalRevenue.toFixed(2)}
        </p>
        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">
          {metrics.totalOrders} {language === 'ar' ? 'إجمالي الطلبات' : 'Bestellungen gesamt'}
        </p>
      </div>
    </div>
  );
};
