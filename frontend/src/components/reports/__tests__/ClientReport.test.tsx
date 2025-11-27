import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClientReport } from '../ClientReport';

const mockClients = [
  { id: '1', name: 'Entreprise ABC SA', email: 'contact@abc.ch' },
  { id: '2', name: 'Société XYZ Sàrl', email: 'info@xyz.ch' }
];

const mockReportData = {
  period: {
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    label: 'Année 2024'
  },
  selectedClient: {
    id: '1',
    name: 'Entreprise ABC SA',
    email: 'contact@abc.ch',
    address: '123 Rue de la Paix, 1000 Lausanne'
  },
  summary: {
    totalRevenue: 50000,
    totalInvoices: 25,
    averageInvoiceAmount: 2000,
    paidAmount: 45000,
    pendingAmount: 3000,
    overdueAmount: 2000,
    paymentDelayAverage: 15
  },
  invoiceHistory: [
    {
      id: '1',
      invoiceNumber: 'INV-2024-001',
      date: '2024-01-15',
      dueDate: '2024-02-14',
      amount: 2500,
      status: 'paid' as const,
      paymentDate: '2024-02-10',
      paymentDelay: -4
    },
    {
      id: '2',
      invoiceNumber: 'INV-2024-002',
      date: '2024-02-15',
      dueDate: '2024-03-17',
      amount: 1800,
      status: 'overdue' as const,
      paymentDelay: 10
    }
  ],
  paymentBehavior: {
    onTimePayments: 20,
    latePayments: 5,
    averagePaymentDelay: 15,
    longestPaymentDelay: 45
  },
  monthlyActivity: [
    {
      month: '2024-01',
      revenue: 5000,
      invoiceCount: 3
    },
    {
      month: '2024-02',
      revenue: 7500,
      invoiceCount: 4
    }
  ]
};

