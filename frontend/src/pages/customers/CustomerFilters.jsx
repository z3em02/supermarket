import { Search, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Card, IconButton, Input, Select } from '../../components/ui';

export const CustomerFilters = ({
  searchTerm,
  setSearchTerm,
  setSortBy,
  setVerificationFilter,
  sortBy,
  verificationFilter
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  return (
    <Card padding="p-3.5 sm:p-4" className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
      <div className="relative flex-1">
        <Input
          icon={Search}
          type="text"
          aria-label={isAr ? 'بحث' : 'Suche'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={isAr ? 'البحث بالاسم، الهاتف، البريد أو المدينة...' : 'Name, Telefon, E-Mail, Adresse oder Stadt suchen...'}
          className="pe-11"
        />
        {searchTerm && (
          <IconButton icon={X} label={isAr ? 'مسح البحث' : 'Suche leeren'} onClick={() => setSearchTerm('')} className="absolute end-0 top-0" />
        )}
      </div>

      {/* Verification Filter & Sort */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:flex items-center gap-2">
        <Select
          aria-label={isAr ? 'حالة التحقق' : 'Verifizierung'}
          value={verificationFilter}
          onChange={(e) => setVerificationFilter(e.target.value)}
        >
          <option value="all">{isAr ? 'كل حالات التحقق' : 'Alle Verifizierungen'}</option>
          <option value="both">{isAr ? 'موثق بالكامل (هاتف + بريد)' : 'Voll verifiziert (Handy + E-Mail)'}</option>
          <option value="phone">{isAr ? 'هاتف موثق فقط' : 'Handy verifiziert'}</option>
          <option value="email">{isAr ? 'بريد موثق فقط' : 'E-Mail verifiziert'}</option>
          <option value="unverified">{isAr ? 'غير موثق بالكامل' : 'Unvollständig verifiziert'}</option>
        </Select>

        <Select
          aria-label={isAr ? 'ترتيب' : 'Sortierung'}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="newest">{isAr ? 'الأحدث تسجيلاً' : 'Neueste zuerst'}</option>
          <option value="orders">{isAr ? 'الأعلى طلباً' : 'Meiste Bestellungen'}</option>
          <option value="revenue">{isAr ? 'الأعلى إنفاقاً' : 'Höchster Umsatz'}</option>
          <option value="name">{isAr ? 'الاسم (أ-ي)' : 'Name (A-Z)'}</option>
        </Select>
      </div>
    </Card>
  );
};
