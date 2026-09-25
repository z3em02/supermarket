import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageSelector } from '../components/LanguageSelector';
import { Wrench, Phone, Mail } from 'lucide-react';

// Shown instead of the customer-facing storefront while
// StoreSettings.maintenanceMode is active (backend/controllers/settingsController.js).
// Deliberately doesn't import or render any storefront page — a broken
// component elsewhere in the app must not be able to break this fallback too.
export const MaintenancePage = () => {
  const { language, direction } = useLanguage();
  const { settings, getStoreName } = useStoreSettings();
  const isAr = language === 'ar';

  const storeName = getStoreName(language) || 'Hajar Supermarkt';
  const phone = settings?.phone;
  const email = settings?.email;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-gray-100 px-4 text-center"
      dir={direction}
    >
      <div className="absolute top-4 end-4 flex items-center gap-2">
        <ThemeToggle />
        <LanguageSelector />
      </div>

      <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-6">
        <Wrench className="w-8 h-8" />
      </div>

      <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2">
        {storeName}
      </h1>

      <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-gray-200 mb-3">
        {isAr ? 'نحن غير متاحين حالياً' : 'Wir sind gerade nicht erreichbar'}
      </h2>

      <p className="text-sm text-slate-500 dark:text-gray-400 max-w-md mb-6">
        {isAr
          ? 'نعمل حالياً على تحسين المتجر. يرجى المحاولة مرة أخرى بعد قليل — نعتذر عن الإزعاج.'
          : 'Wir arbeiten gerade an Verbesserungen für unseren Shop. Bitte versuchen Sie es in Kürze erneut — wir entschuldigen uns für die Unannehmlichkeiten.'}
      </p>

      {(phone || email) && (
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-600 dark:text-gray-300">
          {phone && (
            <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 hover:text-emerald-600 dark:hover:text-emerald-400 transition">
              <Phone className="w-3.5 h-3.5" />
              <span>{phone}</span>
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 hover:text-emerald-600 dark:hover:text-emerald-400 transition">
              <Mail className="w-3.5 h-3.5" />
              <span>{email}</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
};
