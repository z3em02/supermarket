import { useState, useMemo } from 'react';
import {
  Plus,
  SlidersHorizontal,
  ChevronDown,
  Search,
  X,
  RotateCcw,
  Package,
  Minus
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const ProductPicker = ({
  editItems,
  handleAddProductWithQty,
  products
}) => {
  const { language } = useLanguage();

  const [addSelectedProductId, setAddSelectedProductId] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState('all');
  const [pickerStockFilter, setPickerStockFilter] = useState('all');
  const [pickerSort, setPickerSort] = useState('default');
  const [pickerQuantities, setPickerQuantities] = useState({});
  const pickerCategories = useMemo(() => {
    const map = new Map();
    (products || []).forEach((p) => {
      if (p.category && p.category.id) {
        map.set(p.category.id, p.category);
      }
    });
    return Array.from(map.values());
  }, [products]);
  const filteredPickerProducts = useMemo(() => {
    let list = [...(products || [])];
    const isAr = language === 'ar';

    // 1. Text search
    if (pickerSearch.trim()) {
      const q = pickerSearch.trim().toLowerCase();
      list = list.filter((p) => {
        const nameDe = (p.nameDe || p.name || '').toLowerCase();
        const nameAr = (p.nameAr || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        const desc = `${p.descriptionDe || p.description || ''} ${p.descriptionAr || ''}`.toLowerCase();
        return nameDe.includes(q) || nameAr.includes(q) || sku.includes(q) || desc.includes(q);
      });
    }

    // 2. Category filter
    if (pickerCategory !== 'all') {
      list = list.filter((p) => p.categoryId === pickerCategory || p.category?.id === pickerCategory);
    }

    // 3. Stock filter
    if (pickerStockFilter === 'in_stock') {
      list = list.filter((p) => (p.stock || 0) > 0);
    } else if (pickerStockFilter === 'low_stock') {
      list = list.filter((p) => (p.stock || 0) > 0 && (p.stock || 0) <= 5);
    } else if (pickerStockFilter === 'out_of_stock') {
      list = list.filter((p) => (p.stock || 0) <= 0);
    }

    // 4. Sort
    if (pickerSort === 'name_asc') {
      list.sort((a, b) => {
        const nameA = (isAr ? a.nameAr || a.nameDe : a.nameDe || a.name) || '';
        const nameB = (isAr ? b.nameAr || b.nameDe : b.nameDe || b.name) || '';
        return nameA.localeCompare(nameB, isAr ? 'ar' : 'de');
      });
    } else if (pickerSort === 'name_desc') {
      list.sort((a, b) => {
        const nameA = (isAr ? a.nameAr || a.nameDe : a.nameDe || a.name) || '';
        const nameB = (isAr ? b.nameAr || b.nameDe : b.nameDe || b.name) || '';
        return nameB.localeCompare(nameA, isAr ? 'ar' : 'de');
      });
    } else if (pickerSort === 'price_asc') {
      list.sort((a, b) => (a.b2bPrice || 0) - (b.b2bPrice || 0));
    } else if (pickerSort === 'price_desc') {
      list.sort((a, b) => (b.b2bPrice || 0) - (a.b2bPrice || 0));
    } else if (pickerSort === 'stock_desc') {
      list.sort((a, b) => (b.stock || 0) - (a.stock || 0));
    }

    return list;
  }, [products, pickerSearch, pickerCategory, pickerStockFilter, pickerSort, language]);
  const handleAddProductToEdit = () => {
    if (!addSelectedProductId) return;
    const prod = products.find((p) => p.id === addSelectedProductId);
    if (!prod) return;
    handleAddProductWithQty(prod, 1);
    setAddSelectedProductId('');
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-950/40 p-3 sm:p-4 space-y-3">
      {/* Menu Header / Toggle Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400 shrink-0" />
            <span>{language === 'ar' ? 'إضافة منتج بديل أو عنصر إضافي:' : 'Ersatzprodukt oder weiteren Artikel hinzufügen:'}</span>
          </label>
          <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
            {language === 'ar'
              ? 'تصفح وفلترة المنتجات بالمخزن لإضافتها إلى هذا الطلب بكل سهولة'
              : 'Durchsuchen und filtern Sie das Sortiment nach passenden Alternativen'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowProductPicker((prev) => !prev)}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/50 dark:hover:bg-primary-900/60 text-primary-700 dark:text-primary-300 text-xs font-bold border border-primary-200 dark:border-primary-800/80 shadow-sm transition shrink-0 cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
          <span>
            {showProductPicker
              ? language === 'ar'
                ? 'إغلاق قائمة المنتجات'
                : 'Auswahlmenü schließen'
              : language === 'ar'
                ? 'فتح قائمة المنتجات والفلترة'
                : 'Produktauswahl & Filter öffnen'}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              showProductPicker ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Quick select fallback when picker is closed */}
      {!showProductPicker && (
        <div className="flex gap-2 pt-1">
          <select
            value={addSelectedProductId}
            onChange={(e) => setAddSelectedProductId(e.target.value)}
            className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">-- {language === 'ar' ? 'اختيار سريع لمنتج' : 'Schnellauswahl Produkt'} --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {((language === 'ar' ? p.nameAr : p.nameDe) || p.name)} (€{Number(p.b2bPrice).toFixed(2)}) - Lager: {p.stock}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddProductToEdit}
            disabled={!addSelectedProductId}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-xl text-xs font-bold disabled:opacity-40 transition cursor-pointer"
          >
            {language === 'ar' ? 'إضافة' : 'Hinzufügen'}
          </button>
        </div>
      )}

      {/* Interactive UI Menu with Filter Options */}
      {showProductPicker && (
        <div className="pt-2 border-t border-slate-200/80 dark:border-gray-800 space-y-3 animate-fade-in">
          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {/* 1. Search filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 rtl:right-2.5 rtl:left-auto top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder={language === 'ar' ? 'بحث بالاسم، رقم الصنف...' : 'Name, Art.-Nr., EAN...'}
                className="w-full pl-8 pr-7 rtl:pr-8 rtl:pl-7 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
              />
              {pickerSearch && (
                <button
                  type="button"
                  onClick={() => setPickerSearch('')}
                  className="absolute right-2.5 rtl:left-2.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* 2. Category filter */}
            <div>
              <select
                value={pickerCategory}
                onChange={(e) => setPickerCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
              >
                <option value="all">
                  {language === 'ar' ? 'جميع الفئات' : 'Alle Kategorien'} ({products.length})
                </option>
                {pickerCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {(language === 'ar' ? c.nameAr : c.nameDe) || c.nameDe || c.nameAr}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Stock Availability filter */}
            <div>
              <select
                value={pickerStockFilter}
                onChange={(e) => setPickerStockFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
              >
                <option value="all">{language === 'ar' ? 'جميع المخازن' : 'Alle Bestände'}</option>
                <option value="in_stock">{language === 'ar' ? 'متوفر بالمخزن فقط (> 0)' : 'Nur vorrätig (> 0)'}</option>
                <option value="low_stock">{language === 'ar' ? 'مخزون منخفض (≤ 5)' : 'Geringer Bestand (≤ 5)'}</option>
                <option value="out_of_stock">{language === 'ar' ? 'غير متوفر (0)' : 'Ausverkauft (0)'}</option>
              </select>
            </div>

            {/* 4. Sort filter */}
            <div>
              <select
                value={pickerSort}
                onChange={(e) => setPickerSort(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
              >
                <option value="default">{language === 'ar' ? 'الترتيب: الافتراضي' : 'Sortierung: Standard'}</option>
                <option value="name_asc">{language === 'ar' ? 'الاسم (أ – ي)' : 'Name (A → Z)'}</option>
                <option value="name_desc">{language === 'ar' ? 'الاسم (ي – أ)' : 'Name (Z → A)'}</option>
                <option value="price_asc">{language === 'ar' ? 'السعر (تصاعدي)' : 'Preis (aufsteigend)'}</option>
                <option value="price_desc">{language === 'ar' ? 'السعر (تنازلي)' : 'Preis (absteigend)'}</option>
                <option value="stock_desc">{language === 'ar' ? 'الأعلى مخزوناً' : 'Höchster Lagerbestand'}</option>
              </select>
            </div>
          </div>

          {/* Results count & reset filters */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-gray-400 px-0.5">
            <span>
              {language === 'ar'
                ? `تم العثور على ${filteredPickerProducts.length} منتج`
                : `${filteredPickerProducts.length} Artikel gefunden`}
            </span>
            {(pickerSearch || pickerCategory !== 'all' || pickerStockFilter !== 'all' || pickerSort !== 'default') && (
              <button
                type="button"
                onClick={() => {
                  setPickerSearch('');
                  setPickerCategory('all');
                  setPickerStockFilter('all');
                  setPickerSort('default');
                }}
                className="flex items-center gap-1 text-danger-600 dark:text-danger-400 hover:underline font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{language === 'ar' ? 'إعادة ضبط الفلاتر' : 'Filter zurücksetzen'}</span>
              </button>
            )}
          </div>

          {/* Scrollable Products List */}
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-200/60 dark:divide-gray-800">
            {filteredPickerProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Package className="w-8 h-8 mx-auto mb-1 opacity-40" />
                <p className="text-xs font-semibold">
                  {language === 'ar'
                    ? 'لم يتم العثور على أي منتج يطابق معايير الفلترة'
                    : 'Keine Produkte für die ausgewählten Filter gefunden.'}
                </p>
              </div>
            ) : (
              filteredPickerProducts.map((p) => {
                const existingItem = editItems.find((it) => it.productId === p.id);
                const currentQtyInOrder = existingItem ? existingItem.quantity : 0;
                const chosenQty = pickerQuantities[p.id] || 1;
                const isAr = language === 'ar';
                const prodName = (isAr ? p.nameAr : p.nameDe) || p.name || 'Produkt';
                const subName = isAr ? p.nameDe : p.nameAr;
                const isOutOfStock = (p.stock || 0) <= 0;

                return (
                  <div
                    key={p.id}
                    className={`pt-2 first:pt-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-2 rounded-xl transition ${
                      existingItem
                        ? 'bg-primary-50/70 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-900/60'
                        : 'hover:bg-white dark:hover:bg-gray-900'
                    }`}
                  >
                    {/* Left: Product Info */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={prodName}
                          className="w-10 h-10 rounded-lg object-cover bg-slate-100 dark:bg-gray-800 shrink-0 border border-slate-200 dark:border-gray-800"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-200/80 dark:bg-gray-800 flex items-center justify-center text-slate-500 shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {prodName}
                          </span>
                          {p.sku && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400">
                              #{p.sku}
                            </span>
                          )}
                          {p.category && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-gray-800 text-slate-600 dark:text-gray-300">
                              {(isAr ? p.category.nameAr : p.category.nameDe) || p.category.nameDe}
                            </span>
                          )}
                        </div>
                        {subName && subName !== prodName && (
                          <p className="text-[10px] text-slate-500 truncate">{subName}</p>
                        )}
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white font-mono">
                            €{Number(p.b2bPrice).toFixed(2)}
                          </span>
                          <span className="text-slate-300 dark:text-gray-700">&bull;</span>
                          {isOutOfStock ? (
                            <span className="text-[10px] font-bold text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-950/50 px-1.5 py-px rounded">
                              {isAr ? 'نفذت الكمية (0)' : 'Ausverkauft (0)'}
                            </span>
                          ) : (p.stock || 0) <= 5 ? (
                            <span className="text-[10px] font-bold text-warning-600 dark:text-warning-400 bg-warning-50 dark:bg-warning-950/50 px-1.5 py-px rounded">
                              {isAr ? `متبقي ${p.stock} فقط` : `Nur noch ${p.stock} Stk.`}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-950/50 px-1.5 py-px rounded">
                              {isAr ? `متوفر: ${p.stock}` : `Vorrätig: ${p.stock}`}
                            </span>
                          )}
                          {existingItem && (
                            <span className="text-[10px] font-bold text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/60 px-1.5 py-px rounded">
                              {isAr ? `بالطلب (${currentQtyInOrder}×)` : `Im Auftrag (${currentQtyInOrder}×)`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {/* Stepper for quantity */}
                      <div className="flex items-center border border-slate-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
                        <button
                          type="button"
                          onClick={() =>
                            setPickerQuantities((prev) => ({
                              ...prev,
                              [p.id]: Math.max(1, (prev[p.id] || 1) - 1)
                            }))
                          }
                          className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-800 transition cursor-pointer"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="w-6 text-center font-bold text-xs font-mono text-slate-800 dark:text-slate-200">
                          {chosenQty}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setPickerQuantities((prev) => ({
                              ...prev,
                              [p.id]: (prev[p.id] || 1) + 1
                            }))
                          }
                          className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-800 transition cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      {/* Add Button */}
                      <button
                        type="button"
                        onClick={() => {
                          handleAddProductWithQty(p, chosenQty);
                          setPickerQuantities((prev) => ({ ...prev, [p.id]: 1 }));
                        }}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer ${
                          existingItem
                            ? 'bg-primary-600 hover:bg-primary-700 text-white'
                            : 'bg-success-600 hover:bg-success-700 text-white'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>
                          {existingItem
                            ? isAr
                              ? `+${chosenQty} زيادة`
                              : `+${chosenQty} mehr`
                            : isAr
                              ? 'إضافة'
                              : 'Hinzufügen'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
