import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InvoiceList } from '../InvoiceList';

describe('InvoiceList', () => {
  const mockInvoices = [
    {
      id: '1',
      invoiceNumber: 'FAC-2024-001',
      clientName: 'Client A SA',
      amount: 2500,
      status: 'paid' as const,
      issueDate: '2024-01-15',
      dueDate: '2024-02-14',
      currency: 'CHF',
      qrBillGenerated: true
    },
    {
      id: '2',
      invoiceNumber: 'FAC-2024-002',
      clientName: 'Client B Sàrl',
      amount: 1800,
      status: 'sent' as const,
      issueDate: '2024-01-12',
      dueDate: '2024-02-11',
      currency: 'CHF',
      qrBillGenerated: true
    },
    {
      id: '3',
      invoiceNumber: 'FAC-2024-003',
      clientName: 'Client C AG',
      amount: 3200,
      status: 'overdue' as const,
      issueDate: '2024-01-05',
      dueDate: '2024-02-04',
      currency: 'CHF',
      qrBillGenerated: true
    }
  ];

  const mockHandlers = {
    onView: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onSend: jest.fn(),
    onDuplicate: jest.fn(),
    onDownloadPdf: jest.fn(),
    onCreateNew: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders invoice list with all invoices', () => {
    render(<InvoiceList invoices={mockInvoices} {...mockHandlers} />);
    
    expect(screen.getByText('Factures')).toBeInTheDocument();
    expect(screen.getByText('FAC-2024-001')).toBeInTheDocument();
    expect(screen.getByText('FAC-2024-002')).toBeInTheDocument();
    expect(screen.getByText('FAC-2024-003')).toBeInTheDocument();
  });

  it('shows correct invoice count', () => {
    render(<InvoiceList invoices={mockInvoices} {...mockHandlers} />);
    
    expect(screen.getByText('3 factures')).toBeInTheDocument();
  });

  it('filters invoices by status', () => {
    render(<InvoiceList invoices={mockInvoices} {...mockHandlers} />);
    
    // Click on "Payées" filter
    fireEvent.click(screen.getByText('Payées'));
    
    expect(screen.getByText('FAC-2024-001')).toBeInTheDocument();
    expect(screen.queryByText('FAC-2024-002')).not.toBeInTheDocument();
    expect(screen.queryByText('FAC-2024-003')).not.toBeInTheDocument();
  });

  it('searches invoices by query', async () => {
    render(<InvoiceList invoices={mockInvoices} {...mockHandlers} />);
    
    const searchInput = screen.getByPlaceholderText(/Rechercher par numéro/);
    fireEvent.change(searchInput, { target: { value: 'Client A' } });
    
    await waitFor(() => {
      expect(screen.getByText('FAC-2024-001')).toBeInTheDocument();
      expect(screen.queryByText('FAC-2024-002')).not.toBeInTheDocument();
      expect(screen.queryByText('FAC-2024-003')).not.toBeInTheDocument();
    });
  });

  it('sorts invoices by different criteria', () => {
    render(<InvoiceList invoices={mockInvoices} {...mockHandlers} />);
    
    // Click on amount sort
    fireEvent.click(screen.getByText('Montant'));
    
    // Should sort by amount (descending by default)
    const invoiceCards = screen.getAllByText(/FAC-2024-/);
    expect(invoiceCards[0]).toHaveTextContent('FAC-2024-003'); // 3200 CHF
    expect(invoiceCards[1]).toHaveTextContent('FAC-2024-001'); // 2500 CHF
    expect(invoiceCards[2]).toHaveTextContent('FAC-2024-002'); // 1800 CHF
  });

  it('shows empty state when no invoices', () => {
    render(<InvoiceList invoices={[]} {...mockHandlers} />);
    
    expect(screen.getByText('Aucune facture')).toBeInTheDocument();
    expect(screen.getByText('Vous n\'avez pas encore créé de factures.')).toBeInTheDocument();
    expect(screen.getByText('Créer ma première facture')).toBeInTheDocument();
  });

  it('shows no results state when search returns empty', async () => {
    render(<InvoiceList invoices={mockInvoices} {...mockHandlers} />);
    
    const searchInput = screen.getByPlaceholderText(/Rechercher par numéro/);
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    await waitFor(() => {
      expect(screen.getByText('Aucune facture trouvée')).toBeInTheDocument();
      expect(screen.getByText('Effacer les filtres')).toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    render(<InvoiceList invoices={[]} loading={true} {...mockHandlers} />);
    
    expect(screen.getByRole('status')).toBeInTheDocument(); // LoadingSpinner
  });

  it('shows error state', () => {
    render(<InvoiceList invoices={[]} error="Test error" {...mockHandlers} />);
    
    expect(screen.getByText('Erreur de chargement')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.getByText('Réessayer')).toBeInTheDocument();
  });

  it('calls onCreateNew when create button is clicked', () => {
    render(<InvoiceList invoices={mockInvoices} {...mockHandlers} />);
    
    fireEvent.click(screen.getByText('Nouvelle facture'));
    expect(mockHandlers.onCreateNew).toHaveBeenCalled();
  });

  it('displays status counts in filters', () => {
    render(<InvoiceList invoices={mockInvoices} {...mockHandlers} />);
    
    // Should show counts for each status
    expect(screen.getByText('3')).toBeInTheDocument(); // All invoices
    expect(screen.getByText('1')).toBeInTheDocument(); // One of each status
  });

  it('clears filters when clear button is clicked', async () => {
    render(<InvoiceList invoices={mockInvoices} {...mockHandlers} />);
    
    // Apply search filter
    const searchInput = screen.getByPlaceholderText(/Rechercher par numéro/);
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    await waitFor(() => {
      expect(screen.getByText('Aucune facture trouvée')).toBeInTheDocument();
    });
    
    // Clear filters
    fireEvent.click(screen.getByText('Effacer les filtres'));
    
    await waitFor(() => {
      expect(screen.getByText('3 factures')).toBeInTheDocument();
    });
  });
});