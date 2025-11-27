import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from '../Layout';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn<ReturnType<Storage['getItem']>, Parameters<Storage['getItem']>>(),
  setItem: jest.fn<ReturnType<Storage['setItem']>, Parameters<Storage['setItem']>>(),
  removeItem: jest.fn<ReturnType<Storage['removeItem']>, Parameters<Storage['removeItem']>>(),
  clear: jest.fn<ReturnType<Storage['clear']>, Parameters<Storage['clear']>>(),
  key: jest.fn<ReturnType<Storage['key']>, Parameters<Storage['key']>>(),
  length: 0,
};
global.localStorage = localStorageMock as unknown as Storage;

// Mock fetch
global.fetch = jest.fn();

// Wrapper avec AuthProvider et Router
function TestWrapper({ 
  children, 
  initialEntries = ['/dashboard'] 
}: { 
  children: React.ReactNode;
  initialEntries?: string[];
}) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    (fetch as jest.Mock).mockClear();

    // Mock d'un utilisateur connecté
    const mockUser = {
      id: '1',
      email: 'test@simplifaq.ch',
      companyName: 'Simplifaq SA',
      firstName: 'Jean',
      lastName: 'Dupont',
    };

    localStorageMock.getItem.mockImplementation((key: string): string | null => {
      if (key === 'simplifaq_token') return 'mock-token';
      if (key === 'simplifaq_user') return JSON.stringify(mockUser);
      return null;
    });
  });

  it('should render navigation items', () => {
    render(
      <TestWrapper>
        <Layout />
      </TestWrapper>
    );

    expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
    expect(screen.getByText('Factures')).toBeInTheDocument();
    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getByText('Produits')).toBeInTheDocument();
    expect(screen.getByText('Rapports')).toBeInTheDocument();
    expect(screen.getByText('Paramètres')).toBeInTheDocument();
  });

  it('should highlight active navigation item', () => {
    render(
      <TestWrapper initialEntries={['/invoices']}>
        <Layout />
      </TestWrapper>
    );

    const invoicesLink = screen.getByText('Factures').closest('a');
    expect(invoicesLink).toHaveClass('bg-blue-50', 'text-blue-700');
  });

  it('should display user information', () => {
    render(
      <TestWrapper>
        <Layout />
      </TestWrapper>
    );

    expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
    expect(screen.getByText('test@simplifaq.ch')).toBeInTheDocument();
    expect(screen.getByText('Simplifaq SA')).toBeInTheDocument();
  });

  it('should display user initials', () => {
    render(
      <TestWrapper>
        <Layout />
      </TestWrapper>
    );

    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('should show mobile menu button on small screens', () => {
    // Mock window.innerWidth pour simuler un écran mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 640,
    });

    render(
      <TestWrapper>
        <Layout />
      </TestWrapper>
    );

    // Le bouton menu mobile devrait être présent (même s'il est caché par CSS)
    const menuButtons = screen.getAllByRole('button');
    const mobileMenuButton = menuButtons.find(button => 
      button.querySelector('svg')?.getAttribute('viewBox') === '0 0 24 24'
    );
    expect(mobileMenuButton).toBeInTheDocument();
  });

  it('should toggle mobile sidebar when menu button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <Layout />
      </TestWrapper>
    );

    // Trouver le bouton menu mobile
    const menuButtons = screen.getAllByRole('button');
    const mobileMenuButton = menuButtons.find(button => 
      button.querySelector('svg')?.getAttribute('viewBox') === '0 0 24 24'
    );

    if (mobileMenuButton) {
      await user.click(mobileMenuButton);
      
      // Vérifier que la sidebar a la classe pour être visible
      const sidebar = screen.getByRole('navigation').closest('div');
      expect(sidebar).toHaveClass('translate-x-0');
    }
  });

  it('should close mobile sidebar when navigation link is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <Layout />
      </TestWrapper>
    );

    // Ouvrir d'abord la sidebar mobile
    const menuButtons = screen.getAllByRole('button');
    const mobileMenuButton = menuButtons.find(button => 
      button.querySelector('svg')?.getAttribute('viewBox') === '0 0 24 24'
    );

    if (mobileMenuButton) {
      await user.click(mobileMenuButton);
      
      // Cliquer sur un lien de navigation
      const invoicesLink = screen.getByText('Factures');
      await user.click(invoicesLink);
      
      // La sidebar devrait se fermer
      const sidebar = screen.getByRole('navigation').closest('div');
      expect(sidebar).toHaveClass('-translate-x-full');
    }
  });

  it('should close mobile sidebar when close button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <Layout />
      </TestWrapper>
    );

    // Ouvrir d'abord la sidebar mobile
    const menuButtons = screen.getAllByRole('button');
    const mobileMenuButton = menuButtons.find(button => 
      button.querySelector('svg')?.getAttribute('viewBox') === '0 0 24 24'
    );

    if (mobileMenuButton) {
      await user.click(mobileMenuButton);
      
      // Trouver et cliquer sur le bouton fermer
      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find(button => 
        button.querySelector('svg')?.querySelector('path')?.getAttribute('d')?.includes('M6 18L18 6M6 6l12 12')
      );

      if (closeButton) {
        await user.click(closeButton);
        
        // La sidebar devrait se fermer
        const sidebar = screen.getByRole('navigation').closest('div');
        expect(sidebar).toHaveClass('-translate-x-full');
      }
    }
  });

  it('should close mobile sidebar when overlay is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <Layout />
      </TestWrapper>
    );

    // Ouvrir d'abord la sidebar mobile
    const menuButtons = screen.getAllByRole('button');
    const mobileMenuButton = menuButtons.find(button => 
      button.querySelector('svg')?.getAttribute('viewBox') === '0 0 24 24'
    );

    if (mobileMenuButton) {
      await user.click(mobileMenuButton);
      
      // Trouver et cliquer sur l'overlay
      const overlay = document.querySelector('.bg-black.bg-opacity-50');
      if (overlay) {
        fireEvent.click(overlay);
        
        // La sidebar devrait se fermer
        const sidebar = screen.getByRole('navigation').closest('div');
        expect(sidebar).toHaveClass('-translate-x-full');
      }
    }
  });

  it('should render Simplifaq logo', () => {
    render(
      <TestWrapper>
        <Layout />
      </TestWrapper>
    );

    expect(screen.getByText('Simplifaq')).toBeInTheDocument();
    expect(screen.getByText('S')).toBeInTheDocument(); // Logo icon
  });

  it('should have proper navigation structure', () => {
    render(
      <TestWrapper>
        <Layout />
      </TestWrapper>
    );

    const navigation = screen.getByRole('navigation');
    expect(navigation).toBeInTheDocument();

    // Vérifier que tous les liens de navigation sont présents
    const links = screen.getAllByRole('link');
    const navigationLinks = links.filter(link => 
      link.getAttribute('href')?.startsWith('/')
    );

    expect(navigationLinks.length).toBeGreaterThanOrEqual(6); // 6 liens de navigation + logo
  });

  it('should show navigation descriptions on large screens', () => {
    render(
      <TestWrapper>
        <Layout />
      </TestWrapper>
    );

    const navigation = screen.getByRole('navigation');
    expect(within(navigation).getByText(/Vue d'ensemble/)).toBeInTheDocument();
    expect(within(navigation).getByText(/Gérez vos factures/)).toBeInTheDocument();
    expect(within(navigation).getByText(/Gérez vos clients/)).toBeInTheDocument();
  });

  it('should handle different route patterns correctly', () => {
    const { rerender } = render(<TestWrapper initialEntries={['/dashboard']}><Layout /></TestWrapper>);

    // Dashboard should be active
    let nav = screen.getByRole('navigation');
    expect(within(nav).getByText('Tableau de bord').closest('a')).toHaveClass('bg-blue-50');

    // Test sub-route
    rerender(<TestWrapper initialEntries={['/invoices/new']}><Layout /></TestWrapper>);
    nav = screen.getByRole('navigation');
    expect(within(nav).getByText('Factures').closest('a')).toHaveClass('bg-blue-50');

    // Test exact route
    rerender(<TestWrapper initialEntries={['/clients']}><Layout /></TestWrapper>);
    nav = screen.getByRole('navigation');
    expect(within(nav).getByText('Clients').closest('a')).toHaveClass('bg-blue-50');
  });
});