describe('ClientReport', () => {
  const mockOnGenerateReport = jest.fn();
  const mockOnExportPDF = jest.fn();
  const mockOnExportExcel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the client report header', () => {
    render(
      <ClientReport
        onGenerateReport={mockOnGenerateReport}
        clients={mockClients}
      />
    );
    
    expect(screen.getByText('Rapport clients')).toBeInTheDocument();
    expect(screen.getByText('Analyse détaillée de la performance par client')).toBeInTheDocument();
  });

  it('renders filters and period selection', () => {
    render(
      <ClientReport
        onGenerateReport={mockOnGenerateReport}
        clients={mockClients}
      />
    );
    
    expect(screen.getByText('Filtres et période')).toBeInTheDocument();
    expect(screen.getByText('Client (optionnel)')).toBeInTheDocument();
    expect(screen.getByText('Période personnalisée')).toBeInTheDocument();
    expect(screen.getByText('Périodes prédéfinies')).toBeInTheDocument();
    
    // Check client dropdown
    expect(screen.getByText('Tous les clients')).toBeInTheDocument();
    expect(screen.getByText('Entreprise ABC SA')).toBeInTheDocument();
    expect(screen.getByText('Société XYZ Sàrl')).toBeInTheDocument();
  });

  it('renders quick period buttons', () => {
    render(
      <ClientReport
        onGenerateReport={mockOnGenerateReport}
        clients={mockClients}
      />
    );
    
    expect(screen.getByText('Année en cours')).toBeInTheDocument();
    expect(screen.getByText('Année précédente')).toBeInTheDocument();
    expect(screen.getByText('6 derniers mois')).toBeInTheDocument();
    expect(screen.getByText('12 derniers mois')).toBeInTheDocument();
  });

  it('calls onGenerateReport when generate button is clicked', () => {
    render(
      <ClientReport
        onGenerateReport={mockOnGenerateReport}
        clients={mockClients}
      />
    );
    
    const generateButton = screen.getByText('Générer le rapport');
    fireEvent.click(generateButton);
    
    expect(mockOnGenerateReport).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      undefined
    );
  });

  it('calls onGenerateReport with selected client when client is selected', () => {
    render(
      <ClientReport
        onGenerateReport={mockOnGenerateReport}
        clients={mockClients}
      />
    );
    
    const clientSelect = screen.getByDisplayValue('Tous les clients');
    fireEvent.change(clientSelect, { target: { value: '1' } });
    
    const generateButton = screen.getByText('Générer le rapport');
    fireEvent.click(generateButton);
    
    expect(mockOnGenerateReport).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      '1'
    );
  });

  it('renders report data when provided', () => {
    render(
      <ClientReport
        data={mockReportData}
        onGenerateReport={mockOnGenerateReport}
        clients={mockClients}
        onExportPDF={mockOnExportPDF}
        onExportExcel={mockOnExportExcel}
      />
    );
    
    // Check export buttons appear
    expect(screen.getByText('Exporter PDF')).toBeInTheDocument();
    expect(screen.getByText('Exporter Excel')).toBeInTheDocument();
    
    // Check client information
    expect(screen.getByText('Informations client')).toBeInTheDocument();
    expect(screen.getByText('Entreprise ABC SA')).toBeInTheDocument();
    expect(screen.getByText('contact@abc.ch')).toBeInTheDocument();
    expect(screen.getByText('123 Rue de la Paix, 1000 Lausanne')).toBeInTheDocument();
    
    // Check summary
    expect(screen.getByText('Résumé - Année 2024')).toBeInTheDocument();
    expect(screen.getByText('CHF 50\'000.00')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('CHF 2\'000.00')).toBeInTheDocument();
    expect(screen.getByText('15j')).toBeInTheDocument();
  });

  it('renders payment behavior section', () => {
    render(
      <ClientReport
        data={mockReportData}
        onGenerateReport={mockOnGenerateReport}
        clients={mockClients}
      />
    );
    
    expect(screen.getByText('Comportement de paiement')).toBeInTheDocument();
    expect(screen.getByText('Paiements à temps')).toBeInTheDocument();
    expect(screen.getByText('Paiements en retard')).toBeInTheDocument();
    expect(screen.getByText('Délai moyen')).toBeInTheDocument();
    expect(screen.getByText('Plus long délai')).toBeInTheDocument();
    
    // Check values
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('45j')).toBeInTheDocument();
  });

  it('renders monthly activity table', () => {
    render(
      <ClientReport
        data={mockReportData}
        onGenerateReport={mockOnGenerateReport}
        clients={mockClients}
      />
    );
    
    expect(screen.getByText('Activité mensuelle')).toBeInTheDocument();
    expect(screen.getByText('janvier 2024')).toBeInTheDocument();
    expect(screen.getByText('février 2024')).toBeInTheDocument();
    expect(screen.getByText('CHF 5\'000.00')).toBeInTheDocument();
    expect(screen.getByText('CHF 7\'500.00')).toBeInTheDocument();
  });

  it('renders invoice history table', () => {
    render(
      <ClientReport
        data={mockReportData}
        onGenerateReport={mockOnGenerateReport}
        clients={mockClients}
      />
    );
    
    expect(screen.getByText('Historique des factures (2)')).toBeInTheDocument();
    expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
    expect(screen.getByText('INV-2024-002')).toBeInTheDocument();
    expect(screen.getByText('CHF 2\'500.00')).toBeInTheDocument();
    expect(screen.getByText('CHF 1\'800.00')).toBeInTheDocument();
    expect(screen.getByText('Payée')).toBeInTheDocument();
    expect(screen.getByText('En retard')).toBeInTheDocument();
  });

  it('renders insights section', () => {
    render(
      <ClientReport
        data={mockReportData}
        onGenerateReport={mockOnGenerateReport}
        clients={mockClients}
      />
    );
    
    expect(screen.getByText('Analyses et recommandations')).toBeInTheDocument();
    expect(screen.getByText(/Ce client représente CHF 50'000.00 de chiffre d'affaires/)).toBeInTheDocument();
    expect(screen.getByText(/Montant moyen par facture: CHF 2'000.00/)).toBeInTheDocument();
    expect(screen.getByText(/Délai de paiement moyen: 15 jours/)).toBeInTheDocument();
  });

  it('calls export functions when export buttons are clicked', () => {
    render(
      <ClientReport
        data={mockReportData}
        onGenerateReport={mockOnGenerateReport}
        clients={mockClients}
        onExportPDF={mockOnExportPDF}
        onExportExcel={mockOnExportExcel}
      />
    );
    
    const pdfButton = screen.getByText('Exporter PDF');
    const excelButton = screen.getByText('Exporter Excel');
    
    fireEvent.click(pdfButton);
    expect(mockOnExportPDF).toHaveBeenCalledTimes(1);
    
    fireEvent.click(excelButton);
    expect(mockOnExportExcel).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(
      <ClientReport
        onGenerateReport={mockOnGenerateReport}
        clients={mockClients}
        loading={true}
      />
    );
    
    const generateButton = screen.getByText('Générer le rapport');
    expect(generateButton).toBeDisabled();
  });

  it('updates date inputs correctly', () => {
    render(
      <ClientReport
        onGenerateReport={mockOnGenerateReport}
        clients={mockClients}
      />
    );
    
    const startDateInput = screen.getByLabelText('Début');
    const endDateInput = screen.getByLabelText('Fin');
    
    fireEvent.change(startDateInput, { target: { value: '2024-06-01' } });
    fireEvent.change(endDateInput, { target: { value: '2024-06-30' } });
    
    expect(startDateInput).toHaveValue('2024-06-01');
    expect(endDateInput).toHaveValue('2024-06-30');
  });

  it('sets quick periods correctly', () => {
    render(
      <ClientReport
        onGenerateReport={mockOnGenerateReport}
        clients={mockClients}
      />
    );
    
    const currentYearButton = screen.getByText('Année en cours');
    fireEvent.click(currentYearButton);
    
    const startDateInput = screen.getByLabelText('Début');
    const endDateInput = screen.getByLabelText('Fin');
    
    expect(startDateInput.value).toMatch(/^\d{4}-01-01$/);
    expect(endDateInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});