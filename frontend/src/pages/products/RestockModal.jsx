import { useId } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Button, Input, Modal } from '../../components/ui';

export const RestockModal = ({
  handleQuickRestock,
  isRestocking,
  restockAmount,
  restockProduct,
  setRestockAmount,
  setRestockProduct
}) => {
  const { t, language } = useLanguage();
  const formId = useId();
  const close = () => setRestockProduct(null);

  return (
    <Modal
      isOpen
      onClose={close}
      size="sm"
      title={t('quickRestock')}
      footer={(
        <>
          <Button variant="secondary" onClick={close}>{t('cancel')}</Button>
          <Button type="submit" form={formId} loading={isRestocking}>
            {isRestocking ? t('loading') : `${t('confirm')} (+${restockAmount})`}
          </Button>
        </>
      )}
    >
      <form id={formId} onSubmit={handleQuickRestock} className="space-y-4">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('product')}:</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
            {(language === 'ar' ? restockProduct.nameAr : restockProduct.nameDe) || restockProduct.name}
          </p>
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {t('currentStock')}: {restockProduct.stock} {t('units')}
          </span>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2" role="group" aria-label={t('restockAmount')}>
            {[10, 25, 50, 100].map((qty) => (
              <button
                key={qty}
                type="button"
                aria-pressed={restockAmount === qty}
                onClick={() => setRestockAmount(qty)}
                className={`min-h-11 rounded-xl text-sm font-bold border transition cursor-pointer touch-manipulation tabular-nums ${
                  restockAmount === qty
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                    : 'bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-gray-700 hover:bg-slate-200 dark:hover:bg-gray-700'
                }`}
              >
                +{qty}
              </button>
            ))}
          </div>

          <Input
            label={t('restockAmount')}
            type="number"
            min="1"
            required
            value={restockAmount}
            onChange={(e) => setRestockAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="text-center font-bold !text-base tabular-nums"
          />
        </div>
      </form>
    </Modal>
  );
};
