// React 17+ JSX runtime doesn't require explicit React import
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { ThemeProvider } from './contexts/ThemeContext';
import { useTheme } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ConfirmEmailPage } from './pages/auth/ConfirmEmailPageSimple';
import { RegistrationSuccessPage } from './pages/auth/RegistrationSuccessPage';
import { PrivacyPolicyPage } from './pages/legal/PrivacyPolicyPageSimple';
import { TermsOfServicePage } from './pages/legal/TermsOfServicePageSimple';
import { FeedbackPage } from './pages/FeedbackPage';
import { TestPage } from './pages/TestPage';
import { WelcomePage } from './pages/WelcomePageSimple';
import { DashboardPage } from './pages/DashboardPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { QuotesPage } from './pages/QuotesPage';
import { QuotesPageSimple } from './pages/QuotesPageSimple';
import QuoteDetailPage from './pages/QuoteDetailPage';
import NewQuotePage from './pages/NewQuotePage';
import { ClientsPage } from './pages/ClientsPage';
import { ProductsPage } from './pages/ProductsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import SmtpSettingsPage from './pages/user/SmtpSettingsPage';
import ExpensesListPage from './pages/expenses/ExpensesListPage';
import ExpenseFormPage from './pages/expenses/ExpenseFormPage';
import { NotFoundPage } from './pages/NotFoundPage';
import PrintInvoicePage from './pages/PrintInvoicePage';
import { AdminLoginPage } from './pages/admin/LoginPage';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { UserSubscriptionsPage } from './pages/admin/UserSubscriptionsPage';
import { InvoicesPage as AdminInvoicesPage } from './pages/admin/InvoicesPage';
import { AnalyticsPage } from './pages/admin/AnalyticsPage';
import { BillingPage as AdminBillingPage } from './pages/admin/BillingPage';
import { SupportPage } from './pages/admin/SupportPage';
import { SettingsPage as AdminSettingsPage } from './pages/admin/SettingsPage';
import { BackupsPage } from './pages/admin/BackupsPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import { BillingPage as UserBillingPage } from './pages/settings/BillingPage';
import { PlansPage } from './pages/admin/PlansPage';

