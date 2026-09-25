import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { StoreSettingsProvider } from './context/StoreSettingsContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { SectionPasscodeGate } from './components/SectionPasscodeGate';
import { Layout } from './components/Layout';
import { ADMIN_BASE } from './config/adminPath';
import { useStoreSettings } from './context/StoreSettingsContext';

// Public customer storefront pages (eager loaded for instant first paint)
import { LandingPage } from './pages/LandingPage';
import { CustomerLogin } from './pages/CustomerLogin';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Impressum } from './pages/Impressum';
import { Datenschutz } from './pages/Datenschutz';
import { AGB } from './pages/AGB';
import { MaintenancePage } from './pages/MaintenancePage';

// Swaps in the maintenance page instead of a customer-facing route's normal
// content while StoreSettings.maintenanceMode is on. Only wraps storefront/
// account routes — admin routes (so staff can turn it back off), the driver
// portal (so in-flight deliveries can still be completed), and the legal
// pages (Impressum must stay reachable by law) are never wrapped with this.
const MaintenanceGate = ({ children }) => {
  const { settings } = useStoreSettings();
  return settings?.maintenanceMode ? <MaintenancePage /> : children;
};

// CustomerRegister and CustomerAccount both import Firebase Auth (phone
// verification / push notifications) — lazy-loading them keeps that SDK out
// of the bundle every anonymous landing-page visitor downloads before first
// paint, since it's only needed once someone actually registers or opens
// their account.
const CustomerRegister = lazy(() => import('./pages/CustomerRegister').then(m => ({ default: m.CustomerRegister })));
const CustomerAccount = lazy(() => import('./pages/CustomerAccount').then(m => ({ default: m.CustomerAccount })));

