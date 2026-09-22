import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { getApiUrl } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { 
  Layers, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Package, 
  X, 
  Check, 
  AlertTriangle,
  FolderOpen
} from 'lucide-react';

export const Catalogs = () => {
  const { t, language } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    nameDe: '',
    nameAr: '',
    descriptionDe: '',
    descriptionAr: ''
  });

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      const response = await axios.get(`${apiUrl}/api/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const totalProductsCount = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c._count?.products || 0), 0);
  }, [categories]);

  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    const q = searchTerm.toLowerCase();
    return categories.filter((c) => {
      const deMatch = c.nameDe?.toLowerCase().includes(q) || c.descriptionDe?.toLowerCase().includes(q);
      const arMatch = c.nameAr?.toLowerCase().includes(q) || c.descriptionAr?.toLowerCase().includes(q);
      return deMatch || arMatch;
    });
  }, [categories, searchTerm]);

  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setFormData({
      nameDe: '',
      nameAr: '',
      descriptionDe: '',
      descriptionAr: ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (cat) => {
    setEditingCategory(cat);
    setFormData({
      nameDe: cat.nameDe || '',
      nameAr: cat.nameAr || '',
      descriptionDe: cat.descriptionDe || '',
      descriptionAr: cat.descriptionAr || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      const headers = { Authorization: `Bearer ${token}` };

      if (editingCategory) {
        await axios.put(`${apiUrl}/api/categories/${editingCategory.id}`, formData, { headers });
      } else {
        await axios.post(`${apiUrl}/api/categories`, formData, { headers });
      }

      setShowModal(false);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      alert(error.response?.data?.error || t('saveCatalogError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(t('confirmDeleteCatalog'))) return;

    try {
      const token = localStorage.getItem('token');
      const apiUrl = getApiUrl();
      await axios.delete(`${apiUrl}/api/categories/${cat.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert(error.response?.data?.error || t('deleteCatalogError'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Layers className="w-5 sm:w-6 h-5 sm:h-6 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{t('catalogs')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">
            {t('manageCatalogs')}
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition cursor-pointer touch-manipulation"
        >
          <Plus className="w-4 sm:w-5 h-4 sm:h-5" />
          <span>{t('addCatalog')}</span>
        </button>
      </div>

      {/* Stats summary banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-900 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 dark:border-gray-850 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              {categories.length}
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('totalCatalogs')}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 dark:border-gray-850 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              {totalProductsCount}
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('productsInCatalog')}
            </div>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 sm:w-5 h-4 sm:h-5 pointer-events-none" />
        <input
          type="text"
          placeholder={`${t('search')} (Deutsch / العربية)...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full ps-10 pe-9 py-2.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-xs sm:text-sm"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Cards Grid */}
      {filteredCategories.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-850 p-6 sm:p-8 shadow-sm">
          <FolderOpen className="w-12 h-12 text-slate-400 dark:text-gray-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {t('noCatalogsFound')}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1">
            {t('adjustFiltersHint')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-850 p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-gray-750">
                    <Package className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{cat._count?.products || 0} {t('items')}</span>
                  </span>
                </div>

                {/* Bilingual Titles */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">DE</span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate text-start flex-1" title={cat.nameDe}>
                      {cat.nameDe}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">AR</span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate text-start flex-1" dir="rtl" title={cat.nameAr}>
                      {cat.nameAr}
                    </h3>
                  </div>
                </div>

                {/* Descriptions */}
                {(cat.descriptionDe || cat.descriptionAr) && (
                  <div className="pt-2 border-t border-slate-100 dark:border-gray-850 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                    {cat.descriptionDe && (
                      <p className="line-clamp-2">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">DE: </span>
                        {cat.descriptionDe}
                      </p>
                    )}
                    {cat.descriptionAr && (
                      <p className="line-clamp-2" dir="rtl">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">AR: </span>
                        {cat.descriptionAr}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3.5 sm:pt-4 mt-3.5 sm:mt-4 border-t border-slate-100 dark:border-gray-850">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(cat)}
                  className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-750 border border-slate-200 dark:border-gray-700 rounded-lg transition cursor-pointer touch-manipulation"
                >
                  <Edit className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{t('edit')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(cat)}
                  className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/80 border border-rose-200/80 dark:border-rose-900/50 rounded-lg transition cursor-pointer touch-manipulation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('delete')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-7 w-full max-w-lg max-h-[90dvh] overflow-y-auto border border-slate-200 dark:border-gray-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 sm:pb-4 mb-4 sm:mb-5 border-b border-slate-100 dark:border-gray-800">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{editingCategory ? t('editCatalog') : t('addCatalog')}</span>
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition cursor-pointer touch-manipulation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* German Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('catalogNameDe')} *
                </label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={formData.nameDe}
                  onChange={(e) => setFormData({ ...formData, nameDe: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="z. B. Trockenwaren, Getränke..."
                />
              </div>

              {/* Arabic Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('catalogNameAr')} *
                </label>
                <input
                  type="text"
                  required
                  dir="rtl"
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition text-right"
                  placeholder="مثال: بضائع جافة، مشروبات..."
                />
              </div>

              {/* German Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('catalogDescDe')}
                </label>
                <textarea
                  rows="2"
                  dir="ltr"
                  value={formData.descriptionDe}
                  onChange={(e) => setFormData({ ...formData, descriptionDe: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition text-xs sm:text-sm"
                  placeholder="Optionale Beschreibung auf Deutsch..."
                />
              </div>

              {/* Arabic Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('catalogDescAr')}
                </label>
                <textarea
                  rows="2"
                  dir="rtl"
                  value={formData.descriptionAr}
                  onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-750 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition text-xs sm:text-sm text-right"
                  placeholder="وصف اختياري بالعربية..."
                />
              </div>

              {/* Modal Actions */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-3.5 sm:pt-4 border-t border-slate-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition cursor-pointer touch-manipulation text-center"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-xl shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingCategory ? t('update') : t('create')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Catalogs;
