import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { StoreSettingsProvider } from './context/StoreSettingsContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

// Public customer storefront pages (eager loaded for instant first paint)
import { LandingPage } from './pages/LandingPage';
import { CustomerLogin } from './pages/CustomerLogin';
import { CustomerRegister } from './pages/CustomerRegister';
import { CustomerAccount } from './pages/CustomerAccount';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Impressum } from './pages/Impressum';
import { Datenschutz } from './pages/Datenschutz';

// Admin and back-office pages (lazy loaded to minimize customer bundle size)
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Products = lazy(() => import('./pages/Products').then(m => ({ default: m.Products })));
const Orders = lazy(() => import('./pages/Orders').then(m => ({ default: m.Orders })));
const Accounting = lazy(() => import('./pages/Accounting').then(m => ({ default: m.Accounting })));
const Catalogs = lazy(() => import('./pages/Catalogs').then(m => ({ default: m.Catalogs })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Customers = lazy(() => import('./pages/Customers').then(m => ({ default: m.Customers })));

const PageLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

const ADMIN = '/secret/admin';

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
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/catalog" element={<LandingPage />} />
                  <Route path="/shop" element={<LandingPage />} />

                  {/* Customer Home Delivery Portal */}
                  <Route path="/login" element={<CustomerLogin />} />
                  <Route path="/customer/login" element={<CustomerLogin />} />
                  <Route path="/register" element={<CustomerRegister />} />
                  <Route path="/customer/register" element={<CustomerRegister />} />
                  <Route path="/account" element={<CustomerAccount />} />
                  <Route path="/customer/account" element={<CustomerAccount />} />
                  <Route path="/customer/orders" element={<Navigate to="/account" replace />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />

                  {/* Legal Pages (Austria compliance) */}
                  <Route path="/impressum" element={<Impressum />} />
                  <Route path="/copyright" element={<Navigate to="/impressum" replace />} />
                  <Route path="/datenschutz" element={<Datenschutz />} />
                  <Route path="/privacy" element={<Navigate to="/datenschutz" replace />} />

                {/* Secret Admin Login */}
                <Route path={`${ADMIN}/login`} element={<Suspense fallback={<PageLoader />}><Login /></Suspense>} />

                {/* Secret Admin Shortcuts & Protected Routes — all under /secret/admin/* */}
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
                  <Route path={`${ADMIN}/orders`}     element={<Suspense fallback={<PageLoader />}><Orders /></Suspense>} />
                  <Route path={`${ADMIN}/customers`}  element={<Suspense fallback={<PageLoader />}><Customers /></Suspense>} />
                  <Route path={`${ADMIN}/accounting`} element={<Suspense fallback={<PageLoader />}><Accounting /></Suspense>} />
                  <Route path={`${ADMIN}/settings`}   element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
                </Route>

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