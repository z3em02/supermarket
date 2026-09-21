import React from 'react';
import { Star, CheckCircle2, ExternalLink, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function TrustindexWidget({ 
  settings = {}, 
  reviews = [] 
}) {
  const { language, t } = useLanguage();

  const ratingNum = settings?.googleRating || 5.0;
  const countNum = settings?.googleReviewCount || 0;

  return (
    <div className="w-full space-y-10">
      {/* Google Trust Badge Header */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-xs font-bold tracking-wide uppercase mb-4 shadow-xs">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>
            {language === 'ar' ? 'تقييمات موثقة من Google' : 'Verifizierte Google-Bewertungen'}
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          {t('googleReviewsTitle')}
        </h2>
        <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400">
          {t('googleReviewsSubtitle')}
        </p>

        {/* Live Rating Pill */}
        <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3 px-6 py-3 rounded-2xl bg-white dark:bg-gray-850 border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <span className="text-lg font-black text-slate-900 dark:text-white">
            {ratingNum ? ratingNum.toFixed(1) : '5.0'} / 5.0
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {countNum === 1
              ? (language === 'ar' ? 'تقييم حقيقي واحد' : '1 echte Bewertung')
              : `${countNum} ${language === 'ar' ? (countNum <= 10 ? 'تقييمات حقيقية' : 'تقييم حقيقي') : 'echte Bewertungen'}`}
          </span>
          {settings?.googleReviewsUrl && (
            <a
              href={settings.googleReviewsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ms-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 underline underline-offset-2"
            >
              <span>{t('writeGoogleReview')}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Review Cards Grid */}
      {reviews && reviews.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review) => {
            const reviewText = language === 'ar'
              ? (review.textAr || review.text)
              : (review.textDe || review.text);
            const stars = Math.min(5, Math.max(1, review.rating || 5));

            return (
              <div
                key={review.id}
                className="bg-white dark:bg-gray-850 rounded-3xl p-6 border border-slate-200/80 dark:border-gray-850 shadow-xs hover:shadow-md transition flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Author Row */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {review.authorPhotoUrl ? (
                        <img
                          src={review.authorPhotoUrl}
                          alt={review.authorName}
                          className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-gray-700"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(review.authorName)}&background=10b981&color=fff`;
                          }}
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                          {review.authorName ? review.authorName.slice(0, 2).toUpperCase() : 'G'}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                            {review.authorName}
                          </h4>
                          <span 
                            className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center" 
                            title="Google Verifiziert"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {review.relativeTime || (language === 'ar' ? 'عميل موثق' : 'Verifizierter Kunde')}
                        </span>
                      </div>
                    </div>

                    {/* Google Icon */}
                    <svg className="w-5 h-5 opacity-90 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-1">
                    {[...Array(stars)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  {/* Review Text */}
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                    "{reviewText}"
                  </p>
                </div>

                {/* Bottom Google Badge */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Google Rezension</span>
                  </span>
                  {(review.reviewUrl || settings?.googleReviewsUrl) && (
                    <a
                      href={review.reviewUrl || settings?.googleReviewsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                    >
                      <span>Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 px-4 text-center bg-white dark:bg-gray-850 rounded-3xl border border-dashed border-slate-200 dark:border-gray-800 max-w-2xl mx-auto">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {language === 'ar'
              ? 'لا توجد تقييمات معروضة حالياً. يمكنك مزامنتها مباشرة من لوحة التحكم.'
              : 'Aktuell sind noch keine Bewertungen synchronisiert. Sie können diese über das Admin-Dashboard mit einem Klick von Google abrufen.'}
          </p>
        </div>
      )}

      {/* Bottom Action Buttons */}
  
    </div>
  );
}