// Compact global theme toggle (only for authenticated pages)
const GlobalThemeToggle: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      onClick={toggleTheme}
      className="fixed right-4 bottom-4 z-[100] rounded-full shadow-md focus:outline-none focus:ring-2 transition-transform hover:scale-105"
      style={{
        backgroundColor: 'var(--color-surface-elevated)',
        color: 'var(--color-text-primary)',
        border: '1px solid var(--color-border-primary)',
        width: '42px',
        height: '42px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {isDark ? (
        // Sun icon (indicates you can switch back to light)
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" role="img" aria-hidden="true">
          <path d="M6.995 12c0 2.761 2.246 5.005 5.005 5.005s5.005-2.244 5.005-5.005S14.761 6.995 12 6.995 6.995 9.239 6.995 12zM12 2a1 1 0 0 1 1 1v1.25a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1zm0 17.75a1 1 0 0 1 1 1V22a1 1 0 1 1-2 0v-1.25a1 1 0 0 1 1-1zM3 11h1.25a1 1 0 1 1 0 2H3a1 1 0 1 1 0-2zm16.75 0H21a1 1 0 1 1 0 2h-1.25a1 1 0 1 1 0-2zM5.404 4.696a1 1 0 0 1 1.414 0l.884.884a1 1 0 1 1-1.414 1.415l-.884-.885a1 1 0 0 1 0-1.414zm10.894.884.884-.884a1 1 0 1 1 1.414 1.414l-.884.885a1 1 0 1 1-1.414-1.415zM5.404 18.596a1 1 0 0 1 1.414 0l.884.884a1 1 0 0 1-1.414 1.414l-.884-.884a1 1 0 0 1 0-1.414zm10.894.884.884.884a1 1 0 0 1-1.414 1.414l-.884-.884a1 1 0 1 1 1.414-1.414z"/>
        </svg>
      ) : (
        // Moon icon (indicates you can switch to dark)
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" role="img" aria-hidden="true">
          <path d="M21.752 15.002A9 9 0 0 1 9.002 2.252 9.003 9.003 0 1 0 21.752 15.002z"/>
        </svg>
      )}
    </button>
  );
};

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="simplifaq-theme">
      <Router>
        <Routes>
          {/* COMPLETELY PUBLIC ROUTES - NO HOOKS, NO AUTH PROVIDER, NO THEME TOGGLE */}
          <Route path="/test" element={<TestPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/auth/confirm-email" element={<ConfirmEmailPage />} />
          <Route path="/auth/registration-success" element={<RegistrationSuccessPage />} />

          {/* AUTHENTICATED ROUTES - SEPARATE STRUCTURE */}
          <Route path="/login" element={
            <AuthProvider>
              <AdminAuthProvider>
                <div className="App min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
                  <ProtectedRoute requireAuth={false} redirectTo="/dashboard">
                    <LoginPage />
                  </ProtectedRoute>
                  <GlobalThemeToggle />
                </div>
              </AdminAuthProvider>
            </AuthProvider>
          } />

          <Route path="/register" element={
            <AuthProvider>
              <AdminAuthProvider>
                <div className="App min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
                  <ProtectedRoute requireAuth={false} redirectTo="/dashboard">
                    <RegisterPage />
                  </ProtectedRoute>
                  <GlobalThemeToggle />
                </div>
              </AdminAuthProvider>
            </AuthProvider>
          } />

          {/* ADMIN ROUTES */}
          <Route path="/admin/*" element={
            <AuthProvider>
              <AdminAuthProvider>
                <div className="App min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
                  <Routes>
                    <Route path="login" element={<AdminLoginPage />} />
                    <Route path="" element={<AdminLayout />}>
                      <Route index element={<Navigate to="/admin/dashboard" replace />} />
                      <Route path="dashboard" element={<AdminDashboard />} />
                      <Route path="users" element={<UserManagementPage />} />
                      <Route path="subscriptions" element={<UserSubscriptionsPage />} />
                      <Route path="invoices" element={<AdminInvoicesPage />} />
                      <Route path="analytics" element={<AnalyticsPage />} />
                      <Route path="billing" element={<AdminBillingPage />} />
                      <Route path="support" element={<SupportPage />} />
                      <Route path="settings" element={<AdminSettingsPage />} />
                      <Route path="backup-manager" element={<BackupsPage />} />
                    </Route>
                  </Routes>
                  <GlobalThemeToggle />
                </div>
              </AdminAuthProvider>
            </AuthProvider>
          } />

          {/* PRIVATE USER ROUTES */}
          <Route path="/dashboard" element={
            <AuthProvider>
              <AdminAuthProvider>
                <div className="App min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                  <GlobalThemeToggle />
                </div>
              </AdminAuthProvider>
            </AuthProvider>
          } >
            <Route index element={<DashboardPage />} />
          </Route>

          <Route path="/invoices/*" element={
            <AuthProvider>
              <AdminAuthProvider>
                <div className="App min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                  <GlobalThemeToggle />
                </div>
              </AdminAuthProvider>
            </AuthProvider>
          } >
            <Route index element={<InvoicesPage />} />
            <Route path=":id/print" element={<PrintInvoicePage />} />
          </Route>

          <Route path="/quotes/*" element={
            <AuthProvider>
              <AdminAuthProvider>
                <div className="App min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                  <GlobalThemeToggle />
                </div>
              </AdminAuthProvider>
            </AuthProvider>
          } >
            <Route index element={<QuotesPage />} />
            <Route path="new" element={<NewQuotePage />} />
            <Route path=":id" element={<QuoteDetailPage />} />
            <Route path=":id/edit" element={<NewQuotePage />} />
          </Route>

          <Route path="/clients" element={
            <AuthProvider>
              <AdminAuthProvider>
                <div className="App min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                  <GlobalThemeToggle />
                </div>
              </AdminAuthProvider>
            </AuthProvider>
          } >
            <Route index element={<ClientsPage />} />
          </Route>

          <Route path="/plans" element={
            <AuthProvider>
              <AdminAuthProvider>
                <div className="App min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                  <GlobalThemeToggle />
                </div>
              </AdminAuthProvider>
            </AuthProvider>
          } >
            <Route index element={<PlansPage />} />
          </Route>

          <Route path="/products" element={
            <AuthProvider>
              <AdminAuthProvider>
                <div className="App min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                  <GlobalThemeToggle />
                </div>
              </AdminAuthProvider>
            </AuthProvider>
          } >
            <Route index element={<ProductsPage />} />
          </Route>

          <Route path="/reports" element={
            <AuthProvider>
              <AdminAuthProvider>
                <div className="App min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                  <GlobalThemeToggle />
                </div>
              </AdminAuthProvider>
            </AuthProvider>
          } >
            <Route index element={<ReportsPage />} />
          </Route>

          <Route path="/expenses/*" element={
            <AuthProvider>
              <AdminAuthProvider>
                <div className="App min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                  <GlobalThemeToggle />
                </div>
              </AdminAuthProvider>
            </AuthProvider>
          } >
            <Route index element={<ExpensesListPage />} />
            <Route path="new" element={<ExpenseFormPage />} />
            <Route path=":id/edit" element={<ExpenseFormPage />} />
          </Route>

          <Route path="/charges" element={
            <AuthProvider>
              <AdminAuthProvider>
                <div className="App min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                  <GlobalThemeToggle />
                </div>
              </AdminAuthProvider>
            </AuthProvider>
          } >
            <Route index element={<ExpensesListPage />} />
          </Route>

          <Route path="/settings/*" element={
            <AuthProvider>
              <AdminAuthProvider>
                <div className="App min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                  <GlobalThemeToggle />
                </div>
              </AdminAuthProvider>
            </AuthProvider>
          } >
            <Route index element={<SettingsPage />} />
            <Route path="smtp" element={<SmtpSettingsPage />} />
          </Route>

          {/* Redirect root to welcome */}
          <Route index element={<Navigate to="/welcome" replace />} />

          {/* 404 catch-all */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
