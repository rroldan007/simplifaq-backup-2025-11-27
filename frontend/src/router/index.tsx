import React from 'react';
import {BrowserRouter, Outlet, Route, Routes} from 'react-router-dom';
import {AuthProvider} from '../contexts/AuthContext';
import {AdminAuthProvider} from '../contexts/AdminAuthContext';

// Layout Components
import {Layout} from '../components/Layout';
import {ProtectedRoute} from '../components/ProtectedRoute';
import {ProtectedAdminRoute} from '../components/admin/ProtectedAdminRoute';

// Auth Pages
import {LoginPage} from '../pages/auth/LoginPage';
import {RegisterPage} from '../pages/auth/RegisterPage';
import {ForgotPasswordPage} from '../pages/auth/ForgotPasswordPage';
import {ResetPasswordPage} from '../pages/auth/ResetPasswordPage';
import {RegistrationSuccessPage} from '../pages/auth/RegistrationSuccessPage';
import {EmailConfirmPage} from '../pages/auth/EmailConfirmPage';

// Main Pages
import {DashboardPage} from '../pages/DashboardPage';
import {InvoicesPage} from '../pages/InvoicesPage';
import {ClientsPage} from '../pages/ClientsPage';
import {ProductsPage} from '../pages/ProductsPage';
import {ReportsPage} from '../pages/ReportsPage';
import {SettingsPage} from '../pages/SettingsPage';
import NewInvoicePage from '../pages/NewInvoicePage';
import InvoiceDetailPage from '../pages/InvoiceDetailPage';
import EditInvoicePage from '../pages/EditInvoicePage';
import {DevisPage} from '../pages/DevisPage';
import {NewDevisPage} from '../pages/NewDevisPage';
import {QuotesPage} from '../pages/QuotesPage';
import NewQuotePage from '../pages/NewQuotePage';
import QuoteDetailPage from '../pages/QuoteDetailPage';
import ExpensesListPage from '../pages/expenses/ExpensesListPage';
import ExpenseFormPage from '../pages/expenses/ExpenseFormPage';
import {TvaReportPage} from '../pages/TvaReportPage';
import SmtpSettingsPage from '../pages/user/SmtpSettingsPage';
import {ProfilePage} from '../pages/settings/ProfilePage';
import {CompanyPage} from '../pages/settings/CompanyPage';
import {BillingPage as UserBillingPage} from '../pages/settings/BillingPage';
import {FeatureFlagsPage} from '../pages/settings/FeatureFlagsPage';

// Admin Pages
import {AdminLoginPage} from '../pages/admin/LoginPage';
import {AdminDashboard} from '../components/admin/AdminDashboard';
import {AdminLayout} from '../pages/admin/AdminLayout';
import {AnalyticsPage} from '../pages/admin/AnalyticsPage';
import PrintInvoicePage from '../pages/PrintInvoicePage';
import {BillingPage} from '../pages/admin/BillingPage';
import {InvoicesPage as AdminInvoicesPage} from '../pages/admin/InvoicesPage';
import {SettingsPage as AdminSettingsPage} from '../pages/admin/SettingsPage';
import {SubscriptionsPage} from '../pages/admin/SubscriptionsPage';
import {SupportPage} from '../pages/admin/SupportPage';
import {UserManagementPage} from '../pages/admin/UserManagementPage';
import {NotificationsPage} from '../pages/admin/NotificationsPage';
import {AuditLogsPage} from '../pages/admin/AuditLogsPage';
import {SystemHealthPage} from '../pages/admin/SystemHealthPage';
import {ApiWebhooksPage} from '../pages/admin/ApiWebhooksPage';
import {AdvancedLogsPage} from '../pages/admin/AdvancedLogsPage';
import {BackupsPage} from '../pages/admin/BackupsPage';
import {RoleManagementPage} from '../pages/admin/RoleManagementPage';
import {AdvancedSettingsPage} from '../pages/admin/AdvancedSettingsPage';
import {SmtpConfigPage} from '../pages/admin/SmtpConfigPage';
import {FeedbacksPage} from '../pages/admin/FeedbacksPage';

// Error Pages
import {NotFoundPage} from '../pages/NotFoundPage';
import {LandingPage} from '../pages/LandingPage';
import {FeedbackPage} from "../pages/FeedbackPage.tsx";
import {TermsOfServicePage} from "../pages/legal/TermsOfServicePage.tsx";
import {PrivacyPolicyPage} from "../pages/legal/PrivacyPolicyPage.tsx";

