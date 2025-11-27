import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModernClientList } from '../components/clients/ModernClientList';
import { ClientForm } from '../components/clients/ClientForm';
import { ClientDetailModal } from '../components/clients/ClientDetailModal';
import { NotificationContainer } from '../components/ui/Notification';
import { useClients } from '../hooks/useClients';

export function ClientsPage() {
  const navigate = useNavigate();
  
  // Reactive filters for ModernClientList
  const [filters, setFilters] = useState({
    search: '',
    status: undefined as 'active' | 'inactive' | undefined,
    type: undefined as 'company' | 'individual' | undefined,
    sortBy: 'name',
    sortOrder: 'asc' as const
  });
  
  // Update filters when ModernClientList changes them (memoized to prevent re-renders)
  const handleFilterChange = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters(prev => {
      // Only update if values actually changed
      const hasChanges = Object.keys(newFilters).some(
        key => prev[key as keyof typeof prev] !== newFilters[key as keyof typeof newFilters]
      );
      return hasChanges ? { ...prev, ...newFilters } : prev;
    });
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [viewingClient, setViewingClient] = useState<string | null>(null);

  // Memoize client params to prevent unnecessary re-fetches
  const clientParams = useMemo(() => ({
    search: filters.search || undefined,
    status: filters.status,
    type: filters.type,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    autoRefresh: true,
    refreshInterval: 30000
  }), [filters.search, filters.status, filters.type, filters.sortBy, filters.sortOrder]);

  const {
    clients,
    loading,
    error,
    notifications,
    operationLoading,
    createClient,
    updateClient,
    deleteClient,
    refreshClients,
    removeNotification
  } = useClients(clientParams);

  const handleViewClient = (clientId: string) => {
    console.log('Viewing client:', clientId);
    setViewingClient(clientId);
  };

  const handleEditClient = (clientId: string) => {
    setEditingClient(clientId);
    setShowForm(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    const clientName = client?.companyName || `${client?.firstName} ${client?.lastName}`;
    
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le client "${clientName}" ?`)) {
      await deleteClient(clientId);
    }
  };

  const handleCreateInvoice = (clientId: string) => {
    console.log('Creating invoice for client:', clientId);
    const client = clients.find(c => c.id === clientId);
    
    // Navigate to invoice creation with pre-selected client data
    navigate('/invoices/new', { 
      state: { 
        preselectedClient: client,
        clientId: clientId
      } 
    });
  };

  const handleCreateNew = () => {
    setEditingClient(null);
    setShowForm(true);
  };

  // Import CSV: simple preview/line count for now
  const handleImportCsv = (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || '');
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        alert(`Import CSV reçu: ${file.name} (${lines.length} lignes).\nProchaine étape: mapping de colonnes et création de clients.`);
        console.log('CSV preview (first 5 lines):', lines.slice(0, 5));
      };
      reader.readAsText(file);
    } catch (e) {
      console.error('CSV import error', e);
      alert('Erreur lors de la lecture du CSV');
    }
  };

  // Export clients to CSV
  const handleExportClients = () => {
    const headers = ['Company/Name','Email','Phone','Street','City','PostalCode','Country','Language','PaymentTerms','Active'];
    const rows = clients.map(c => {
      const name = c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim();
      return [
        name,
        c.email || '',
        c.phone || '',
        c.address?.street || '',
        c.address?.city || '',
        c.address?.postalCode || '',
        c.address?.country || '',
        c.language || 'fr',
        String(c.paymentTerms ?? 30),
        (c.isActive ?? true) ? 'yes' : 'no'
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0,10);
    a.download = `clients-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Payload coming from ClientForm includes flattened address fields
  type SubmittedClientFormData = {
    companyName?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
    address?: {
      street?: string;
      city?: string;
      postalCode?: string;
      country?: string;
      canton?: string;
    };
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    canton?: string;
    vatNumber?: string;
    language?: 'de' | 'fr' | 'it' | 'en';
    paymentTerms?: number;
    notes?: string;
    isActive?: boolean;
  };

  const handleFormSubmit = (data: SubmittedClientFormData): void => {
    // Build normalized address strings (no undefined)
    const street = (data.street ?? data.address?.street ?? '').trim();
    const city = (data.city ?? data.address?.city ?? '').trim();
    const postalCode = (data.postalCode ?? data.address?.postalCode ?? '').trim();
    const country = (data.country ?? data.address?.country ?? 'Switzerland').trim();
    const canton = (data.canton ?? data.address?.canton ?? '').trim();

    const common = {
      companyName: data.companyName || undefined,
      firstName: data.firstName || undefined,
      lastName: data.lastName || undefined,
      email: data.email,
      phone: data.phone || undefined,
      vatNumber: data.vatNumber || undefined,
      language: data.language || 'fr',
      paymentTerms: data.paymentTerms || 30,
      notes: data.notes || undefined,
      isActive: data.isActive !== undefined ? data.isActive : true,
    };

    const address = { street, city, postalCode, country, canton };

    const action = editingClient
      ? updateClient(editingClient, { ...common, address })
      : createClient({ ...common, address });

    action
      .then(() => {
        setShowForm(false);
        setEditingClient(null);
      })
      .catch((error) => {
        // Error handling is already done in the hook; keep minimal log for dev
        console.error('Form submission error:', error);
      });
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingClient(null);
  };

  const editingClientData = editingClient 
    ? clients.find(c => c.id === editingClient)
    : undefined;

  // Show form view
  if (showForm) {
    return (
      <div
        className="min-h-screen"
        style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
      >
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <ClientForm
            initialData={editingClientData}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            loading={operationLoading[`${editingClient ? 'update' : 'create'}-${editingClient || 'new'}`]}
            mode={editingClient ? 'edit' : 'create'}
          />
        </div>
      </div>
    );
  }

  // Check if specific operations are loading
  const isOperationLoading = (clientId: string, operation: string) => {
    return operationLoading[`${operation}-${clientId}`] || false;
  };

  return (
    <>
      <ModernClientList
        clients={clients.map(client => ({
          ...client,
          street: client.address?.street || '',
          city: client.address?.city || '',
          postalCode: client.address?.postalCode || '',
          country: client.address?.country || 'Suisse',
          canton: client.address?.canton,
          language: client.language || 'fr',
          paymentTerms: client.paymentTerms || 30,
          isActive: client.isActive ?? true
        }))}
        loading={loading}
        error={error}
        onView={handleViewClient}
        onEdit={handleEditClient}
        onDelete={handleDeleteClient}
        onCreateInvoice={handleCreateInvoice}
        onCreateNew={handleCreateNew}
        onRefresh={refreshClients}
        onImportCsv={handleImportCsv}
        onExport={handleExportClients}
        onFilterChange={handleFilterChange}
        currentFilters={filters}
        operationLoading={{
          delete: (id: string) => isOperationLoading(id, 'delete'),
          edit: (id: string) => isOperationLoading(id, 'edit'),
          invoice: (id: string) => isOperationLoading(id, 'invoice'),
        }}
      />

      {/* Notifications */}
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
        position="top-right"
      />

      {/* Client Detail Modal */}
      {viewingClient && (
        <ClientDetailModal
          clientId={viewingClient}
          onClose={() => setViewingClient(null)}
        />
      )}
    </>
  );
}