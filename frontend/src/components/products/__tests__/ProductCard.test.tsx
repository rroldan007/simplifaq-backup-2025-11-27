import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from '../ProductCard';

describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    name: 'Consultation développement web',
    description: 'Consultation technique pour projets de développement web',
    unitPrice: 120,
    tvaRate: 8.1,
    unit: 'hour',
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  };

  const mockInactiveProduct = {
    id: '2',
    name: 'Service inactif',
    unitPrice: 50,
    tvaRate: 0,
    unit: 'piece',
    isActive: false,
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z'
  };

  const mockHandlers = {
    onView: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onDuplicate: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders product information correctly', () => {
    render(<ProductCard product={mockProduct} {...mockHandlers} />);
    
    expect(screen.getByText('Consultation développement web')).toBeInTheDocument();
    expect(screen.getByText('Consultation technique pour projets de développement web')).toBeInTheDocument();
    expect(screen.getByText('Actif')).toBeInTheDocument();
    expect(screen.getByText('CHF 120.00')).toBeInTheDocument();
    expect(screen.getByText('par heure')).toBeInTheDocument();
  });

  it('calculates and displays price with TVA correctly', () => {
    render(<ProductCard product={mockProduct} {...mockHandlers} />);
    
    // Price with TVA: 120 * 1.081 = 129.72
    expect(screen.getByText('CHF 129.72')).toBeInTheDocument();
    expect(screen.getByText('TVA incluse')).toBeInTheDocument();
  });

  it('displays correct TVA rate label and color', () => {
    render(<ProductCard product={mockProduct} {...mockHandlers} />);
    
    expect(screen.getByText('8.1% (Taux normal)')).toBeInTheDocument();
    
    // Test with exempt product
    render(<ProductCard product={mockInactiveProduct} {...mockHandlers} />);
    expect(screen.getByText('0% (Exonéré)')).toBeInTheDocument();
  });

  it('shows correct unit labels in French', () => {
    render(<ProductCard product={mockProduct} {...mockHandlers} />);
    
    expect(screen.getByText('Heure')).toBeInTheDocument();
  });

  it('displays inactive status correctly', () => {
    render(<ProductCard product={mockInactiveProduct} {...mockHandlers} />);
    
    expect(screen.getByText('Inactif')).toBeInTheDocument();
  });

  it('shows correct actions for active product', () => {
    render(<ProductCard product={mockProduct} {...mockHandlers} />);
    
    expect(screen.getByText('Voir')).toBeInTheDocument();
    expect(screen.getByText('Modifier')).toBeInTheDocument();
    expect(screen.getByText('Dupliquer')).toBeInTheDocument();
    expect(screen.getByText('Supprimer')).toBeInTheDocument();
  });

  it('does not show delete action for inactive product', () => {
    render(<ProductCard product={mockInactiveProduct} {...mockHandlers} />);
    
    expect(screen.queryByText('Supprimer')).not.toBeInTheDocument();
  });

  it('calls correct handlers when actions are clicked', () => {
    render(<ProductCard product={mockProduct} {...mockHandlers} />);
    
    fireEvent.click(screen.getByText('Voir'));
    expect(mockHandlers.onView).toHaveBeenCalledWith('1');
    
    fireEvent.click(screen.getByText('Modifier'));
    expect(mockHandlers.onEdit).toHaveBeenCalledWith('1');
    
    fireEvent.click(screen.getByText('Dupliquer'));
    expect(mockHandlers.onDuplicate).toHaveBeenCalledWith('1');
    
    fireEvent.click(screen.getByText('Supprimer'));
    expect(mockHandlers.onDelete).toHaveBeenCalledWith('1');
  });

  it('formats dates correctly in French locale', () => {
    render(<ProductCard product={mockProduct} {...mockHandlers} />);
    
    expect(screen.getByText('15.01.2024')).toBeInTheDocument();
  });

  it('calculates TVA amount correctly', () => {
    render(<ProductCard product={mockProduct} {...mockHandlers} />);
    
    // TVA amount: 120 * 0.081 = 9.72
    expect(screen.getByText('+CHF 9.72 TVA')).toBeInTheDocument();
  });

  it('handles product without description', () => {
    const productWithoutDescription = { ...mockProduct };
    delete productWithoutDescription.description;
    
    render(<ProductCard product={productWithoutDescription} {...mockHandlers} />);
    
    expect(screen.getByText('Consultation développement web')).toBeInTheDocument();
    // Description should not be rendered
    expect(screen.queryByText('Consultation technique')).not.toBeInTheDocument();
  });

  it('uses custom currency when provided', () => {
    render(<ProductCard product={mockProduct} currency="EUR" {...mockHandlers} />);
    
    expect(screen.getByText('€120.00')).toBeInTheDocument();
    expect(screen.getByText('€129.72')).toBeInTheDocument();
  });
});