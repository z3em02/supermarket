import {
  Sparkles,
  Plus,
  Package,
  Gift,
  Percent,
  Edit2,
  Trash2
} from 'lucide-react';
import { Badge, Button, EmptyState, IconButton, SkeletonList, Switch } from '../../components/ui';

// Each piece renders once and is placed both in the desktop table cell and in
// the phone card, so the two layouts can't drift apart.
const OfferProduct = ({ off }) => (
  <div className="flex items-center gap-3 min-w-0">
    {off.product?.imageUrl ? (
      <img
        src={off.product.imageUrl}
        alt=""
        className="w-10 h-10 object-cover rounded-xl border border-slate-200 dark:border-gray-800 shrink-0"
      />
    ) : (
      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
        <Package className="w-5 h-5 text-slate-500" aria-hidden="true" />
      </div>
    )}
    <div className="min-w-0">
      <p className="font-semibold text-slate-900 dark:text-white truncate">
        {off.product?.nameDe || off.product?.name || 'Produkt'}
      </p>
      <p className="text-xs text-slate-500 tabular-nums">
        SKU: {off.product?.sku} &bull; Normal: €{Number(off.product?.b2bPrice || 0).toFixed(2)}
      </p>
    </div>
  </div>
);

const OfferType = ({ off }) => (off.type === 'BUY_X_GET_Y'
  ? <Badge tone="promo" icon={Gift}>{off.buyQuantity}+{off.getYQuantity} Gratis Deal</Badge>
  : <Badge tone="primary" icon={Percent}>Einzelrabatt</Badge>);

const OfferDetails = ({ off }) => {
  if (off.type === 'BUY_X_GET_Y') {
    return <span className="text-promo-600 dark:text-promo-400 font-semibold">Kaufe {off.buyQuantity}, erhalte {off.getYQuantity} gratis</span>;
  }
  if (off.promotionalPrice != null) {
    return (
      <span className="inline-flex items-center gap-2 tabular-nums">
        <span className="line-through text-xs text-slate-500">€{Number(off.product?.b2bPrice || 0).toFixed(2)}</span>
        <span className="text-success-600 dark:text-success-400 font-bold text-base">€{Number(off.promotionalPrice).toFixed(2)}</span>
      </span>
    );
  }
  return <span className="text-primary-600 dark:text-primary-400 font-semibold">-{off.discountPercent}% Rabatt</span>;
};

const OfferBadges = ({ off }) => (
  <div className="flex flex-wrap gap-1">
    {off.badgeTextDe && <Badge tone="warning">{off.badgeTextDe}</Badge>}
    {off.badgeTextAr && <span dir="rtl"><Badge>{off.badgeTextAr}</Badge></span>}
  </div>
);

const Validity = ({ startDate, endDate }) => (startDate || endDate ? (
  <span className="flex flex-col tabular-nums">
    {startDate && <span>Ab: {new Date(startDate).toLocaleDateString()}</span>}
    {endDate && <span>Bis: {new Date(endDate).toLocaleDateString()}</span>}
  </span>
) : <span>Dauerhaft</span>);

const OfferActions = ({ off, onEdit, onDelete }) => (
  <div className="flex items-center justify-end gap-1">
    <IconButton icon={Edit2} label="Bearbeiten" onClick={() => onEdit(off)} />
    <IconButton icon={Trash2} label="Löschen" onClick={() => onDelete(off.id)}
      className="text-danger-600 dark:text-danger-400 hover:text-danger-700 hover:bg-danger-50 dark:hover:bg-danger-950/30" />
  </div>
);

export const OffersTab = ({
  filteredOffers,
  handleDeleteOffer,
  handleOpenCreateOffer,
  handleOpenEditOffer,
  handleToggleOfferStatus,
  loading
}) => (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-sm overflow-hidden">
      {loading ? (
        <div className="p-4"><SkeletonList variant="table" count={4} columns={5} /></div>
      ) : filteredOffers.length === 0 ? (
        <EmptyState
          className="border-0 rounded-none"
          icon={Sparkles}
          title="Keine Angebote gefunden"
          description="Erstellen Sie ein Angebot für ein einzelnes Produkt oder eine beliebte 2+1 Gratis Aktion!"
          action={<Button icon={Plus} onClick={handleOpenCreateOffer}>Angebot erstellen</Button>}
        />
      ) : (
        <>
          {/* Phones: one card per offer instead of a sideways-scrolling table */}
          <ul className="md:hidden divide-y divide-slate-100 dark:divide-gray-800">
            {filteredOffers.map((off) => (
              <li key={off.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <OfferProduct off={off} />
                  <Switch
                    checked={off.isActive}
                    onChange={() => handleToggleOfferStatus(off)}
                    label={off.isActive ? 'Angebot deaktivieren' : 'Angebot aktivieren'}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <OfferType off={off} />
                  <OfferDetails off={off} />
                </div>
                <OfferBadges off={off} />
                <div className="flex items-end justify-between gap-2">
                  <div className="text-xs text-slate-500"><Validity startDate={off.startDate} endDate={off.endDate} /></div>
                  <OfferActions off={off} onEdit={handleOpenEditOffer} onDelete={handleDeleteOffer} />
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden md:block overflow-auto max-h-[70vh]">
            <table className="w-full text-start text-sm text-slate-600 dark:text-slate-300">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-gray-900 text-xs uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100 dark:border-gray-800">
                <tr>
                  <th scope="col" className="text-start py-3.5 px-4">Produkt</th>
                  <th scope="col" className="text-start py-3.5 px-4">Angebotstyp</th>
                  <th scope="col" className="text-start py-3.5 px-4">Aktionsdetails</th>
                  <th scope="col" className="text-start py-3.5 px-4">Badge / Kennzeichnung</th>
                  <th scope="col" className="text-start py-3.5 px-4">Gültigkeit</th>
                  <th scope="col" className="py-3.5 px-4 text-center">Status</th>
                  <th scope="col" className="py-3.5 px-4 text-end">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800/80">
                {filteredOffers.map((off) => (
                  <tr key={off.id} className="even:bg-slate-50/60 dark:even:bg-gray-950/40 hover:bg-slate-100/70 dark:hover:bg-gray-850/60 transition">
                    <td className="py-3 px-4"><OfferProduct off={off} /></td>
                    <td className="py-3 px-4"><OfferType off={off} /></td>
                    <td className="py-3 px-4 font-medium"><OfferDetails off={off} /></td>
                    <td className="py-3 px-4"><OfferBadges off={off} /></td>
                    <td className="py-3 px-4 text-xs text-slate-500"><Validity startDate={off.startDate} endDate={off.endDate} /></td>
                    <td className="py-3 px-4 text-center">
                      <Switch
                        checked={off.isActive}
                        onChange={() => handleToggleOfferStatus(off)}
                        label={off.isActive ? 'Angebot deaktivieren' : 'Angebot aktivieren'}
                      />
                    </td>
                    <td className="py-3 px-4"><OfferActions off={off} onEdit={handleOpenEditOffer} onDelete={handleDeleteOffer} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
);