// Admin and back-office pages (lazy loaded to minimize customer bundle size)
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Products = lazy(() => import('./pages/Products').then(m => ({ default: m.Products })));
const Orders = lazy(() => import('./pages/Orders').then(m => ({ default: m.Orders })));
const Accounting = lazy(() => import('./pages/Accounting').then(m => ({ default: m.Accounting })));
const Catalogs = lazy(() => import('./pages/Catalogs').then(m => ({ default: m.Catalogs })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Customers = lazy(() => import('./pages/Customers').then(m => ({ default: m.Customers })));
const Promotions = lazy(() => import('./pages/Promotions').then(m => ({ default: m.Promotions })));
const AuditLog = lazy(() => import('./pages/AuditLog').then(m => ({ default: m.AuditLog })));
const DriverDeliveryView = lazy(() => import('./pages/DriverDeliveryView').then(m => ({ default: m.DriverDeliveryView })));

const PageLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

const ADMIN = ADMIN_BASE;

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <StoreSettingsProvider>
          <AuthProvider>
            <CustomerAuthProvider>
              <Router>
                <Routes>
                  {/* Public Storefront & Catalog */}
                  <Route path="/" element={<MaintenanceGate><LandingPage /></MaintenanceGate>} />
                  <Route path="/catalog" element={<MaintenanceGate><LandingPage /></MaintenanceGate>} />
                  <Route path="/shop" element={<MaintenanceGate><LandingPage /></MaintenanceGate>} />

                  {/* Customer Home Delivery Portal */}
                  <Route path="/login" element={<MaintenanceGate><CustomerLogin /></MaintenanceGate>} />
                  <Route path="/customer/login" element={<MaintenanceGate><CustomerLogin /></MaintenanceGate>} />
                  <Route path="/register" element={<MaintenanceGate><Suspense fallback={<PageLoader />}><CustomerRegister /></Suspense></MaintenanceGate>} />
                  <Route path="/customer/register" element={<MaintenanceGate><Suspense fallback={<PageLoader />}><CustomerRegister /></Suspense></MaintenanceGate>} />
                  <Route path="/account" element={<MaintenanceGate><Suspense fallback={<PageLoader />}><CustomerAccount /></Suspense></MaintenanceGate>} />
                  <Route path="/customer/account" element={<MaintenanceGate><Suspense fallback={<PageLoader />}><CustomerAccount /></Suspense></MaintenanceGate>} />
                  <Route path="/customer/orders" element={<Navigate to="/account" replace />} />
                  <Route path="/forgot-password" element={<MaintenanceGate><ForgotPassword /></MaintenanceGate>} />
                  <Route path="/reset-password" element={<MaintenanceGate><ResetPassword /></MaintenanceGate>} />

                  {/* Legal Pages (Austria compliance) */}
                  <Route path="/impressum" element={<Impressum />} />
                  <Route path="/copyright" element={<Navigate to="/impressum" replace />} />
                  <Route path="/datenschutz" element={<Datenschutz />} />
                  <Route path="/privacy" element={<Navigate to="/datenschutz" replace />} />
                  <Route path="/agb" element={<AGB />} />
                  <Route path="/terms" element={<Navigate to="/agb" replace />} />

                {/* Admin Login */}
                <Route path={`${ADMIN}/login`} element={<Suspense fallback={<PageLoader />}><Login /></Suspense>} />

                {/* Admin Shortcuts & Protected Routes — all under ADMIN_BASE/* */}
                <Route path={ADMIN} element={<Navigate to={`${ADMIN}/dashboard`} replace />} />
                <Route path={`${ADMIN}/`} element={<Navigate to={`${ADMIN}/dashboard`} replace />} />

                <Route
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route path={`${ADMIN}/dashboard`}  element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
                  <Route path={`${ADMIN}/catalogs`}   element={<Suspense fallback={<PageLoader />}><Catalogs /></Suspense>} />
                  <Route path={`${ADMIN}/categories`} element={<Navigate to={`${ADMIN}/catalogs`} replace />} />
                  <Route path={`${ADMIN}/products`}   element={<Suspense fallback={<PageLoader />}><Products /></Suspense>} />
                  <Route path={`${ADMIN}/promotions`} element={<SectionPasscodeGate><Suspense fallback={<PageLoader />}><Promotions /></Suspense></SectionPasscodeGate>} />
                  <Route path={`${ADMIN}/orders`}     element={<Suspense fallback={<PageLoader />}><Orders /></Suspense>} />
                  <Route path={`${ADMIN}/customers`}  element={<SectionPasscodeGate><Suspense fallback={<PageLoader />}><Customers /></Suspense></SectionPasscodeGate>} />
                  <Route path={`${ADMIN}/accounting`} element={<SectionPasscodeGate><Suspense fallback={<PageLoader />}><Accounting /></Suspense></SectionPasscodeGate>} />
                  <Route path={`${ADMIN}/settings`}   element={<SectionPasscodeGate><Suspense fallback={<PageLoader />}><Settings /></Suspense></SectionPasscodeGate>} />
                  <Route path={`${ADMIN}/audit-log`}  element={<SectionPasscodeGate><Suspense fallback={<PageLoader />}><AuditLog /></Suspense></SectionPasscodeGate>} />
                  <Route path={`${ADMIN}/driver`}     element={<Suspense fallback={<PageLoader />}><DriverDeliveryView /></Suspense>} />
                  <Route path={`${ADMIN}/delivery`}   element={<Navigate to={`${ADMIN}/driver`} replace />} />
                </Route>

                {/* Standalone mobile driver portal route for drivers on the road */}
                <Route
                  path="/driver"
                  element={
                    <Suspense fallback={<PageLoader />}><DriverDeliveryView /></Suspense>
                  }
                />
                <Route path="/delivery" element={<Navigate to="/driver" replace />} />

                {/* Fallback to main catalog */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </CustomerAuthProvider>
        </AuthProvider>
      </StoreSettingsProvider>
    </LanguageProvider>
  </ThemeProvider>
  );
}

export default App;