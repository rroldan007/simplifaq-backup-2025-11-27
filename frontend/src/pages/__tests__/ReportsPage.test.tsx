import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReportsPage } from '../ReportsPage';

// Mock the report components
jest.mock('../../components/reports/TVAReport', () => ({
  TVAReport: ({ onGenerateReport }: { onGenerateReport: (startDate: string, endDate: string) => void }) => (
    <div data-testid="tva-report">
      <button onClick={() => onGenerateReport('2024-01-01', '2024-12-31')}>
        Generate TVA Report
      </button>
    </div>
  )
}));

jest.mock('../../components/reports/IncomeReport', () => ({
  IncomeReport: ({ onGenerateReport }: { onGenerateReport: (startDate: string, endDate: string) => void }) => (
    <div data-testid="income-report">
      <button onClick={() => onGenerateReport('2024-01-01', '2024-12-31')}>
        Generate Income Report
      </button>
    </div>
  )
}));

jest.mock('../../components/reports/ClientReport', () => ({
  ClientReport: ({ onGenerateReport }: { onGenerateReport: (startDate: string, endDate: string, clientId: string) => void }) => (
    <div data-testid="client-report">
      <button onClick={() => onGenerateReport('2024-01-01', '2024-12-31', 'client-1')}>
        Generate Client Report
      </button>
    </div>
  )
}));

describe('ReportsPage', () => {
  it('renders the reports page with header and navigation', () => {
    render(<ReportsPage />);
    
    expect(screen.getByText('Rapports')).toBeInTheDocument();
    expect(screen.getByText('Analysez vos performances et générez vos rapports financiers')).toBeInTheDocument();
    
    // Check navigation tabs
    expect(screen.getByText('Vue d\'ensemble')).toBeInTheDocument();
    expect(screen.getByText('Rapport TVA')).toBeInTheDocument();
    expect(screen.getByText('Revenus')).toBeInTheDocument();
    expect(screen.getByText('Clients')).toBeInTheDocument();
  });

  it('shows overview by default', () => {
    render(<ReportsPage />);
    
    // Should show overview cards
    expect(screen.getByText('Rapport TVA')).toBeInTheDocument();
    expect(screen.getByText('Déclaration TVA pour les autorités suisses')).toBeInTheDocument();
    expect(screen.getByText('Rapport de revenus')).toBeInTheDocument();
    expect(screen.getByText('Analyse détaillée de vos performances')).toBeInTheDocument();
    expect(screen.getByText('Rapport clients')).toBeInTheDocument();
    expect(screen.getByText('Performance par client')).toBeInTheDocument();
    
    // Should show quick stats
    expect(screen.getByText('Statistiques rapides')).toBeInTheDocument();
    expect(screen.getByText('CA ce mois')).toBeInTheDocument();
    expect(screen.getByText('Factures émises')).toBeInTheDocument();
    expect(screen.getByText('TVA collectée')).toBeInTheDocument();
    expect(screen.getByText('Clients actifs')).toBeInTheDocument();
  });

  it('switches to TVA report when tab is clicked', () => {
    render(<ReportsPage />);
    
    const tvaTab = screen.getByRole('button', { name: /🧾 Rapport TVA/ });
    fireEvent.click(tvaTab);
    
    expect(screen.getByTestId('tva-report')).toBeInTheDocument();
    expect(screen.getByText('Generate TVA Report')).toBeInTheDocument();
  });

  it('switches to income report when tab is clicked', () => {
    render(<ReportsPage />);
    
    const incomeTab = screen.getByRole('button', { name: /💰 Revenus/ });
    fireEvent.click(incomeTab);
    
    expect(screen.getByTestId('income-report')).toBeInTheDocument();
    expect(screen.getByText('Generate Income Report')).toBeInTheDocument();
  });

  it('switches to client report when tab is clicked', () => {
    render(<ReportsPage />);
    
    const clientTab = screen.getByRole('button', { name: /👥 Clients/ });
    fireEvent.click(clientTab);
    
    expect(screen.getByTestId('client-report')).toBeInTheDocument();
    expect(screen.getByText('Generate Client Report')).toBeInTheDocument();
  });

  it('switches to TVA report when overview card is clicked', () => {
    render(<ReportsPage />);
    
    const tvaCard = screen.getByText('Déclaration TVA pour les autorités suisses').closest('div');
    if (tvaCard) {
      fireEvent.click(tvaCard);
    }
    
    expect(screen.getByTestId('tva-report')).toBeInTheDocument();
  });

  it('switches to income report when overview card is clicked', () => {
    render(<ReportsPage />);
    
    const incomeCard = screen.getByText('Analyse détaillée de vos performances').closest('div');
    if (incomeCard) {
      fireEvent.click(incomeCard);
    }
    
    expect(screen.getByTestId('income-report')).toBeInTheDocument();
  });

  it('switches to client report when overview card is clicked', () => {
    render(<ReportsPage />);
    
    const clientCard = screen.getByText('Performance par client').closest('div');
    if (clientCard) {
      fireEvent.click(clientCard);
    }
    
    expect(screen.getByTestId('client-report')).toBeInTheDocument();
  });

  it('highlights active tab correctly', () => {
    render(<ReportsPage />);
    
    // Overview should be active by default
    const overviewTab = screen.getByRole('button', { name: /📊 Vue d'ensemble/ });
    expect(overviewTab).toHaveClass('border-blue-500', 'text-blue-600');
    
    // Switch to TVA report
    const tvaTab = screen.getByRole('button', { name: /🧾 Rapport TVA/ });
    fireEvent.click(tvaTab);
    
    expect(tvaTab).toHaveClass('border-blue-500', 'text-blue-600');
    expect(overviewTab).toHaveClass('border-transparent', 'text-slate-500');
  });

  it('shows recent reports section in overview', () => {
    render(<ReportsPage />);
    
    expect(screen.getByText('Rapports récents')).toBeInTheDocument();
    expect(screen.getByText('Aucun rapport généré récemment')).toBeInTheDocument();
    expect(screen.getByText('Sélectionnez un type de rapport ci-dessus pour commencer')).toBeInTheDocument();
  });

  it('handles report generation callbacks', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    render(<ReportsPage />);
    
    // Switch to TVA report and generate
    const tvaTab = screen.getByRole('button', { name: /🧾 Rapport TVA/ });
    fireEvent.click(tvaTab);
    
    const generateButton = screen.getByText('Generate TVA Report');
    fireEvent.click(generateButton);
    
    expect(consoleSpy).toHaveBeenCalledWith('Generating TVA report:', {
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    });
    
    consoleSpy.mockRestore();
  });
});