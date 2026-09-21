import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { StoreSettingsProvider } from './context/StoreSettingsContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { CustomerLogin } from './pages/CustomerLogin';
import { CustomerRegister } from './pages/CustomerRegister';
import { CustomerAccount } from './pages/CustomerAccount';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Orders } from './pages/Orders';
import { Accounting } from './pages/Accounting';
import { Catalog } from './pages/Catalog';
import { Catalogs } from './pages/Catalogs';
import { Settings } from './pages/Settings';
import { LandingPage } from './pages/LandingPage';
import { Customers } from './pages/Customers';
import { Impressum } from './pages/Impressum';
import { Datenschutz } from './pages/Datenschutz';

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

                  {/* Legal Pages (Austria compliance) */}
                  <Route path="/impressum" element={<Impressum />} />
                  <Route path="/copyright" element={<Navigate to="/impressum" replace />} />
                  <Route path="/datenschutz" element={<Datenschutz />} />
                  <Route path="/privacy" element={<Navigate to="/datenschutz" replace />} />

                {/* Secret Admin Login */}
                <Route path={`${ADMIN}/login`} element={<Login />} />

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
                  <Route path={`${ADMIN}/dashboard`}  element={<Dashboard />} />
                  <Route path={`${ADMIN}/catalogs`}   element={<Catalogs />} />
                  <Route path={`${ADMIN}/categories`} element={<Navigate to={`${ADMIN}/catalogs`} replace />} />
                  <Route path={`${ADMIN}/products`}   element={<Products />} />
                  <Route path={`${ADMIN}/orders`}     element={<Orders />} />
                  <Route path={`${ADMIN}/customers`}  element={<Customers />} />
                  <Route path={`${ADMIN}/accounting`} element={<Accounting />} />
                  <Route path={`${ADMIN}/settings`}   element={<Settings />} />
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