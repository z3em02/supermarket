import {
  Users,
  Calendar,
  ExternalLink,
  Trash2,
  Phone,
  EyeOff,
  Eye,
  CheckCircle2,
  AlertCircle,
  Mail,
  MapPin,
  ShoppingBag
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { maskPhone, maskAddress } from './masking';
import { EmptyState, SkeletonList } from '../../components/ui';

export const CustomerTable = ({
  deletingId,
  filteredCustomers,
  handleDeleteCustomer,
  isRevealed,
  loading,
  searchTerm,
  setSelectedCustomer,
  toggleReveal
}) => {
  const { language } = useLanguage();

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-850 shadow-sm overflow-hidden">
      {loading ? (
        <div className="p-4"><SkeletonList variant="table" count={6} columns={5} /></div>
      ) : filteredCustomers.length === 0 ? (
        <EmptyState
          className="border-0 rounded-none"
          icon={Users}
          title={language === 'ar' ? 'لم يتم العثور على عملاء' : 'Keine Kunden gefunden'}
          description={searchTerm
            ? (language === 'ar' ? 'جرّب تعديل كلمة البحث' : 'Passen Sie Ihre Suchfilter an')
            : (language === 'ar' ? 'لم يقم أي عميل بالتسجيل بعد' : 'Es haben sich noch keine Kunden registriert')}
        />
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
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-success-500 to-info-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 dark:text-white text-sm truncate">
                          {cust.name}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>{new Date(cust.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setSelectedCustomer(cust)}
                        className="px-2.5 py-1.5 rounded-lg bg-success-50 hover:bg-success-100 dark:bg-success-950/60 dark:hover:bg-success-900/60 text-success-700 dark:text-success-300 font-semibold text-xs transition cursor-pointer flex items-center gap-1 touch-manipulation"
                        title={language === 'ar' ? 'عرض الطلبات' : 'Bestellungen ansehen'}
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{language === 'ar' ? 'عرض' : 'Details'}</span>
                      </button>

                      <button
                        disabled={deletingId === cust.id}
                        onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/50 transition cursor-pointer touch-manipulation"
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
                        <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>{isRevealed(cust.id) ? (cust.phone || '—') : maskPhone(cust.phone)}</span>
                        <button
                          type="button"
                          onClick={() => toggleReveal(cust.id)}
                          className="p-0.5 rounded text-slate-500 hover:text-slate-700 dark:hover:text-gray-200 cursor-pointer shrink-0"
                          title={isRevealed(cust.id) ? (language === 'ar' ? 'إخفاء' : 'Verbergen') : (language === 'ar' ? 'إظهار' : 'Anzeigen')}
                        >
                          {isRevealed(cust.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </span>
                      {cust.phoneVerified ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-success-50 text-success-700 border border-success-200 dark:bg-success-950/60 dark:text-success-300 dark:border-success-900/60 text-[10px] font-bold shrink-0">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>{language === 'ar' ? 'موثق' : 'Verifiziert'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-warning-50 text-warning-700 border border-warning-200 dark:bg-warning-950/60 dark:text-warning-300 dark:border-warning-900/60 text-[10px] font-bold shrink-0">
                          <AlertCircle className="w-2.5 h-2.5" />
                          <span>{language === 'ar' ? 'غير موثق' : 'Offen'}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-600 dark:text-gray-300 truncate inline-flex items-center gap-1.5 min-w-0" title={cust.email}>
                        <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{cust.email}</span>
                      </span>
                      {cust.emailVerified ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-success-50 text-success-700 border border-success-200 dark:bg-success-950/60 dark:text-success-300 dark:border-success-900/60 text-[10px] font-bold shrink-0">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>{language === 'ar' ? 'موثق' : 'Verifiziert'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-warning-50 text-warning-700 border border-warning-200 dark:bg-warning-950/60 dark:text-warning-300 dark:border-warning-900/60 text-[10px] font-bold shrink-0">
                          <AlertCircle className="w-2.5 h-2.5" />
                          <span>{language === 'ar' ? 'غير موثق' : 'Offen'}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delivery Address */}
                  {addressStr && (
                    <div className="text-xs text-slate-700 dark:text-gray-300 flex items-start gap-1.5 px-1">
                      <MapPin className="w-3.5 h-3.5 text-success-600 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-800 dark:text-slate-200 break-words">{isRevealed(cust.id) ? addressStr : maskAddress(addressStr)}</p>
                        {cust.deliveryNotes && isRevealed(cust.id) && (
                          <p className="text-[11px] text-slate-500 italic mt-0.5 break-words">
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
                      <ShoppingBag className="w-3.5 h-3.5 text-success-600" />
                      <span>{cust.totalOrders} {language === 'ar' ? 'طلبات' : 'Bestellungen'}</span>
                    </button>
                    <div className="text-end font-mono">
                      <span className="text-[11px] text-slate-500 me-1">{language === 'ar' ? 'الإنفاق:' : 'Umsatz:'}</span>
                      <span className="text-xs font-black text-success-600 dark:text-success-400">
                        €{(cust.totalSpent || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-auto max-h-[70vh]">
            <table className="w-full text-sm text-start" dir={language === 'ar' ? 'rtl' : 'ltr'}>
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-gray-850 text-[11px] uppercase tracking-wider text-slate-500 dark:text-gray-400 border-b border-slate-100 dark:border-gray-800">
                <tr>
                  <th scope="col" className="px-5 py-3.5 text-start">{language === 'ar' ? 'العميل' : 'Kunde'}</th>
                  <th scope="col" className="px-5 py-3.5 text-start">{language === 'ar' ? 'بيانات الاتصال والتحقق' : 'Kontakt & Verifizierung'}</th>
                  <th scope="col" className="px-5 py-3.5 text-start">{language === 'ar' ? 'عنوان التوصيل' : 'Lieferadresse'}</th>
                  <th scope="col" className="px-5 py-3.5 text-center">{language === 'ar' ? 'الطلبات والإنفاق' : 'Bestellungen & Umsatz'}</th>
                  <th scope="col" className="px-5 py-3.5 text-end">{language === 'ar' ? 'الإجراءات' : 'Aktionen'}</th>
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
                    <tr key={cust.id} className="even:bg-slate-50/60 dark:even:bg-gray-950/40 hover:bg-slate-100/70 dark:hover:bg-gray-850/60 transition">
                      {/* Customer Name & Initials */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-success-500 to-info-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">
                              {cust.name}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
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
                              <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                              <span>{isRevealed(cust.id) ? (cust.phone || '—') : maskPhone(cust.phone)}</span>
                              <button
                                type="button"
                                onClick={() => toggleReveal(cust.id)}
                                className="p-0.5 rounded text-slate-500 hover:text-slate-700 dark:hover:text-gray-200 cursor-pointer shrink-0"
                                title={isRevealed(cust.id) ? (language === 'ar' ? 'إخفاء' : 'Verbergen') : (language === 'ar' ? 'إظهار' : 'Anzeigen')}
                              >
                                {isRevealed(cust.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            </span>
                            {cust.phoneVerified ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-success-50 text-success-700 border border-success-200 dark:bg-success-950/60 dark:text-success-300 dark:border-success-900/60 text-[10px] font-bold">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>{language === 'ar' ? 'موثق' : 'Verifiziert'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-warning-50 text-warning-700 border border-warning-200 dark:bg-warning-950/60 dark:text-warning-300 dark:border-warning-900/60 text-[10px] font-bold">
                                <AlertCircle className="w-2.5 h-2.5" />
                                <span>{language === 'ar' ? 'غير موثق' : 'Offen'}</span>
                              </span>
                            )}
                          </div>

                          {/* Email */}
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-gray-300">
                            <span className="truncate max-w-xs inline-flex items-center gap-1.5 min-w-0" title={cust.email}>
                              <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate">{cust.email}</span>
                            </span>
                            {cust.emailVerified ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-success-50 text-success-700 border border-success-200 dark:bg-success-950/60 dark:text-success-300 dark:border-success-900/60 text-[10px] font-bold">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>{language === 'ar' ? 'موثق' : 'Verifiziert'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-warning-50 text-warning-700 border border-warning-200 dark:bg-warning-950/60 dark:text-warning-300 dark:border-warning-900/60 text-[10px] font-bold">
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
                              <MapPin className="w-3.5 h-3.5 text-success-600 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-medium text-slate-800 dark:text-slate-200">{isRevealed(cust.id) ? addressStr : maskAddress(addressStr)}</p>
                                {cust.deliveryNotes && isRevealed(cust.id) && (
                                  <p className="text-[11px] text-slate-500 italic mt-0.5">
                                    Hinweis: {cust.deliveryNotes}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">{language === 'ar' ? 'لم يُحدد عنوان' : 'Keine Adresse hinterlegt'}</span>
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
                            <ShoppingBag className="w-3.5 h-3.5 text-success-600" />
                            <span>{cust.totalOrders} {language === 'ar' ? 'طلبات' : 'Bestellungen'}</span>
                          </button>
                          <span className="text-xs font-mono font-black text-success-600 dark:text-success-400 mt-1">
                            €{(cust.totalSpent || 0).toFixed(2)}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-end">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedCustomer(cust)}
                            className="px-3 py-1.5 rounded-lg bg-success-50 hover:bg-success-100 dark:bg-success-950/60 dark:hover:bg-success-900/60 text-success-700 dark:text-success-300 font-semibold text-xs transition cursor-pointer flex items-center gap-1"
                            title={language === 'ar' ? 'عرض الطلبات' : 'Bestellungen ansehen'}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>{language === 'ar' ? 'عرض' : 'Details'}</span>
                          </button>

                          <button
                            disabled={deletingId === cust.id}
                            onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/50 transition cursor-pointer"
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
  );
};
