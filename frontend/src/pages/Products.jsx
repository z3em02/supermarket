import { useEffect, useState, useMemo } from 'react';
import axios from '../utils/adminAxios';
import { Link, useSearchParams } from 'react-router-dom';
import { getApiUrl } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { ADMIN_BASE } from '../config/adminPath';
import { Plus, Store, ArrowUpRight, Layers } from 'lucide-react';
import { generateSku } from './products/generateSku';
import { ProductFormModal } from './products/ProductFormModal';
import { RestockModal } from './products/RestockModal';
import { ProductCardGrid } from './products/ProductCardGrid';
import { ProductFilters } from './products/ProductFilters';

export const Products = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockTab, setStockTab] = useState(() => searchParams.get('stock') === 'low' ? 'low' : 'all'); // 'all' or 'low'

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
      const apiUrl = getApiUrl();

      const [prodRes, catRes] = await Promise.all([
        axios.get(`${apiUrl}/api/products`),
        axios.get(`${apiUrl}/api/categories`)
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
      const apiUrl = getApiUrl();

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
        await axios.put(`${apiUrl}/api/products/${editingProduct.id}`, payload);
      } else {
        await axios.post(`${apiUrl}/api/products`, payload);
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
      const apiUrl = getApiUrl();
      await axios.delete(`${apiUrl}/api/products/${id}`);
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
      const apiUrl = getApiUrl();
      const newStock = Number(restockProduct.stock || 0) + qtyToAdd;
      await axios.patch(
        `${apiUrl}/api/products/${restockProduct.id}/stock`,
        { stock: newStock }
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
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
            to={`${ADMIN_BASE}/catalogs`}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-slate-50 dark:hover:bg-gray-850 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium shadow-2xs transition touch-manipulation"
          >
            <Layers className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" />
            <span>{t('catalogs')}</span>
          </Link>

          <Link
            to="/"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-slate-50 dark:hover:bg-gray-850 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium shadow-2xs transition touch-manipulation"
          >
            <Store className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" />
            <span>{t('viewCatalog')}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </Link>

          <button
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium text-xs sm:text-sm rounded-xl shadow-sm transition touch-manipulation cursor-pointer"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>{t('addProduct')}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <ProductFilters
        categories={categories}
        lowStockProductsCount={lowStockProductsCount}
        products={products}
        searchTerm={searchTerm}
        selectedCategory={selectedCategory}
        setSearchTerm={setSearchTerm}
        setSelectedCategory={setSelectedCategory}
        setStockTab={setStockTab}
        stockTab={stockTab}
      />

      {/* Products Grid */}
      <ProductCardGrid
        filteredProducts={filteredProducts}
        handleDelete={handleDelete}
        handleEdit={handleEdit}
        setRestockProduct={setRestockProduct}
      />

      {/* Quick Restock Modal */}
      {restockProduct && (
        <RestockModal
          handleQuickRestock={handleQuickRestock}
          isRestocking={isRestocking}
          restockAmount={restockAmount}
          restockProduct={restockProduct}
          setRestockAmount={setRestockAmount}
          setRestockProduct={setRestockProduct}
        />
      )}

      {/* Add / Edit Product Modal */}
      {showModal && (
        <ProductFormModal
          categories={categories}
          editingProduct={editingProduct}
          formData={formData}
          handleSubmit={handleSubmit}
          setFormData={setFormData}
          setShowModal={setShowModal}
        />
      )}
    </div>
  );
};

export default Products;