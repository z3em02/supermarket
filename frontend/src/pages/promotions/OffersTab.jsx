import {
  Sparkles,
  Plus,
  Package,
  Gift,
  Percent,
  Edit2,
  Trash2
} from 'lucide-react';
import { Button, EmptyState, SkeletonList } from '../../components/ui';

export const OffersTab = ({
  filteredOffers,
  handleDeleteOffer,
  handleOpenCreateOffer,
  handleOpenEditOffer,
  handleToggleOfferStatus,
  loading
}) => (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-xs overflow-hidden">
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-gray-950/60 text-xs uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-100 dark:border-gray-800">
              <tr>
                <th className="py-3.5 px-4">Produkt</th>
                <th className="py-3.5 px-4">Angebotstyp</th>
                <th className="py-3.5 px-4">Aktionsdetails</th>
                <th className="py-3.5 px-4">Badge / Kennzeichnung</th>
                <th className="py-3.5 px-4">Gültigkeit</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-800/80">
              {filteredOffers.map((off) => (
                <tr key={off.id} className="hover:bg-slate-50/70 dark:hover:bg-gray-850/50 transition">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      {off.product?.imageUrl ? (
                        <img
                          src={off.product.imageUrl}
                          alt=""
                          className="w-10 h-10 object-cover rounded-xl border border-slate-200 dark:border-gray-800 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">
                          {off.product?.nameDe || off.product?.name || 'Produkt'}
                        </p>
                        <p className="text-xs text-slate-400">
                          SKU: {off.product?.sku} &bull; Normal: €{Number(off.product?.b2bPrice || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    {off.type === 'BUY_X_GET_Y' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-promo-50 text-promo-700 dark:bg-promo-950/40 dark:text-promo-300 border border-promo-200 dark:border-promo-800">
                        <Gift className="w-3.5 h-3.5" />
                        {off.buyQuantity}+{off.getYQuantity} Gratis Deal
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                        <Percent className="w-3.5 h-3.5" />
                        Einzelrabatt
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-medium">
                    {off.type === 'BUY_X_GET_Y' ? (
                      <span className="text-promo-600 dark:text-promo-400 font-semibold">
                        Kaufe {off.buyQuantity}, erhalte {off.getYQuantity} gratis
                      </span>
                    ) : off.promotionalPrice != null ? (
                      <div className="flex items-center gap-2">
                        <span className="line-through text-xs text-slate-400">
                          €{Number(off.product?.b2bPrice || 0).toFixed(2)}
                        </span>
                        <span className="text-success-600 dark:text-success-400 font-bold text-base">
                          €{Number(off.promotionalPrice).toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-primary-600 dark:text-primary-400 font-semibold">
                        -{off.discountPercent}% Rabatt
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-1">
                      {off.badgeTextDe && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-warning-50 text-warning-800 dark:bg-warning-950/50 dark:text-warning-300 border border-warning-200 dark:border-warning-800 w-max">
                          {off.badgeTextDe}
                        </span>
                      )}
                      {off.badgeTextAr && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-slate-300 w-max" dir="rtl">
                          {off.badgeTextAr}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-xs text-slate-500">
                    {off.startDate || off.endDate ? (
                      <div>
                        {off.startDate && <div>Ab: {new Date(off.startDate).toLocaleDateString()}</div>}
                        {off.endDate && <div>Bis: {new Date(off.endDate).toLocaleDateString()}</div>}
                      </div>
                    ) : (
                      <span className="text-slate-400">Dauerhaft</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handleToggleOfferStatus(off)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        off.isActive ? 'bg-success-500' : 'bg-slate-300 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          off.isActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEditOffer(off)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-600 dark:text-slate-300 transition"
                        title="Bearbeiten"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteOffer(off.id)}
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
