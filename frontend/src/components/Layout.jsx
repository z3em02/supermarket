import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Menu, 
  X, 
  LogOut,
  Building2,
  Store,
  Layers,
  Settings,
  Sparkles,
  Lock
} from 'lucide-react';
import { LanguageSelector } from './LanguageSelector';
import { ThemeToggle } from './ThemeToggle';
import { useNavigate } from 'react-router-dom';

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { t, language, direction } = useLanguage();
  const { settings, getStoreName } = useStoreSettings();
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    { name: t('dashboard'), href: '/secret/admin/dashboard', icon: LayoutDashboard },
    { name: t('catalogs'),  href: '/secret/admin/catalogs',  icon: Layers },
    { name: t('products'),  href: '/secret/admin/products',  icon: Package },
    { name: t('promotions'), href: '/secret/admin/promotions', icon: Sparkles },
    { name: t('publicCatalog'), href: '/', icon: Store },
    { name: t('orders'),    href: '/secret/admin/orders',    icon: ShoppingCart },
    { name: t('customers'), href: '/secret/admin/customers', icon: Users },
    { name: t('accounting'), href: '/secret/admin/accounting', icon: TrendingUp },
    { name: t('settings'),   href: '/secret/admin/settings',   icon: Settings },
  ];

  const handleLogout = () => {
    logout();
  };

  const handleLockSections = () => {
    sessionStorage.removeItem('admin_section_unlocked');
    navigate('/secret/admin/dashboard');
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 transition-colors duration-200">
      {/* Brand / Logo */}
      <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-gray-850">
        <div className="flex items-center gap-3 min-w-0">
          {settings?.logoUrl ? (
            <img 
              src={settings.logoUrl} 
              alt={getStoreName(language)} 
              className="w-10 h-10 object-contain rounded-xl bg-slate-50 dark:bg-gray-900 p-1 border border-slate-200/60 dark:border-gray-800 shrink-0" 
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight truncate">
              {getStoreName(language) || t('appName')}
            </h1>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Supermarkt &amp; Lieferservice</span>
          </div>
        </div>
        <button 
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-850"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`
                flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-150
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 dark:bg-blue-600 dark:text-white dark:shadow-blue-900/40' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-gray-900 dark:hover:text-white'
                }
              `}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User info & Logout */}
      <div className="p-4 border-t border-slate-100 dark:border-gray-850 bg-slate-50/70 dark:bg-gray-900/60">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950 border border-blue-200/60 dark:border-blue-900/50 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm">
            {user?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {user?.name || 'Admin'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {user?.email || 'admin@supermarket.com'}
            </p>
          </div>
        </div>
        <button
          onClick={handleLockSections}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 mb-1.5 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition cursor-pointer"
        >
          <Lock className="w-4 h-4" />
          <span>{language === 'ar' ? 'الأقسام الحساسة قفل' : 'Bereiche sperren'}</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-200">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div 
        className={`
          fixed inset-y-0 start-0 z-50 w-72 max-w-[85vw] transform transition-transform duration-300 ease-in-out lg:hidden shadow-2xl
          ${sidebarOpen ? 'translate-x-0' : (direction === 'rtl' ? 'translate-x-full' : '-translate-x-full')}
        `}
      >
        {navContent}
      </div>

      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:h-screen lg:sticky lg:top-0 border-r border-slate-200/80 dark:border-gray-850 rtl:border-r-0 rtl:border-l shadow-xs">
        {navContent}
      </aside>

      {/* Main Content Flow */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="bg-white/85 dark:bg-gray-950/85 backdrop-blur-md border-b border-slate-200/80 dark:border-gray-850 sticky top-0 z-30 transition-colors duration-200">
          <div className="flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3.5 gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-850 shrink-0 touch-manipulation"
                aria-label="Open sidebar menu"
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                {navigation.find(item => item.href === location.pathname)?.name || t('dashboard')}
              </h2>
            </div>
            
            {/* Controls: Language Selector & Theme Toggle */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <LanguageSelector />
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};