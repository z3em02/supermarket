import {
  Tag,
  Plus,
  Check,
  Copy,
  Percent,
  Euro,
  Gift,
  Truck,
  Edit2,
  Trash2
} from 'lucide-react';
import { Button, EmptyState, SkeletonList } from '../../components/ui';

export const CouponsTab = ({
  copiedCode,
  filteredCoupons,
  handleCopyCode,
  handleDeleteCoupon,
  handleOpenCreateCoupon,
  handleOpenEditCoupon,
  handleToggleCouponStatus,
  loading
}) => (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-xs overflow-hidden">
      {loading ? (
        <div className="p-4"><SkeletonList variant="table" count={4} columns={5} /></div>
      ) : filteredCoupons.length === 0 ? (
        <EmptyState
          className="border-0 rounded-none"
          icon={Tag}
          title="Keine Gutscheine gefunden"
          description="Erstellen Sie Ihren ersten Gutscheincode, um Ihren Kunden Rabatte oder kostenlose Lieferung zu bieten."
          action={<Button icon={Plus} onClick={handleOpenCreateCoupon}>Gutschein erstellen</Button>}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-gray-950/60 text-xs uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-100 dark:border-gray-800">
              <tr>
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4">Rabatttyp</th>
                <th className="py-3.5 px-4">Vorteile / Perks</th>
                <th className="py-3.5 px-4">Bedingung</th>
                <th className="py-3.5 px-4">Einlösungen</th>
                <th className="py-3.5 px-4">Gültigkeit</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-800/80">
              {filteredCoupons.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-gray-850/50 transition">
                  <td className="py-3.5 px-4 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-gray-800 text-slate-900 dark:text-white font-mono font-bold tracking-wider text-xs border border-slate-200 dark:border-gray-700">
                        {c.code}
                      </span>
                      <button
                        onClick={() => handleCopyCode(c.code)}
                        title="Code kopieren"
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      >
                        {copiedCode === c.code ? (
                          <Check className="w-3.5 h-3.5 text-success-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    {c.description && (
                      <div className="text-xs text-slate-400 mt-1 max-w-xs truncate">{c.description}</div>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    {c.discountType === 'PERCENTAGE' && (
                      <span className="inline-flex items-center gap-1 font-semibold text-primary-600 dark:text-primary-400">
                        <Percent className="w-3.5 h-3.5" />
                        {c.discountValue}% Rabatt
                        {c.maxDiscountAmount && (
                          <span className="text-xs font-normal text-slate-400">(max. €{c.maxDiscountAmount})</span>
                        )}
                      </span>
                    )}
                    {c.discountType === 'FIXED' && (
                      <span className="inline-flex items-center gap-1 font-semibold text-success-600 dark:text-success-400">
                        <Euro className="w-3.5 h-3.5" />€{Number(c.discountValue).toFixed(2)} Rabatt
                      </span>
                    )}
                    {c.discountType === 'COMBO' && (
                      <span className="inline-flex items-center gap-1 font-semibold text-promo-600 dark:text-promo-400">
                        <Gift className="w-3.5 h-3.5" />
                        Kombi {c.discountValue > 0 ? `(€${Number(c.discountValue).toFixed(2)})` : ''}
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1.5">
                      {c.freeShipping && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success-50 text-success-700 dark:bg-success-950/40 dark:text-success-300 border border-success-200 dark:border-success-800">
                          <Truck className="w-3 h-3" /> Gratis Lieferung
                        </span>
                      )}
                      {c.usageLimitPerCustomer && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-300">
                          Max {c.usageLimitPerCustomer}x / Kunde
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-xs">
                    {c.minOrderValue > 0 ? (
                      <span>Min. €{Number(c.minOrderValue).toFixed(2)}</span>
                    ) : (
                      <span className="text-slate-400">Kein Mindestwert</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-900 dark:text-white">{c.usedCount}</span>
                    <span className="text-xs text-slate-400"> / {c.usageLimit ? c.usageLimit : '∞'}</span>
                  </td>

                  <td className="py-3.5 px-4 text-xs text-slate-500">
                    {c.startDate || c.endDate ? (
                      <div>
                        {c.startDate && <div>Ab: {new Date(c.startDate).toLocaleDateString()}</div>}
                        {c.endDate && <div>Bis: {new Date(c.endDate).toLocaleDateString()}</div>}
                      </div>
                    ) : (
                      <span className="text-slate-400">Dauerhaft</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handleToggleCouponStatus(c)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        c.isActive ? 'bg-success-500' : 'bg-slate-300 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          c.isActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEditCoupon(c)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-600 dark:text-slate-300 transition"
                        title="Bearbeiten"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCoupon(c.id)}
                        className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-950/30 text-danger-500 transition"
                        title="Löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
);
