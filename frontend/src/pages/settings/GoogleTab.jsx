import {
  Navigation,
  ExternalLink,
  Star,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useStoreSettings } from '../../context/StoreSettingsContext';

export const GoogleTab = ({
  formData,
  handleChange,
  handleDeleteReview,
  handleSyncGoogle,
  syncFeedback,
  syncing
}) => {
  const { t, language, direction } = useLanguage();
  const { settings, reviews, reviewsLoading } = useStoreSettings();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Google Integration & Scraper Settings */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-2xl border border-slate-200/80 dark:border-gray-850 p-5 sm:p-7 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-gray-800">
          <div className="w-9 h-9 rounded-xl bg-warning-50 dark:bg-warning-950/50 text-warning-600 dark:text-warning-400 flex items-center justify-center shrink-0">
            <Navigation className="w-4 h-4" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            {t('googleMaps')} & {t('googleReviews')}
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300">
                {t('mapsUrl')}
              </label>
              {formData.mapUrl && (
                <a
                  href={formData.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 inline-flex items-center gap-1 font-semibold"
                >
                  <span>Vorschau</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <input
              type="url"
              value={formData.mapUrl}
              onChange={(e) => handleChange('mapUrl', e.target.value)}
              placeholder={t('mapsUrlPlaceholder')}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-1.5">
              {t('mapsEmbedUrl')}
            </label>
            <input
              type="text"
              value={formData.mapEmbedUrl}
              onChange={(e) => handleChange('mapEmbedUrl', e.target.value)}
              placeholder={t('mapsEmbedUrlPlaceholder')}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 focus:outline-none transition"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300">
                {t('googleReviewsUrl')}
              </label>
              {formData.googleReviewsUrl && (
                <a
                  href={formData.googleReviewsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-warning-600 hover:text-warning-700 dark:text-warning-400 inline-flex items-center gap-1 font-semibold"
                >
                  <span>Vorschau</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <input
              type="url"
              value={formData.googleReviewsUrl}
              onChange={(e) => handleChange('googleReviewsUrl', e.target.value)}
              placeholder={t('googleReviewsUrlPlaceholder')}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 focus:outline-none transition"
            />
          </div>

          {/* Scraper Metric Card */}
          <div className="p-4 rounded-2xl bg-warning-500/5 dark:bg-warning-950/20 border border-warning-200/60 dark:border-warning-900/40 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-warning-700 dark:text-warning-400 block mb-1">
                {language === 'ar' ? 'التقييم الحالي في Google' : 'Aktuelle Google-Bewertung'}
              </span>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-warning-400 text-warning-400" />
                <span className="text-lg font-black text-slate-900 dark:text-white">
                  {settings?.googleRating ? Number(settings.googleRating).toFixed(1) : '5.0'}
                </span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {settings?.googleReviewCount || 0} {language === 'ar' ? 'تقييم' : 'Bewertungen'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSyncGoogle}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs text-white bg-success-600 hover:bg-success-700 active:bg-success-800 disabled:opacity-50 shadow-sm transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? (language === 'ar' ? 'جارٍ الجلب...' : 'Wird abgerufen...') : (language === 'ar' ? 'تحديث الآن' : 'Jetzt synchronisieren')}</span>
            </button>
          </div>

          {syncFeedback && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              syncFeedback.type === 'success'
                ? 'bg-success-50 dark:bg-success-950/40 text-success-700 dark:text-success-300 border border-success-200 dark:border-success-800'
                : 'bg-danger-50 dark:bg-danger-950/40 text-danger-700 dark:text-danger-300 border border-danger-200 dark:border-danger-800'
            }`}>
              {syncFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{syncFeedback.text}</span>
            </div>
          )}
        </div>
      </div>

      {/* Google Reviews Management */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-2xl border border-slate-200/80 dark:border-gray-850 p-5 sm:p-7 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-warning-50 dark:bg-warning-950/50 text-warning-600 dark:text-warning-400 flex items-center justify-center shrink-0">
              <Star className="w-4 h-4 fill-warning-400 text-warning-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {t('manageGoogleReviews')}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-gray-400">
                {reviews.length} {language === 'ar' ? 'تقييمات معروضة في الموقع' : 'aktive Rezensionen auf der Website'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 bg-slate-50 dark:bg-gray-950 px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-gray-800">
            <span className="text-xs font-bold text-slate-700 dark:text-gray-300">
              {t('showGoogleReviews')}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={formData.showGoogleReviews}
              onClick={() => handleChange('showGoogleReviews', !formData.showGoogleReviews)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none touch-manipulation ${
                formData.showGoogleReviews ? 'bg-primary-600' : 'bg-slate-300 dark:bg-gray-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                  formData.showGoogleReviews ? (direction === 'rtl' ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {reviewsLoading ? (
          <div className="py-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <span>{t('loading')}</span>
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs bg-slate-50 dark:bg-gray-950 rounded-2xl border border-dashed border-slate-200 dark:border-gray-800 p-4">
            <p>{language === 'ar' ? 'لا توجد تقييمات حالياً.' : 'Keine Rezensionen vorhanden.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {reviews.map((rev) => {
              const text = language === 'ar' ? (rev.textAr || rev.text) : (rev.textDe || rev.text);
              const ratingNum = Math.min(5, Math.max(1, rev.rating || 5));
              return (
                <div
                  key={rev.id}
                  className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-gray-950 border border-slate-200/70 dark:border-gray-800 flex flex-col justify-between gap-3 relative group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {rev.authorPhotoUrl ? (
                          <img
                            src={rev.authorPhotoUrl}
                            alt={rev.authorName}
                            className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-gray-700 shrink-0"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(rev.authorName)}&background=3b82f6&color=fff`;
                            }}
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {rev.authorName ? rev.authorName.slice(0, 2).toUpperCase() : 'G'}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate">
                            {rev.authorName}
                          </h4>
                          <span className="text-[10px] text-slate-500">
                            {rev.relativeTime || 'Kürzlich'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteReview(rev.id)}
                        className="text-slate-300 hover:text-danger-600 p-1 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-950/40 transition cursor-pointer"
                        title={t('deleteReview')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-0.5 mb-1.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < ratingNum
                              ? 'fill-warning-400 text-warning-400'
                              : 'text-slate-300 dark:text-gray-700'
                          }`}
                        />
                      ))}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-gray-300 line-clamp-3 leading-relaxed">
                      {text || 'Kein Text vorhanden'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
