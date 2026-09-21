import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl hover:bg-slate-100/80 dark:hover:bg-gray-850 dark:hover:border-gray-700 shadow-2xs transition"
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle Theme"
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-slate-700" />
      )}
    </button>
  );
};
