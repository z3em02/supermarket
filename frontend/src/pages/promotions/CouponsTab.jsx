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
import { Badge, Button, EmptyState, IconButton, SkeletonList, Switch } from '../../components/ui';

// Each piece is shared by the desktop table and the phone card.
const CouponCode = ({ c, copiedCode, onCopy }) => (
  <div className="min-w-0">
    <div className="flex items-center gap-1">
      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-gray-800 text-slate-900 dark:text-white font-mono font-bold tracking-wider text-xs border border-slate-200 dark:border-gray-700">
        {c.code}
      </span>
      <IconButton
        icon={copiedCode === c.code ? Check : Copy}
        label={copiedCode === c.code ? 'Kopiert' : 'Code kopieren'}
        onClick={() => onCopy(c.code)}
        className={copiedCode === c.code ? 'text-success-600 dark:text-success-400' : ''}
      />
    </div>
    {c.description && <div className="text-xs text-slate-500 mt-0.5 max-w-xs truncate">{c.description}</div>}
  </div>
);

const CouponDiscount = ({ c }) => (
  <>
    {c.discountType === 'PERCENTAGE' && (
      <span className="inline-flex flex-wrap items-center gap-1 font-semibold text-primary-600 dark:text-primary-400">
        <Percent className="w-3.5 h-3.5" aria-hidden="true" />
        {c.discountValue}% Rabatt
        {c.maxDiscountAmount && <span className="text-xs font-normal text-slate-500 tabular-nums">(max. €{c.maxDiscountAmount})</span>}
      </span>
    )}
    {c.discountType === 'FIXED' && (
      <span className="inline-flex items-center gap-1 font-semibold text-success-600 dark:text-success-400 tabular-nums">
        <Euro className="w-3.5 h-3.5" aria-hidden="true" />€{Number(c.discountValue).toFixed(2)} Rabatt
      </span>
    )}
    {c.discountType === 'COMBO' && (
      <span className="inline-flex items-center gap-1 font-semibold text-promo-600 dark:text-promo-400 tabular-nums">
        <Gift className="w-3.5 h-3.5" aria-hidden="true" />
        Kombi {c.discountValue > 0 ? `(€${Number(c.discountValue).toFixed(2)})` : ''}
      </span>
    )}
  </>
);

const CouponPerks = ({ c }) => (
  <div className="flex flex-wrap gap-1.5">
    {c.freeShipping && <Badge tone="success" icon={Truck}>Gratis Lieferung</Badge>}
    {c.usageLimitPerCustomer && <Badge>Max {c.usageLimitPerCustomer}x / Kunde</Badge>}
  </div>
);

const MinOrder = ({ c }) => (c.minOrderValue > 0
  ? <span className="tabular-nums">Min. €{Number(c.minOrderValue).toFixed(2)}</span>
  : <span className="text-slate-500">Kein Mindestwert</span>);

const Redemptions = ({ c }) => (
  <span className="tabular-nums">
    <span className="font-semibold text-slate-900 dark:text-white">{c.usedCount}</span>
    <span className="text-xs text-slate-500"> / {c.usageLimit ? c.usageLimit : '∞'}</span>
  </span>
);

const Validity = ({ startDate, endDate }) => (startDate || endDate ? (
  <span className="flex flex-col tabular-nums">
    {startDate && <span>Ab: {new Date(startDate).toLocaleDateString()}</span>}
    {endDate && <span>Bis: {new Date(endDate).toLocaleDateString()}</span>}
  </span>
) : <span>Dauerhaft</span>);

const CouponActions = ({ c, onEdit, onDelete }) => (
  <div className="flex items-center justify-end gap-1">
    <IconButton icon={Edit2} label="Bearbeiten" onClick={() => onEdit(c)} />
    <IconButton icon={Trash2} label="Löschen" onClick={() => onDelete(c.id)}
      className="text-danger-600 dark:text-danger-400 hover:text-danger-700 hover:bg-danger-50 dark:hover:bg-danger-950/30" />
  </div>
);

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
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-sm overflow-hidden">
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
        <>
          {/* Phones: one card per coupon instead of a sideways-scrolling table */}
          <ul className="md:hidden divide-y divide-slate-100 dark:divide-gray-800">
            {filteredCoupons.map((c) => (
              <li key={c.id} className="p-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-start justify-between gap-2">
                  <CouponCode c={c} copiedCode={copiedCode} onCopy={handleCopyCode} />
                  <Switch
                    checked={c.isActive}
                    onChange={() => handleToggleCouponStatus(c)}
                    label={c.isActive ? 'Gutschein deaktivieren' : 'Gutschein aktivieren'}
                  />
                </div>
                <CouponDiscount c={c} />
                <CouponPerks c={c} />
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <dt className="text-slate-500">Bedingung</dt>
                  <dd><MinOrder c={c} /></dd>
                  <dt className="text-slate-500">Einlösungen</dt>
                  <dd><Redemptions c={c} /></dd>
                  <dt className="text-slate-500">Gültigkeit</dt>
                  <dd><Validity startDate={c.startDate} endDate={c.endDate} /></dd>
                </dl>
                <CouponActions c={c} onEdit={handleOpenEditCoupon} onDelete={handleDeleteCoupon} />
              </li>
            ))}
          </ul>

          <div className="hidden md:block overflow-auto max-h-[70vh]">
            <table className="w-full text-start text-sm text-slate-600 dark:text-slate-300">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-gray-900 text-xs uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100 dark:border-gray-800">
                <tr>
                  <th scope="col" className="text-start py-3.5 px-4">Code</th>
                  <th scope="col" className="text-start py-3.5 px-4">Rabatttyp</th>
                  <th scope="col" className="text-start py-3.5 px-4">Vorteile / Perks</th>
                  <th scope="col" className="text-start py-3.5 px-4">Bedingung</th>
                  <th scope="col" className="text-start py-3.5 px-4">Einlösungen</th>
                  <th scope="col" className="text-start py-3.5 px-4">Gültigkeit</th>
                  <th scope="col" className="py-3.5 px-4 text-center">Status</th>
                  <th scope="col" className="py-3.5 px-4 text-end">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800/80">
                {filteredCoupons.map((c) => (
                  <tr key={c.id} className="even:bg-slate-50/60 dark:even:bg-gray-950/40 hover:bg-slate-100/70 dark:hover:bg-gray-850/60 transition">
                    <td className="py-3 px-4 font-medium"><CouponCode c={c} copiedCode={copiedCode} onCopy={handleCopyCode} /></td>
                    <td className="py-3 px-4"><CouponDiscount c={c} /></td>
                    <td className="py-3 px-4"><CouponPerks c={c} /></td>
                    <td className="py-3 px-4 text-xs"><MinOrder c={c} /></td>
                    <td className="py-3 px-4"><Redemptions c={c} /></td>
                    <td className="py-3 px-4 text-xs text-slate-500"><Validity startDate={c.startDate} endDate={c.endDate} /></td>
                    <td className="py-3 px-4 text-center">
                      <Switch
                        checked={c.isActive}
                        onChange={() => handleToggleCouponStatus(c)}
                        label={c.isActive ? 'Gutschein deaktivieren' : 'Gutschein aktivieren'}
                      />
                    </td>
                    <td className="py-3 px-4"><CouponActions c={c} onEdit={handleOpenEditCoupon} onDelete={handleDeleteCoupon} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
);
