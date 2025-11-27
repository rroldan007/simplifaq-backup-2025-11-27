import React from 'react';
import { render, screen } from '@testing-library/react';
import { FinancialSummary } from '../FinancialSummary';

describe('FinancialSummary', () => {
  const mockProps = {
    totalRevenue: 125420,
    monthlyRevenue: 15420,
    totalInvoices: 12,
    paidInvoices: 8,
    pendingInvoices: 3,
    overdueInvoices: 1,
    activeClients: 8,
    currency: 'CHF'
  };

  it('renders financial summary with correct data', () => {
    render(<FinancialSummary {...mockProps} />);
    
    expect(screen.getByText('Résumé financier')).toBeInTheDocument();
    expect(screen.getByText('CHF 15,420.00')).toBeInTheDocument();
    expect(screen.getByText('CHF 125,420.00')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('displays correct status percentages', () => {
    render(<FinancialSummary {...mockProps} />);
    
    // Check that percentages are calculated correctly
    expect(screen.getByText('67%')).toBeInTheDocument(); // 8/12 paid invoices
    expect(screen.getByText('25%')).toBeInTheDocument(); // 3/12 pending invoices
    expect(screen.getByText('8%')).toBeInTheDocument();  // 1/12 overdue invoices
  });

  it('handles zero invoices gracefully', () => {
    const zeroProps = {
      ...mockProps,
      totalInvoices: 0,
      paidInvoices: 0,
      pendingInvoices: 0,
      overdueInvoices: 0
    };
    
    render(<FinancialSummary {...zeroProps} />);
    
    expect(screen.getAllByText('0%')).toHaveLength(3);
  });

  it('formats currency correctly for EUR', () => {
    const eurProps = {
      ...mockProps,
      currency: 'EUR'
    };
    
    render(<FinancialSummary {...eurProps} />);
    
    expect(screen.getByText('€15,420.00')).toBeInTheDocument();
  });
});