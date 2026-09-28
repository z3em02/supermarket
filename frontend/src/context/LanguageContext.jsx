import { createContext, useContext, useState, useEffect } from 'react';
import { de } from './translations/de';
import { ar } from './translations/ar';

const LANGUAGES = [
  { code: 'de', label: 'Deutsch', nativeName: 'Deutsch', dir: 'ltr' },
  { code: 'ar', label: 'العربية', nativeName: 'العربية', dir: 'rtl' }
];

const translations = { de, ar };

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const savedLang = localStorage.getItem('language');
    return savedLang === 'ar' ? 'ar' : 'de';
  });

  const direction = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
  }, [language, direction]);

  const t = (key) => {
    return translations[language]?.[key] || translations['de']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, direction, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};