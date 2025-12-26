import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  FileCheck, 
  Clock, 
  AlertTriangle, 
  ArrowRight, 
  Plus,
  RefreshCw,
  TrendingUp,
  Calendar,
  DollarSign,
  Mail,
  CheckCircle
} from 'lucide-react';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  client?: {
    companyName?: string;
    firstName?: string;
    lastName?: string;
  };
  status: string;
  total: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  isQuote?: boolean;
}

interface QuickStats {
  overdueCount: number;
  overdueAmount: number;
  pendingCount: number;
  pendingAmount: number;
  quotesToConvert: number;
  quotesAmount: number;
  paidThisMonth: number;
  dueThisWeek: number;
}

export function BillingHubPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overdueInvoices, setOverdueInvoices] = useState<Invoice[]>([]);
  const [dueSoonInvoices, setDueSoonInvoices] = useState<Invoice[]>([]);
  const [pendingQuotes, setPendingQuotes] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<QuickStats>({
    overdueCount: 0,
    overdueAmount: 0,
    pendingCount: 0,
    pendingAmount: 0,
    quotesToConvert: 0,
    quotesAmount: 0,
    paidThisMonth: 0,
    dueThisWeek: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch invoices (includes quotes with isQuote=true)
      const invoicesRes = await api.getInvoices({ limit: 100 });
      const allData = (invoicesRes.invoices || []) as Invoice[];
      
      // Separate invoices and quotes
      const allInvoices = allData.filter((inv: Invoice) => !inv.isQuote);
      const allQuotes = allData.filter((inv: Invoice) => inv.isQuote);
      
      const now = new Date();
      const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Filter overdue invoices
      const overdue = allInvoices.filter((inv: Invoice) => 
        inv.status?.toUpperCase() === 'OVERDUE' || 
        (inv.status?.toUpperCase() === 'SENT' && new Date(inv.dueDate) < now)
      );
      
      // Filter invoices due within a week
      const dueSoon = allInvoices.filter((inv: Invoice) => {
        if (inv.status?.toUpperCase() !== 'SENT') return false;
        const dueDate = new Date(inv.dueDate);
        return dueDate >= now && dueDate <= oneWeekLater;
      });
      
      // Filter pending quotes (SENT or DRAFT status)
      const pendingQ = allQuotes.filter((q: Invoice) => 
        q.status?.toUpperCase() === 'SENT' || q.status?.toUpperCase() === 'DRAFT'
      );
      
      // Calculate paid this month
      const paidThisMonth = allInvoices.filter((inv: Invoice) => {
        if (inv.status?.toUpperCase() !== 'PAID') return false;
        const issueDate = new Date(inv.issueDate);
        return issueDate >= startOfMonth;
      }).reduce((sum: number, inv: Invoice) => sum + (inv.total || 0), 0);
      
      setOverdueInvoices(overdue.slice(0, 5));
      setDueSoonInvoices(dueSoon.slice(0, 5));
      setPendingQuotes(pendingQ.slice(0, 5));
      
      setStats({
        overdueCount: overdue.length,
        overdueAmount: overdue.reduce((sum: number, inv: Invoice) => sum + (inv.total || 0), 0),
        pendingCount: allInvoices.filter((inv: Invoice) => inv.status?.toUpperCase() === 'SENT').length,
        pendingAmount: allInvoices.filter((inv: Invoice) => inv.status?.toUpperCase() === 'SENT')
          .reduce((sum: number, inv: Invoice) => sum + (inv.total || 0), 0),
        quotesToConvert: pendingQ.length,
        quotesAmount: pendingQ.reduce((sum: number, q: Invoice) => sum + (q.total || 0), 0),
        paidThisMonth,
        dueThisWeek: dueSoon.length
      });
      
    } catch (err) {
      console.error('Error loading billing hub data:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency = 'CHF') => {
    return new Intl.NumberFormat('fr-CH', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('fr-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(dateString));
  };

  const getClientName = (invoice: Invoice) => {
    if (invoice.client?.companyName) return invoice.client.companyName;
    if (invoice.client?.firstName || invoice.client?.lastName) {
      return `${invoice.client.firstName || ''} ${invoice.client.lastName || ''}`.trim();
    }
    return 'Client inconnu';
  };

  const getDaysOverdue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const handleSendReminder = async (invoiceId: string) => {
    try {
      // Navigate to invoice detail to send reminder from there
      navigate(`/invoices/${invoiceId}?action=reminder`);
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  };

  const handleConvertToInvoice = (quoteId: string) => {
    navigate(`/invoices/new?fromQuote=${quoteId}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[var(--color-bg-secondary)] rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-[var(--color-bg-secondary)] rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
          <h2 className="font-semibold mb-2">Erreur de chargement</h2>
          <p>{error}</p>
          <Button variant="secondary" onClick={loadData} className="mt-4">
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Centre de Facturation
            </h1>
            <p className="text-[var(--color-text-secondary)] mt-1">
              Vue d'ensemble de vos factures et devis
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
            <Button variant="primary" onClick={() => navigate('/invoices/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle Facture
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Overdue */}
          <Card className={`p-5 border-l-4 ${stats.overdueCount > 0 ? 'border-l-red-500' : 'border-l-green-500'}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">En retard</p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">
                  {stats.overdueCount}
                </p>
                <p className="text-sm text-red-600 font-medium mt-1">
                  {formatCurrency(stats.overdueAmount)}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${stats.overdueCount > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {stats.overdueCount > 0 ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
              </div>
            </div>
          </Card>

          {/* Due Soon */}
          <Card className="p-5 border-l-4 border-l-amber-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">Échéance cette semaine</p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">
                  {stats.dueThisWeek}
                </p>
                <p className="text-sm text-amber-600 font-medium mt-1">
                  {formatCurrency(stats.pendingAmount)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-amber-100 text-amber-600">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </Card>

          {/* Pending Quotes */}
          <Card className="p-5 border-l-4 border-l-blue-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">Devis en attente</p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">
                  {stats.quotesToConvert}
                </p>
                <p className="text-sm text-blue-600 font-medium mt-1">
                  {formatCurrency(stats.quotesAmount)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                <FileCheck className="w-6 h-6" />
              </div>
            </div>
          </Card>

          {/* Paid This Month */}
          <Card className="p-5 border-l-4 border-l-green-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">Encaissé ce mois</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(stats.paidThisMonth)}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  Factures payées
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 text-green-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link 
            to="/invoices" 
            className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl text-white hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Factures</h3>
                <p className="text-blue-100 text-sm">Gérer toutes vos factures</p>
              </div>
            </div>
            <ArrowRight className="w-6 h-6" />
          </Link>

          <Link 
            to="/quotes" 
            className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl text-white hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <FileCheck className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Devis</h3>
                <p className="text-purple-100 text-sm">Créer et suivre vos devis</p>
              </div>
            </div>
            <ArrowRight className="w-6 h-6" />
          </Link>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overdue Invoices */}
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-[var(--color-border-primary)] bg-red-50 dark:bg-red-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-[var(--color-text-primary)]">
                    Factures en retard
                  </h3>
                </div>
                <Link to="/invoices?status=overdue" className="text-sm text-red-600 hover:underline">
                  Voir tout ({stats.overdueCount})
                </Link>
              </div>
            </div>
            <div className="divide-y divide-[var(--color-border-primary)]">
              {overdueInvoices.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-[var(--color-text-secondary)]">Aucune facture en retard</p>
                  <p className="text-sm text-green-600 mt-1">Excellent travail ! 🎉</p>
                </div>
              ) : (
                overdueInvoices.map(invoice => (
                  <div key={invoice.id} className="p-4 hover:bg-[var(--color-bg-secondary)] transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--color-text-primary)]">
                            {invoice.invoiceNumber}
                          </span>
                          <Badge variant="error" className="text-xs">
                            {getDaysOverdue(invoice.dueDate)}j de retard
                          </Badge>
                        </div>
                        <p className="text-sm text-[var(--color-text-secondary)]">
                          {getClientName(invoice)}
                        </p>
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                          Échéance: {formatDate(invoice.dueDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-red-600">
                          {formatCurrency(invoice.total, invoice.currency)}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleSendReminder(invoice.id)}
                            className="p-1.5 text-amber-600 hover:bg-amber-100 rounded transition-colors"
                            title="Envoyer un rappel"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/invoices/${invoice.id}`)}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                            title="Voir la facture"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Due Soon */}
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-[var(--color-border-primary)] bg-amber-50 dark:bg-amber-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-[var(--color-text-primary)]">
                    Échéance proche
                  </h3>
                </div>
                <Link to="/invoices?status=sent" className="text-sm text-amber-600 hover:underline">
                  Voir tout ({stats.dueThisWeek})
                </Link>
              </div>
            </div>
            <div className="divide-y divide-[var(--color-border-primary)]">
              {dueSoonInvoices.length === 0 ? (
                <div className="p-8 text-center">
                  <Calendar className="w-12 h-12 text-[var(--color-text-tertiary)] mx-auto mb-3" />
                  <p className="text-[var(--color-text-secondary)]">Aucune échéance cette semaine</p>
                </div>
              ) : (
                dueSoonInvoices.map(invoice => (
                  <div key={invoice.id} className="p-4 hover:bg-[var(--color-bg-secondary)] transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-[var(--color-text-primary)]">
                          {invoice.invoiceNumber}
                        </span>
                        <p className="text-sm text-[var(--color-text-secondary)]">
                          {getClientName(invoice)}
                        </p>
                        <p className="text-xs text-amber-600">
                          Échéance: {formatDate(invoice.dueDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-[var(--color-text-primary)]">
                          {formatCurrency(invoice.total, invoice.currency)}
                        </p>
                        <button
                          onClick={() => navigate(`/invoices/${invoice.id}`)}
                          className="mt-2 text-sm text-blue-600 hover:underline"
                        >
                          Voir →
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Pending Quotes */}
          <Card className="overflow-hidden lg:col-span-2">
            <div className="p-4 border-b border-[var(--color-border-primary)] bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-[var(--color-text-primary)]">
                    Devis à convertir en facture
                  </h3>
                </div>
                <Link to="/quotes" className="text-sm text-blue-600 hover:underline">
                  Voir tous les devis ({stats.quotesToConvert})
                </Link>
              </div>
            </div>
            <div className="divide-y divide-[var(--color-border-primary)]">
              {pendingQuotes.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="w-12 h-12 text-[var(--color-text-tertiary)] mx-auto mb-3" />
                  <p className="text-[var(--color-text-secondary)]">Aucun devis en attente</p>
                  <Button 
                    variant="primary" 
                    className="mt-4"
                    onClick={() => navigate('/quotes/new')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Créer un devis
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {pendingQuotes.map(quote => (
                    <div 
                      key={quote.id} 
                      className="p-4 border border-[var(--color-border-primary)] rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="font-medium text-[var(--color-text-primary)]">
                            {quote.invoiceNumber}
                          </span>
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            {getClientName(quote)}
                          </p>
                        </div>
                        <Badge variant={quote.status?.toUpperCase() === 'SENT' ? 'info' : 'secondary'}>
                          {quote.status?.toUpperCase() === 'SENT' ? 'Envoyé' : 'Brouillon'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-[var(--color-text-primary)]">
                          {formatCurrency(quote.total, quote.currency)}
                        </p>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleConvertToInvoice(quote.id)}
                        >
                          Convertir →
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Quick Actions Footer */}
        <Card className="p-6">
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-4">Actions rapides</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/invoices/new')}
              className="flex flex-col items-center p-4 border border-[var(--color-border-primary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
              <div className="p-3 bg-blue-100 text-blue-600 rounded-full mb-2">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-[var(--color-text-primary)]">Nouvelle facture</span>
            </button>

            <button
              onClick={() => navigate('/quotes/new')}
              className="flex flex-col items-center p-4 border border-[var(--color-border-primary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
              <div className="p-3 bg-purple-100 text-purple-600 rounded-full mb-2">
                <FileCheck className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-[var(--color-text-primary)]">Nouveau devis</span>
            </button>

            <button
              onClick={() => navigate('/clients/new')}
              className="flex flex-col items-center p-4 border border-[var(--color-border-primary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
              <div className="p-3 bg-green-100 text-green-600 rounded-full mb-2">
                <DollarSign className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-[var(--color-text-primary)]">Nouveau client</span>
            </button>

            <button
              onClick={() => navigate('/reports')}
              className="flex flex-col items-center p-4 border border-[var(--color-border-primary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
              <div className="p-3 bg-amber-100 text-amber-600 rounded-full mb-2">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-[var(--color-text-primary)]">Voir rapports</span>
            </button>
          </div>
        </Card>
    </div>
  );
}

export default BillingHubPage;