export const AppRouter: React.FC = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<LoginPage/>}/>
                    <Route path="/register" element={<RegisterPage/>}/>
                    <Route path="/auth/registration-success" element={<RegistrationSuccessPage/>}/>
                    <Route path="/auth/confirm-email" element={<EmailConfirmPage/>}/>
                    <Route path="/forgot-password" element={<ForgotPasswordPage/>}/>
                    <Route path="/reset-password" element={<ResetPasswordPage/>}/>
                    <Route path="/welcome" element={<LandingPage/>}/>
                    <Route path="/feedback" element={<FeedbackPage/>}/>
                    <Route path="/terms" element={<TermsOfServicePage/>}/>
                    <Route path="/privacy" element={<PrivacyPolicyPage/>}/>

                    {/* Admin Routes - Wrapped with AdminAuthProvider */}
                    <Route path="/admin" element={<AdminAuthProvider><Outlet/></AdminAuthProvider>}>
                        <Route path="login" element={<AdminLoginPage/>}/>
                        <Route element={<ProtectedAdminRoute><AdminLayout/></ProtectedAdminRoute>}>
                            <Route index element={<AdminDashboard/>}/>
                            <Route path="dashboard" element={<AdminDashboard/>}/>
                            <Route path="analytics" element={<AnalyticsPage/>}/>
                            <Route path="billing" element={<BillingPage/>}/>
                            <Route path="invoices" element={<AdminInvoicesPage/>}/>
                            <Route path="settings" element={<AdminSettingsPage/>}/>
                            <Route path="subscriptions" element={<SubscriptionsPage/>}/>
                            <Route path="support" element={<SupportPage/>}/>
                            <Route path="users" element={<UserManagementPage/>}/>
                            <Route path="notifications" element={<NotificationsPage/>}/>
                            <Route path="audit-logs" element={<AuditLogsPage/>}/>
                            <Route path="system-health" element={<SystemHealthPage/>}/>
                            <Route path="api-webhooks" element={<ApiWebhooksPage/>}/>
                            <Route path="advanced-logs" element={<AdvancedLogsPage/>}/>
                            <Route path="backups" element={<BackupsPage/>}/>
                            <Route path="roles" element={<RoleManagementPage/>}/>
                            <Route path="advanced-settings" element={<AdvancedSettingsPage/>}/>
                            <Route path="smtp-config" element={<SmtpConfigPage/>}/>
                            <Route path="feedbacks" element={<FeedbacksPage/>}/>
                        </Route>
                    </Route>

                    {/* Protected User Routes */}
                    <Route
                        path="/*"
                        element={
                            <ProtectedRoute>
                                <Layout/>
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<DashboardPage/>}/>
                        <Route path="dashboard" element={<DashboardPage/>}/>
                        <Route path="invoices" element={<InvoicesPage/>}/>
                        <Route path="invoices/new" element={<NewInvoicePage/>}/>
                        <Route path="invoices/:id" element={<InvoiceDetailPage/>}/>
                        <Route path="invoices/:id/edit" element={<EditInvoicePage/>}/>
                        <Route path="invoices/:id/print" element={<PrintInvoicePage/>}/>
                        <Route path="clients" element={<ClientsPage/>}/>
                        <Route path="products" element={<ProductsPage/>}/>
                        <Route path="reports" element={<ReportsPage/>}/>
                        <Route path="settings" element={<SettingsPage/>}/>
                        <Route path="settings/profile" element={<ProfilePage/>}/>
                        <Route path="settings/company" element={<CompanyPage/>}/>
                        <Route path="settings/billing" element={<UserBillingPage/>}/>
                        <Route path="settings/smtp" element={<SmtpSettingsPage/>}/>
                        <Route path="settings/features" element={<FeatureFlagsPage/>}/>
                        <Route path="devis" element={<DevisPage/>}/>
                        <Route path="devis/new" element={<NewDevisPage/>}/>
                        <Route path="quotes" element={<QuotesPage/>}/>
                        <Route path="quotes/new" element={<NewQuotePage/>}/>
                        <Route path="quotes/:id" element={<QuoteDetailPage/>}/>
                        <Route path="quotes/:id/edit" element={<NewQuotePage/>}/>
                        <Route path="expenses" element={<ExpensesListPage/>}/>
                        <Route path="expenses/new" element={<ExpenseFormPage/>}/>
                        <Route path="expenses/:id/edit" element={<ExpenseFormPage/>}/>
                        <Route path="tva-report" element={<TvaReportPage/>}/>
                    </Route>

                    {/* Catch-all for 404 */}
                    <Route path="*" element={<NotFoundPage/>}/>
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
};
