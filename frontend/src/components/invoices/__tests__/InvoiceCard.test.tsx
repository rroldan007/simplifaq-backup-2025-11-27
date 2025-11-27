import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { InvoiceCard } from '../InvoiceCard';

describe('InvoiceCard', () => {
  const mockInvoice = {
    id: '1',
    invoiceNumber: 'FAC-2024-001',
    clientName: 'Test Client SA',
    amount: 2500,
    status: 'sent' as const,
    issueDate: '2024-01-15',
    dueDate: '2024-02-14',
    currency: 'CHF',
    qrBillGenerated: true,
    sentAt: '2024-01-15'
  };

  const mockHandlers = {
    onView: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onSend: jest.fn(),
    onDuplicate: jest.fn(),
    onDownloadPdf: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders invoice information correctly', () => {
    render(<InvoiceCard invoice={mockInvoice} {...mockHandlers} />);
    
    expect(screen.getByText('FAC-2024-001')).toBeInTheDocument();
    expect(screen.getByText('Test Client SA')).toBeInTheDocument();
    expect(screen.getByText('CHF 2,500.00')).toBeInTheDocument();
    expect(screen.getByText('Envoyée')).toBeInTheDocument();
  });

  it('shows QR Bill status when generated', () => {
    render(<InvoiceCard invoice={mockInvoice} {...mockHandlers} />);
    
    expect(screen.getByText('QR Bill généré')).toBeInTheDocument();
    expect(screen.getByText('🇨🇭')).toBeInTheDocument();
  });

  it('displays correct status badge for different statuses', () => {
    const paidInvoice = { ...mockInvoice, status: 'paid' as const };
    render(<InvoiceCard invoice={paidInvoice} {...mockHandlers} />);
    
    expect(screen.getByText('Payée')).toBeInTheDocument();
  });

  it('shows overdue warning for overdue invoices', () => {
    const overdueInvoice = {
      ...mockInvoice,
      status: 'overdue' as const,
      dueDate: '2024-01-01' // Past date
    };
    
    render(<InvoiceCard invoice={overdueInvoice} {...mockHandlers} />);
    
    expect(screen.getByText('En retard')).toBeInTheDocument();
    expect(screen.getByText(/de retard/)).toBeInTheDocument();
  });

  it('shows correct actions for draft invoice', () => {
    const draftInvoice = { ...mockInvoice, status: 'draft' as const };
    render(<InvoiceCard invoice={draftInvoice} {...mockHandlers} />);
    
    expect(screen.getByText('Modifier')).toBeInTheDocument();
    expect(screen.getByText('Envoyer')).toBeInTheDocument();
    expect(screen.getByText('Supprimer')).toBeInTheDocument();
  });

  it('shows PDF download for sent invoices', () => {
    render(<InvoiceCard invoice={mockInvoice} {...mockHandlers} />);
    
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('calls correct handlers when actions are clicked', () => {
    render(<InvoiceCard invoice={mockInvoice} {...mockHandlers} />);
    
    fireEvent.click(screen.getByText('Voir'));
    expect(mockHandlers.onView).toHaveBeenCalledWith('1');
    
    fireEvent.click(screen.getByText('PDF'));
    expect(mockHandlers.onDownloadPdf).toHaveBeenCalledWith('1');
    
    fireEvent.click(screen.getByText('Dupliquer'));
    expect(mockHandlers.onDuplicate).toHaveBeenCalledWith('1');
  });

  it('formats dates correctly in French locale', () => {
    render(<InvoiceCard invoice={mockInvoice} {...mockHandlers} />);
    
    expect(screen.getByText('15.01.2024')).toBeInTheDocument();
    expect(screen.getByText('14.02.2024')).toBeInTheDocument();
  });

  it('shows sent date when available', () => {
    render(<InvoiceCard invoice={mockInvoice} {...mockHandlers} />);
    
    expect(screen.getByText('Envoyée le')).toBeInTheDocument();
    expect(screen.getByText('15.01.2024')).toBeInTheDocument();
  });
});