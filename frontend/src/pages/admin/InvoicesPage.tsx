/**
 * 🇨🇭 SimpliFaq - Admin Invoices Page
 *
 * Admin view of all invoices across the platform
 */

import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

interface Invoice {
  id: string;
  invoiceNumber: string;
  userEmail: string;
  userCompany: string;
  clientName: string;
  clientCompany: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  createdAt: string;
  dueDate: string;
}

export const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: '1',
      invoiceNumber: 'INV-2025-001',
      userEmail: 'user1@example.com',
      userCompany: 'Entreprise A',
      clientName: 'Client Dupont',
      clientCompany: 'Dupont SA',
      amount: 2500.00,
      currency: 'CHF',
      status: 'paid',
      createdAt: '2025-09-15T10:00:00Z',
      dueDate: '2025-09-30T00:00:00Z',
    },
    {
      id: '2',
      invoiceNumber: 'INV-2025-002',
      userEmail: 'user2@example.com',
      userCompany: 'Entreprise B',
      clientName: 'Client Martin',
      clientCompany: 'Martin Ltd',
      amount: 1800.50,
      currency: 'CHF',
      status: 'sent',
      createdAt: '2025-09-14T14:30:00Z',
      dueDate: '2025-09-29T00:00:00Z',
    },
    {
      id: '3',
      invoiceNumber: 'INV-2025-003',
      userEmail: 'user1@example.com',
      userCompany: 'Entreprise A',
      clientName: 'Client Durand',
      clientCompany: 'Durand Corp',
      amount: 3200.00,
      currency: 'CHF',
      status: 'overdue',
      createdAt: '2025-08-20T09:15:00Z',
      dueDate: '2025-09-05T00:00:00Z',
    },
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const invoicesPerPage = 20;

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-orange-100 text-orange-800',
    };

    const labels = {
      draft: 'Brouillon',
      sent: 'Envoyée',
      paid: 'Payée',
      overdue: 'En retard',
      cancelled: 'Annulée',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${
        colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-CH', {
      style: 'currency',
      currency: currency || 'CHF'
    }).format(amount);
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.userCompany.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.clientCompany.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * invoicesPerPage,
    currentPage * invoicesPerPage
  );

  const totalPages = Math.ceil(filteredInvoices.length / invoicesPerPage);

  const handleViewInvoice = (invoice: Invoice) => {
    console.log('View invoice:', invoice);
    alert(`Voir facture: ${invoice.invoiceNumber}`);
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    console.log('Download PDF:', invoice);
    alert(`Télécharger PDF: ${invoice.invoiceNumber}`);
  };

  const handleStatusChange = (invoiceId: string, newStatus: Invoice['status']) => {
    setInvoices(prev => prev.map(invoice =>
      invoice.id === invoiceId
        ? { ...invoice, status: newStatus }
        : invoice
    ));
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Factures</h1>
        <Button variant="outline">Exporter</Button>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-primary">
            Toutes les Factures
          </h2>
          <Button variant="outline" size="sm">
            Actualiser
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Input
            type="text"
            placeholder="Rechercher par numéro, utilisateur ou client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="sent">Envoyée</option>
            <option value="paid">Payée</option>
            <option value="overdue">En retard</option>
            <option value="cancelled">Annulée</option>
          </select>
          <div className="text-sm text-secondary flex items-center">
            {filteredInvoices.length} facture{filteredInvoices.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Invoices Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--color-border-primary)]">
            <thead className="surface-elevated">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Facture
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Échéance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-primary)]">
              {paginatedInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-[var(--color-bg-secondary)]">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-primary">
                        {invoice.invoiceNumber}
                      </div>
                      <div className="text-sm text-secondary">
                        Créée le {new Date(invoice.createdAt).toLocaleDateString('fr-CH')}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-primary">
                        {invoice.userEmail}
                      </div>
                      <div className="text-sm text-secondary">{invoice.userCompany}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-primary">
                        {invoice.clientName}
                      </div>
                      <div className="text-sm text-secondary">{invoice.clientCompany}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                    {formatCurrency(invoice.amount, invoice.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(invoice.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                    {new Date(invoice.dueDate).toLocaleDateString('fr-CH')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      className="text-blue-600 hover:text-blue-900"
                      onClick={() => handleViewInvoice(invoice)}
                    >
                      Voir
                    </button>
                    <button
                      className="text-green-600 hover:text-green-900"
                      onClick={() => handleDownloadPDF(invoice)}
                    >
                      PDF
                    </button>
                    <select
                      value={invoice.status}
                      onChange={(e) => handleStatusChange(invoice.id, e.target.value as Invoice['status'])}
                      className="px-2 py-1 text-xs rounded border focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="draft">Brouillon</option>
                      <option value="sent">Envoyée</option>
                      <option value="paid">Payée</option>
                      <option value="overdue">En retard</option>
                      <option value="cancelled">Annulée</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 && (
          <div className="text-center text-secondary py-8">
            <p>Aucune facture trouvée</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-secondary">
              Page {currentPage} sur {totalPages}
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                Précédent
              </Button>
              <Button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};