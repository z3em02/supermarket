import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { getApiUrl } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Package, 
  Box, 
  X,
  Store,
  RotateCw,
  AlertTriangle,
  ArrowUpRight,
  Layers
} from 'lucide-react';

const generateSku = () => `PRD-${Math.floor(100000 + Math.random() * 900000)}`;

export const Products = () => {
  const { t, language } = useLanguage();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockTab, setStockTab] = useState('all'); // 'all' or 'low'

  // Quick Restock Modal State
  const [restockProduct, setRestockProduct] = useState(null);
  const [restockAmount, setRestockAmount] = useState(10);
  const [isRestocking, setIsRestocking] = useState(false);

  const [formData, setFormData] = useState({
    nameDe: '',
    nameAr: '',
    descriptionDe: '',
    descriptionAr: '',
    sku: generateSku(),
    b2bPrice: '',
    stock: 0,
    imageUrl: '',
    categoryId: ''
  });

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      const headers = { Authorization: `Bearer ${token}` };

      const [prodRes, catRes] = await Promise.all([
        axios.get(`${apiUrl}/api/products`, { headers }),
        axios.get(`${apiUrl}/api/categories`, { headers })
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
    } catch (error) {
      console.error('Error fetching products/categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const lowStockProductsCount = useMemo(() => {
    return products.filter((p) => p.stock <= 15).length;
  }, [products]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      const headers = { Authorization: `Bearer ${token}` };

      const payload = {
        nameDe: formData.nameDe.trim(),
        nameAr: formData.nameAr.trim(),
        name: formData.nameDe.trim(),
        descriptionDe: formData.descriptionDe ? formData.descriptionDe.trim() : null,
        descriptionAr: formData.descriptionAr ? formData.descriptionAr.trim() : null,
        description: formData.descriptionDe ? formData.descriptionDe.trim() : null,
        sku: formData.sku.trim(),
        b2bPrice: parseFloat(formData.b2bPrice),
        stock: parseInt(formData.stock, 10) || 0,
        imageUrl: formData.imageUrl ? formData.imageUrl.trim() : null,
        categoryId: formData.categoryId || null
      };

      if (editingProduct) {
        await axios.put(`${apiUrl}/api/products/${editingProduct.id}`, payload, { headers });
      } else {
        await axios.post(`${apiUrl}/api/products`, payload, { headers });
      }

      setShowModal(false);
      setEditingProduct(null);
      fetchData();
    } catch (error) {
      console.error('Error saving product:', error);
      alert(error.response?.data?.error || t('saveProductError'));
    }
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      nameDe: '',
      nameAr: '',
      descriptionDe: '',
      descriptionAr: '',
      sku: generateSku(),
      b2bPrice: '',
      stock: 0,
      imageUrl: '',
      categoryId: categories[0]?.id || ''
    });
    setShowModal(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      nameDe: product.nameDe || product.name || '',
      nameAr: product.nameAr || '',
      descriptionDe: product.descriptionDe || product.description || '',
      descriptionAr: product.descriptionAr || '',
      sku: product.sku || generateSku(),
      b2bPrice: product.b2bPrice,
      stock: product.stock,
      imageUrl: product.imageUrl || '',
      categoryId: product.categoryId || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('confirmDeleteProduct'))) return;

    try {
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      await axios.delete(`${apiUrl}/api/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert(error.response?.data?.error || t('deleteProductError'));
    }
  };

  // Quick Restock Handler
  const handleQuickRestock = async (e) => {
    e.preventDefault();
    if (!restockProduct) return;

    const qtyToAdd = parseInt(restockAmount, 10);
    if (isNaN(qtyToAdd) || qtyToAdd <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    setIsRestocking(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      const newStock = Number(restockProduct.stock || 0) + qtyToAdd;
      await axios.patch(
        `${apiUrl}/api/products/${restockProduct.id}/stock`,
        { stock: newStock },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRestockProduct(null);
      setRestockAmount(10);
      await fetchData();
    } catch (error) {
      console.error('Error updating stock:', error);
      alert(error.response?.data?.error || 'Failed to update stock');
    } finally {
      setIsRestocking(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch = !q ||
      (product.nameDe && product.nameDe.toLowerCase().includes(q)) ||
      (product.nameAr && product.nameAr.toLowerCase().includes(q)) ||
      (product.name && product.name.toLowerCase().includes(q)) ||
      (product.sku && product.sku.toLowerCase().includes(q)) ||
      (product.category?.nameDe && product.category.nameDe.toLowerCase().includes(q)) ||
      (product.category?.nameAr && product.category.nameAr.toLowerCase().includes(q)) ||
      (product.descriptionDe && product.descriptionDe.toLowerCase().includes(q)) ||
      (product.descriptionAr && product.descriptionAr.toLowerCase().includes(q));
    
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
    const matchesStock = stockTab === 'all' || (stockTab === 'low' && product.stock <= 15);

    return matchesSearch && matchesCategory && matchesStock;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t('products')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">
            {t('manageCatalog')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <Link
            to="/secret/admin/catalogs"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-slate-50 dark:hover:bg-gray-850 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium shadow-2xs transition touch-manipulation"
          >
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{t('catalogs')}</span>
          </Link>

          <Link
            to="/"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-slate-50 dark:hover:bg-gray-850 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium shadow-2xs transition touch-manipulation"
          >
            <Store className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{t('viewCatalog')}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </Link>

          <button
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm rounded-xl shadow-sm transition touch-manipulation cursor-pointer"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>{t('addProduct')}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-3">
        {/* Low Stock vs All Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStockTab('all')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition touch-manipulation cursor-pointer ${
              stockTab === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-850'
            }`}
          >
            {t('allProductsTab')} ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setStockTab('low')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition touch-manipulation cursor-pointer ${
              stockTab === 'low'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-900 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-950/20'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{t('lowStockFilter')}</span>
            <span className="px-1.5 py-0.2 rounded-full text-xs font-bold bg-white/20 dark:bg-amber-900/40">
              {lowStockProductsCount}
            </span>
          </button>
        </div>

        {/* Search & Category Dropdown */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder={`${t('searchProducts')} (DE / AR / SKU)...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full ps-10 sm:ps-11 pe-4 py-2.5 sm:py-3 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute end-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 touch-manipulation cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 sm:px-4 py-2.5 sm:py-3 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm transition"
            >
              <option value="all" className="dark:bg-gray-900 dark:text-white">{t('allCategories')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="dark:bg-gray-900 dark:text-white">
                  {language === 'ar' ? c.nameAr : c.nameDe}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {filteredProducts.map((product) => (
          <div 
            key={product.id} 
            className="group bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-850 shadow-xs hover:shadow-lg dark:hover:border-gray-700 transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div>
              {/* Product Media Area */}
              <div className="h-44 bg-slate-100 dark:bg-gray-950 flex items-center justify-center relative overflow-hidden border-b border-slate-100 dark:border-gray-850">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.nameDe || product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    onError={(e) => { 
                      e.target.style.display = 'none'; 
                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`flex-col items-center justify-center gap-2 group-hover:scale-105 transition-transform duration-300 ${product.imageUrl ? 'hidden' : 'flex'}`}>
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-850 shadow-xs border border-slate-200/80 dark:border-gray-750 flex items-center justify-center text-blue-600 dark:text-blue-400 backdrop-blur">
                    <Package className="w-7 h-7" />
                  </div>
                </div>

                {/* Category Pill */}
                {product.category && (
                  <span className="absolute top-3 start-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/95 dark:bg-gray-950/90 text-slate-800 dark:text-slate-200 shadow-xs backdrop-blur border border-slate-200/80 dark:border-gray-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    {language === 'ar' ? product.category.nameAr : product.category.nameDe}
                  </span>
                )}

                {/* SKU Badge */}
                <div className="absolute top-3 end-3 px-2 py-0.5 rounded-md bg-slate-900/80 text-white font-mono text-[10px] font-bold backdrop-blur">
                  {product.sku}
                </div>
              </div>

              {/* Product Info */}
              <div className="p-4 space-y-2">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1" title={product.nameDe || product.name}>
                    {(language === 'ar' ? product.nameAr : product.nameDe) || product.name}
                  </h3>
                  {/* Secondary language sub-line */}
                  <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1" dir={language === 'ar' ? 'ltr' : 'rtl'}>
                    {language === 'ar' ? (product.nameDe || product.name) : product.nameAr}
                  </p>
                </div>

                {(product.descriptionDe || product.descriptionAr || product.description) && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {(language === 'ar' ? product.descriptionAr : product.descriptionDe) || product.description}
                  </p>
                )}

                {/* Price & Stock info */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-gray-850 text-xs">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 text-[11px] block">{t('b2bPrice')}</span>
                    <span className="text-base font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                      €{Number(product.b2bPrice).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-end">
                    <span className="text-slate-400 dark:text-slate-500 text-[11px] block">{t('stock')}</span>
                    <span className={`font-bold font-mono ${product.stock <= 15 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                      {product.stock} {t('units')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Action Footer */}
            <div className="px-4 py-3 bg-slate-50/70 dark:bg-gray-950/60 border-t border-slate-100 dark:border-gray-850 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setRestockProduct(product)}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('quickRestock')}</span>
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleEdit(product)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-200/60 dark:hover:bg-gray-800 transition"
                  title={t('edit')}
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(product.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                  title={t('delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Restock Modal */}
      {restockProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-slate-200 dark:border-gray-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-gray-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Box className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>{t('quickRestock')}</span>
              </h2>
              <button
                onClick={() => setRestockProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickRestock} className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('product')}:</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {(language === 'ar' ? restockProduct.nameAr : restockProduct.nameDe) || restockProduct.name}
                </p>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t('currentStock')}: {restockProduct.stock} {t('units')}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  {t('restockAmount')}
                </label>
                <div className="flex items-center gap-2 mb-3">
                  {[10, 25, 50, 100].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setRestockAmount(qty)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition ${
                        restockAmount === qty
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-gray-750 hover:bg-slate-200 dark:hover:bg-gray-750'
                      }`}
                    >
                      +{qty}
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  min="1"
                  required
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-center font-bold text-base"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isRestocking}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {isRestocking ? t('loading') : `${t('confirm')} (+${restockAmount})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-7 w-full max-w-xl max-h-[90dvh] overflow-y-auto border border-slate-200 dark:border-gray-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 sm:pb-4 mb-4 sm:mb-5 border-b border-slate-100 dark:border-gray-800">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>{editingProduct ? t('editProduct') : t('addProduct')}</span>
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Product ID (SKU) - Auto-generated with regenerate button */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {t('productId')} *
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, sku: generateSku() }))}
                    className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>{t('regenerateId')}</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold tracking-wide transition uppercase"
                  placeholder="PRD-123456"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  {t('autoGenerated')}
                </p>
              </div>

              {/* Bilingual Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('productNameDe')} *
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={formData.nameDe}
                    onChange={(e) => setFormData({ ...formData, nameDe: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition"
                    placeholder="z. B. Basmati Reis 25kg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('productNameAr')} *
                  </label>
                  <input
                    type="text"
                    required
                    dir="rtl"
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition text-right"
                    placeholder="مثال: أرز بسمتي 25 كغ"
                  />
                </div>
              </div>

              {/* Category Dropdown Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {t('category')}
                  </label>
                  <Link
                    to="/secret/admin/catalogs"
                    target="_blank"
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Layers className="w-3 h-3" />
                    <span>{t('newCatalogQuick')}</span>
                  </Link>
                </div>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
                >
                  <option value="">-- {t('selectCategory')} --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameDe} — {c.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price & Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('b2bPrice')} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.b2bPrice}
                    onChange={(e) => setFormData({ ...formData, b2bPrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition"
                    placeholder="19.99"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('stock')} *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition"
                    placeholder="50"
                  />
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('imageUrl')}
                </label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              {/* Bilingual Descriptions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('descriptionDe')}
                  </label>
                  <textarea
                    rows="2"
                    dir="ltr"
                    value={formData.descriptionDe}
                    onChange={(e) => setFormData({ ...formData, descriptionDe: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
                    placeholder="Produktspezifikationen, Verpackungseinheiten..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('descriptionAr')}
                  </label>
                  <textarea
                    rows="2"
                    dir="rtl"
                    value={formData.descriptionAr}
                    onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition text-sm text-right"
                    placeholder="المواصفات، عبوات الجملة، شروط التوريد..."
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse xs:flex-row items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full xs:w-auto px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition touch-manipulation cursor-pointer text-center"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="w-full xs:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-xl shadow-sm transition touch-manipulation cursor-pointer text-center"
                >
                  {editingProduct ? t('update') : t('create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;