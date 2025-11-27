import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecentInvoices } from '../RecentInvoices';

describe('RecentInvoices', () => {
  const mockInvoices = [
    {
      id: '1',
      invoiceNumber: 'FAC-2024-001',
      clientName: 'Client Test SA',
      amount: 2500,
      status: 'paid' as const,
      issueDate: '2024-01-15',
      dueDate: '2024-02-14',
      currency: 'CHF'
    },
    {
      id: '2',
      invoiceNumber: 'FAC-2024-002',
      clientName: 'Autre Client Sàrl',
      amount: 1800,
      status: 'overdue' as const,
      issueDate: '2024-01-10',
      dueDate: '2024-02-09',
      currency: 'CHF'
    }
  ];

  const mockHandlers = {
    onViewInvoice: jest.fn(),
    onCreateInvoice: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders recent invoices list', () => {
    render(<RecentInvoices invoices={mockInvoices} {...mockHandlers} />);
    
    expect(screen.getByText('Factures récentes')).toBeInTheDocument();
    expect(screen.getByText('FAC-2024-001')).toBeInTheDocument();
    expect(screen.getByText('Client Test SA')).toBeInTheDocument();
    expect(screen.getByText('CHF 2,500.00')).toBeInTheDocument();
  });

  it('displays correct status badges', () => {
    render(<RecentInvoices invoices={mockInvoices} {...mockHandlers} />);
    
    expect(screen.getByText('Payée')).toBeInTheDocument();
    expect(screen.getByText('En retard')).toBeInTheDocument();
  });

  it('calls onViewInvoice when invoice is clicked', () => {
    render(<RecentInvoices invoices={mockInvoices} {...mockHandlers} />);
    
    const invoiceItem = screen.getByText('FAC-2024-001').closest('div');
    fireEvent.click(invoiceItem!);
    
    expect(mockHandlers.onViewInvoice).toHaveBeenCalledWith('1');
  });

  it('shows empty state when no invoices', () => {
    render(<RecentInvoices invoices={[]} {...mockHandlers} />);
    
    expect(screen.getByText('Aucune facture')).toBeInTheDocument();
    expect(screen.getByText('Vous n\'avez pas encore créé de factures.')).toBeInTheDocument();
    expect(screen.getByText('Créer ma première facture')).toBeInTheDocument();
  });

  it('calls onCreateInvoice when create button is clicked in empty state', () => {
    render(<RecentInvoices invoices={[]} {...mockHandlers} />);
    
    const createButton = screen.getByText('Créer ma première facture');
    fireEvent.click(createButton);
    
    expect(mockHandlers.onCreateInvoice).toHaveBeenCalled();
  });

  it('formats dates correctly', () => {
    render(<RecentInvoices invoices={mockInvoices} {...mockHandlers} />);
    
    expect(screen.getByText(/Émise le 15.01.2024/)).toBeInTheDocument();
    expect(screen.getByText(/Échéance le 14.02.2024/)).toBeInTheDocument();
  });
});