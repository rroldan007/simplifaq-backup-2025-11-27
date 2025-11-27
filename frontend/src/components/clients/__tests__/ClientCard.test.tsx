import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClientCard } from '../ClientCard';

describe('ClientCard', () => {
  const mockCompanyClient = {
    id: '1',
    companyName: 'Test Company SA',
    email: 'contact@testcompany.ch',
    phone: '+41 22 123 45 67',
    address: {
      street: 'Rue de la Paix 123',
      city: 'Geneva',
      postalCode: '1200',
      country: 'Switzerland',
      canton: 'GE'
    },
    vatNumber: 'CHE-123.456.789',
    language: 'fr' as const,
    paymentTerms: 30,
    notes: 'Important client',
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  };

  const mockIndividualClient = {
    id: '2',
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean.dupont@email.ch',
    address: {
      street: 'Chemin des Fleurs 78',
      city: 'Zurich',
      postalCode: '8000',
      country: 'Switzerland'
    },
    language: 'de' as const,
    paymentTerms: 15,
    isActive: false,
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z'
  };

  const mockHandlers = {
    onView: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onCreateInvoice: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders company client information correctly', () => {
    render(<ClientCard client={mockCompanyClient} {...mockHandlers} />);
    
    expect(screen.getByText('Test Company SA')).toBeInTheDocument();
    expect(screen.getByText('Entreprise')).toBeInTheDocument();
    expect(screen.getByText('🏢')).toBeInTheDocument();
    expect(screen.getByText('Actif')).toBeInTheDocument();
    expect(screen.getByText('30 jours')).toBeInTheDocument();
    expect(screen.getByText('contact@testcompany.ch')).toBeInTheDocument();
    expect(screen.getByText('CHE-123.456.789')).toBeInTheDocument();
  });

  it('renders individual client information correctly', () => {
    render(<ClientCard client={mockIndividualClient} {...mockHandlers} />);
    
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
    expect(screen.getByText('Particulier')).toBeInTheDocument();
    expect(screen.getByText('👤')).toBeInTheDocument();
    expect(screen.getByText('Inactif')).toBeInTheDocument();
    expect(screen.getByText('15 jours')).toBeInTheDocument();
    expect(screen.getByText('jean.dupont@email.ch')).toBeInTheDocument();
  });

  it('displays correct language labels', () => {
    render(<ClientCard client={mockCompanyClient} {...mockHandlers} />);
    expect(screen.getByText('Français')).toBeInTheDocument();

    render(<ClientCard client={mockIndividualClient} {...mockHandlers} />);
    expect(screen.getByText('Allemand')).toBeInTheDocument();
  });

  it('shows address information correctly', () => {
    render(<ClientCard client={mockCompanyClient} {...mockHandlers} />);
    
    expect(screen.getByText('Rue de la Paix 123')).toBeInTheDocument();
    expect(screen.getByText('1200 Geneva, GE')).toBeInTheDocument();
    expect(screen.getByText('Switzerland')).toBeInTheDocument();
  });

  it('displays notes when available', () => {
    render(<ClientCard client={mockCompanyClient} {...mockHandlers} />);
    
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Important client')).toBeInTheDocument();
  });

  it('does not display notes section when notes are empty', () => {
    render(<ClientCard client={mockIndividualClient} {...mockHandlers} />);
    
    expect(screen.queryByText('Notes')).not.toBeInTheDocument();
  });

  it('shows correct actions for active client', () => {
    render(<ClientCard client={mockCompanyClient} {...mockHandlers} />);
    
    expect(screen.getByText('Voir')).toBeInTheDocument();
    expect(screen.getByText('Modifier')).toBeInTheDocument();
    expect(screen.getByText('Nouvelle facture')).toBeInTheDocument();
    expect(screen.getByText('Supprimer')).toBeInTheDocument();
  });

  it('does not show delete action for inactive client', () => {
    render(<ClientCard client={mockIndividualClient} {...mockHandlers} />);
    
    expect(screen.queryByText('Supprimer')).not.toBeInTheDocument();
  });

  it('calls correct handlers when actions are clicked', () => {
    render(<ClientCard client={mockCompanyClient} {...mockHandlers} />);
    
    fireEvent.click(screen.getByText('Voir'));
    expect(mockHandlers.onView).toHaveBeenCalledWith('1');
    
    fireEvent.click(screen.getByText('Modifier'));
    expect(mockHandlers.onEdit).toHaveBeenCalledWith('1');
    
    fireEvent.click(screen.getByText('Nouvelle facture'));
    expect(mockHandlers.onCreateInvoice).toHaveBeenCalledWith('1');
    
    fireEvent.click(screen.getByText('Supprimer'));
    expect(mockHandlers.onDelete).toHaveBeenCalledWith('1');
  });

  it('formats dates correctly in French locale', () => {
    render(<ClientCard client={mockCompanyClient} {...mockHandlers} />);
    
    expect(screen.getByText('15.01.2024')).toBeInTheDocument();
  });

  it('creates mailto and tel links correctly', () => {
    render(<ClientCard client={mockCompanyClient} {...mockHandlers} />);
    
    const emailLink = screen.getByRole('link', { name: 'contact@testcompany.ch' });
    expect(emailLink).toHaveAttribute('href', 'mailto:contact@testcompany.ch');
    
    const phoneLink = screen.getByRole('link', { name: '+41 22 123 45 67' });
    expect(phoneLink).toHaveAttribute('href', 'tel:+41 22 123 45 67');
  });

  it('handles singular/plural payment terms correctly', () => {
    const clientWith1Day = { ...mockCompanyClient, paymentTerms: 1 };
    render(<ClientCard client={clientWith1Day} {...mockHandlers} />);
    
    expect(screen.getByText('1 jour')).toBeInTheDocument();
  });
});