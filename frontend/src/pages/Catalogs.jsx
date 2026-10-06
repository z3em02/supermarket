import { useEffect, useState, useMemo } from 'react';
import axios from '../utils/adminAxios';
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
  FolderOpen
} from 'lucide-react';
import { useToast, useConfirm } from '../context/FeedbackContext';
import { Button, EmptyState, IconButton, Input, Modal, SkeletonList, Textarea } from '../components/ui';

export const Catalogs = () => {
  const { t, language } = useLanguage();
  const toast = useToast();
  const confirm = useConfirm();
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
      const response = await axios.get(`/api/categories`);
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

      if (editingCategory) {
        await axios.put(`/api/categories/${editingCategory.id}`, formData);
      } else {
        await axios.post(`/api/categories`, formData);
      }

      setShowModal(false);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(error.response?.data?.error || t('saveCatalogError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!(await confirm({ message: t('confirmDeleteCatalog'), confirmText: t('delete'), variant: 'danger' }))) return;

    try {
      await axios.delete(`/api/categories/${cat.id}`);
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(error.response?.data?.error || t('deleteCatalogError'));
    }
  };

  if (loading) {
    return <SkeletonList count={6} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-heading-xl flex items-center gap-2.5">
            <Layers className="w-5 sm:w-6 h-5 sm:h-6 text-primary-600 dark:text-primary-400 shrink-0" />
            <span>{t('catalogs')}</span>
          </h1>
          <p className="text-body-muted mt-0.5 sm:mt-1">
            {t('manageCatalogs')}
          </p>
        </div>

        <Button icon={Plus} onClick={handleOpenAddModal} className="w-full sm:w-auto">
          {t('addCatalog')}
        </Button>
      </div>

      {/* Stats summary banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-900 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 dark:border-gray-800 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary-50 dark:bg-primary-950/70 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-900/50 flex items-center justify-center shrink-0">
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

        <div className="bg-white dark:bg-gray-900 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 dark:border-gray-800 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-success-50 dark:bg-success-950/70 text-success-600 dark:text-success-400 border border-success-100 dark:border-success-900/50 flex items-center justify-center shrink-0">
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
        <Input
          icon={Search}
          type="text"
          aria-label={t('search')}
          placeholder={`${t('search')} (Deutsch / العربية)...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pe-11"
        />
        {searchTerm && (
          <IconButton icon={X} label={language === 'ar' ? 'مسح البحث' : 'Suche leeren'} onClick={() => setSearchTerm('')} className="absolute end-0 top-0" />
        )}
      </div>

      {/* Category Cards Grid */}
      {filteredCategories.length === 0 ? (
        <EmptyState icon={FolderOpen} title={t('noCatalogsFound')} description={t('adjustFiltersHint')} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-800 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/70 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-900/50 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-gray-750">
                    <Package className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                    <span>{cat._count?.products || 0} {t('items')}</span>
                  </span>
                </div>

                {/* Bilingual Titles */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">DE</span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate text-start flex-1" title={cat.nameDe}>
                      {cat.nameDe}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-success-600 dark:text-success-400 uppercase tracking-wider">AR</span>
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
                <Button variant="secondary" size="sm" icon={Edit} onClick={() => handleOpenEditModal(cat)} className="flex-1 sm:flex-none">
                  {t('edit')}
                </Button>
                <Button variant="secondary" size="sm" icon={Trash2} onClick={() => handleDelete(cat)}
                  className="flex-1 sm:flex-none !text-danger-600 dark:!text-danger-400 hover:!bg-danger-50 dark:hover:!bg-danger-950/40">
                  {t('delete')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCategory ? t('editCatalog') : t('addCatalog')}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>{t('cancel')}</Button>
            <Button type="submit" form="catalog-form" icon={Check} loading={submitting}>
              {editingCategory ? t('update') : t('create')}
            </Button>
          </>
        )}
      >
        <form id="catalog-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={`${t('catalogNameDe')} *`}
            type="text"
            required
            dir="ltr"
            value={formData.nameDe}
            onChange={(e) => setFormData({ ...formData, nameDe: e.target.value })}
            placeholder="z. B. Trockenwaren, Getränke..."
          />
          <Input
            label={`${t('catalogNameAr')} *`}
            type="text"
            required
            dir="rtl"
            value={formData.nameAr}
            onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
            placeholder="مثال: بضائع جافة، مشروبات..."
          />
          <Textarea
            label={t('catalogDescDe')}
            rows="2"
            dir="ltr"
            value={formData.descriptionDe}
            onChange={(e) => setFormData({ ...formData, descriptionDe: e.target.value })}
            placeholder="Optionale Beschreibung auf Deutsch..."
          />
          <Textarea
            label={t('catalogDescAr')}
            rows="2"
            dir="rtl"
            value={formData.descriptionAr}
            onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
            placeholder="وصف اختياري بالعربية..."
          />
        </form>
      </Modal>
    </div>
  );
};

export default Catalogs;
