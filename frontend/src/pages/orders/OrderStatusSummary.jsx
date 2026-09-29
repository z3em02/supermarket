import { useLanguage } from '../../context/LanguageContext';
import { STATUS_TONES, TONE_TILE_CLASSES, normalizeOrderStatus } from '../../utils/orderStatusBadge';

// Filter value sent to the server -> metrics key + label. Colours come from
// the shared status tones (utils/orderStatusBadge.js), same as the badges.
const TILES = [
  { filter: 'all', metric: 'total', labelKey: 'all' },
  { filter: 'pending', metric: 'pending', labelKey: 'pending' },
  { filter: 'pending_customer_approval', metric: 'pending_customer_approval', label: { de: 'Wartet auf Kunde', ar: 'بانتظار العميل' } },
  { filter: 'accepted', metric: 'accepted', labelKey: 'accepted' },
  { filter: 'preparing', metric: 'preparing', labelKey: 'preparing' },
  { filter: 'shipped', metric: 'shipped', labelKey: 'shipped' },
  { filter: 'delivered', metric: 'delivered', labelKey: 'delivered' },
  { filter: 'declined', metric: 'declined', labelKey: 'declined' }
];

export const OrderStatusSummary = ({
  metrics,
  setStatusFilter,
  statusFilter
}) => {
  const { t, language } = useLanguage();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
      {TILES.map((tile) => {
        const tone = tile.filter === 'all' ? 'neutral' : (STATUS_TONES[normalizeOrderStatus(tile.filter)] || 'neutral');
        const styles = TONE_TILE_CLASSES[tone];
        const active = statusFilter === tile.filter;
        const label = tile.label ? tile.label[language === 'ar' ? 'ar' : 'de'] : t(tile.labelKey);
        return (
          <button
            key={tile.filter}
            type="button"
            onClick={() => setStatusFilter(tile.filter)}
            aria-pressed={active}
            className={`p-2.5 sm:p-3 rounded-xl border text-start transition touch-manipulation cursor-pointer ${
              active
                ? `${styles.active} text-slate-900 dark:text-white shadow-sm`
                : 'bg-white dark:bg-gray-900 border-slate-200/80 dark:border-gray-850 hover:border-slate-300 dark:hover:border-gray-700'
            }`}
          >
            <span className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider block truncate ${styles.label}`}>
              {label}
            </span>
            <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tabular-nums">{metrics[tile.metric] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
};
