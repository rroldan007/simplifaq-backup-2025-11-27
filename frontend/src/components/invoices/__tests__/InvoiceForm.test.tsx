import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InvoiceForm } from '../InvoiceForm';

describe('InvoiceForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();
  const mockOnPreview = jest.fn();

  const mockClient = {
    id: '1',
    companyName: 'Test Company SA',
    email: 'test@company.ch',
    address: {
      street: 'Test Street 123',
      city: 'Geneva',
      postalCode: '1200',
      country: 'Switzerland'
    },
    vatNumber: 'CHE-123.456.789'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form in create mode', () => {
    render(
      <InvoiceForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        onPreview={mockOnPreview}
        mode="create"
      />
    );

    expect(screen.getByText('Nouvelle facture')).toBeInTheDocument();
    expect(screen.getByText('Créer la facture')).toBeInTheDocument();
    expect(screen.getByText('Détails de la facture')).toBeInTheDocument();
  });

  it('renders form in edit mode', () => {
    render(
      <InvoiceForm
        onSubmit={mockOnSubmit}
        mode="edit"
        initialData={{
          invoiceNumber: 'FAC-2024-001',
          client: mockClient
        }}
      />
    );

    expect(screen.getByText('Modifier la facture')).toBeInTheDocument();
    expect(screen.getByText('Enregistrer')).toBeInTheDocument();
  });

  it('generates invoice number automatically in create mode', async () => {
    render(<InvoiceForm onSubmit={mockOnSubmit} mode="create" />);

    await waitFor(() => {
      const invoiceNumberInput = screen.getByDisplayValue(/FAC-\d{6}-\d{3}/);
      expect(invoiceNumberInput).toBeInTheDocument();
    });
  });

  it('validates required fields', async () => {
    render(<InvoiceForm onSubmit={mockOnSubmit} />);

    const submitButton = screen.getByText('Créer la facture');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Veuillez sélectionner un client')).toBeInTheDocument();
      expect(screen.getByText('Veuillez ajouter au moins un article')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates date logic', async () => {
    render(<InvoiceForm onSubmit={mockOnSubmit} />);

    // Set due date before issue date
    const issueDateInput = screen.getByLabelText(/Date d'émission/);
    const dueDateInput = screen.getByLabelText(/Date d'échéance/);

    fireEvent.change(issueDateInput, { target: { value: '2024-02-01' } });
    fireEvent.change(dueDateInput, { target: { value: '2024-01-01' } });

    const submitButton = screen.getByText('Créer la facture');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('La date d\'échéance doit être postérieure à la date d\'émission')).toBeInTheDocument();
    });
  });

  it('shows Swiss QR Bill information', () => {
    render(<InvoiceForm onSubmit={mockOnSubmit} />);

    expect(screen.getByText('Swiss QR Bill')).toBeInTheDocument();
    expect(screen.getByText('🇨🇭')).toBeInTheDocument();
    expect(screen.getByText(/Un QR Bill sera automatiquement généré/)).toBeInTheDocument();
  });

  it('displays currency options', () => {
    render(<InvoiceForm onSubmit={mockOnSubmit} />);

    expect(screen.getByText('CHF - Franc suisse')).toBeInTheDocument();
    expect(screen.getByText('EUR - Euro')).toBeInTheDocument();
  });

  it('calls onPreview when preview button is clicked', () => {
    render(
      <InvoiceForm
        onSubmit={mockOnSubmit}
        onPreview={mockOnPreview}
        initialData={{
          client: mockClient,
          items: [{
            id: '1',
            description: 'Test item',
            quantity: 1,
            unitPrice: 100,
            tvaRate: 7.7,
            total: 107.7,
            order: 0
          }]
        }}
      />
    );

    const previewButton = screen.getByText('Aperçu');
    fireEvent.click(previewButton);

    expect(mockOnPreview).toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <InvoiceForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Annuler');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('updates totals when items change', () => {
    const initialData = {
      client: mockClient,
      items: [{
        id: '1',
        description: 'Test item',
        quantity: 2,
        unitPrice: 100,
        tvaRate: 7.7,
        total: 215.4,
        order: 0
      }]
    };

    render(<InvoiceForm onSubmit={mockOnSubmit} initialData={initialData} />);

    // Check that totals are displayed correctly
    expect(screen.getByText('CHF 200.00')).toBeInTheDocument(); // Subtotal
    expect(screen.getByText('CHF 15.40')).toBeInTheDocument(); // TVA
    expect(screen.getByText('CHF 215.40')).toBeInTheDocument(); // Total
  });

  it('shows client information when selected', () => {
    render(
      <InvoiceForm
        onSubmit={mockOnSubmit}
        initialData={{ client: mockClient }}
      />
    );

    expect(screen.getByText('Test Company SA')).toBeInTheDocument();
    expect(screen.getByText('Geneva, Switzerland')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    render(
      <InvoiceForm
        onSubmit={mockOnSubmit}
        loading={true}
      />
    );

    const submitButton = screen.getByRole('button', { name: /Créer la facture/ });
    expect(submitButton).toBeDisabled();
  });
});