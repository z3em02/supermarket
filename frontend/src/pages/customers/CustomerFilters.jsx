import { Search, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const CustomerFilters = ({
  searchTerm,
  setSearchTerm,
  setSortBy,
  setVerificationFilter,
  sortBy,
  verificationFilter
}) => {
  const { language } = useLanguage();

  return (
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
  );
};
