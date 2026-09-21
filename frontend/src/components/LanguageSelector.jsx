import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Globe, Check } from 'lucide-react';

export const LanguageSelector = () => {
  const { language, setLanguage, languages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = languages.find((l) => l.code === language) || languages[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl hover:bg-slate-100/80 dark:hover:bg-gray-850 dark:hover:border-gray-700 shadow-2xs transition"
        title={language === 'ar' ? 'تغيير اللغة' : 'Sprache ändern'}
        aria-label={language === 'ar' ? 'تغيير اللغة' : 'Sprache ändern'}
      >
        <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="font-semibold uppercase">{currentLang.code}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
          {currentLang.nativeName}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-48 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3.5 py-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-gray-800">
            Sprache / اللغة
          </div>
          {languages.map((l) => {
            const isSelected = l.code === language;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  setLanguage(l.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm text-left rtl:text-right transition ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-800/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-gray-800 font-bold text-slate-600 dark:text-slate-300">
                    {l.code}
                  </span>
                  <span>{l.nativeName}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
