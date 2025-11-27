import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute, PublicRoute, useRouteGuard } from '../ProtectedRoute';
import { AuthProvider } from '../../contexts/AuthContext';

// Use the global localStorage mock from setupTests and type it properly
const localStorageMock = window.localStorage as jest.Mocked<Storage> & {
  _store: Record<string, string>;
  getItem: jest.Mock<string | null, [string]>;
  setItem: jest.Mock<void, [string, string]>;
  removeItem: jest.Mock<void, [string]>;
  clear: jest.Mock<void, []>;
};

// Mock fetch
global.fetch = jest.fn();

// Composant de test pour useRouteGuard
function TestRouteGuard() {
  const { canAccess, shouldRedirect, getRedirectPath, isLoading, isAuthenticated } = useRouteGuard();
  
  return (
    <div>
      <div data-testid="can-access">{canAccess().toString()}</div>
      <div data-testid="should-redirect">{shouldRedirect().toString()}</div>
      <div data-testid="redirect-path">{getRedirectPath()}</div>
      <div data-testid="is-loading">{isLoading.toString()}</div>
      <div data-testid="is-authenticated">{isAuthenticated.toString()}</div>
    </div>
  );
}

// Wrapper avec AuthProvider et Router
function TestWrapper({ 
  children, 
  initialEntries = ['/'] 
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

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock implementation for each test
    (localStorageMock.getItem as jest.Mock).mockImplementation((key: string) => {
      return localStorageMock._store[key] || null;
    });
    localStorageMock._store = {};
  });

  describe('when user is not authenticated', () => {
    it('should redirect to login page', async () => {
      render(
        <TestWrapper initialEntries={['/dashboard']}>
          <ProtectedRoute>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      // Le contenu protégé ne devrait pas être affiché
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should show loading spinner while checking auth', () => {
      render(
        <TestWrapper>
          <ProtectedRoute>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      // Pendant le chargement initial, le spinner devrait être affiché
      expect(screen.getByText('Chargement...')).toBeInTheDocument();
    });

    it('should use custom fallback component', () => {
      const CustomFallback = () => <div data-testid="custom-fallback">Custom Loading</div>;

      render(
        <TestWrapper>
          <ProtectedRoute fallback={<CustomFallback />}>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    });
  });

  describe('when user is authenticated', () => {
    beforeEach(() => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        companyName: 'Test Company',
        firstName: 'John',
        lastName: 'Doe',
      };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'simplifaq_token') return 'mock-token';
        if (key === 'simplifaq_user') return JSON.stringify(mockUser);
        return null;
      });
    });

    it('should render protected content', async () => {
      render(
        <TestWrapper>
          <ProtectedRoute>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });

    it('should redirect from public routes', async () => {
      render(
        <TestWrapper initialEntries={['/login']}>
          <PublicRoute>
            <div data-testid="public-content">Login Page</div>
          </PublicRoute>
        </TestWrapper>
      );

      // Le contenu public ne devrait pas être affiché si l'utilisateur est connecté
      await waitFor(() => {
        expect(screen.queryByTestId('public-content')).not.toBeInTheDocument();
      });
    });
  });

  describe('PublicRoute', () => {
    it('should render public content when not authenticated', () => {
      render(
        <TestWrapper>
          <PublicRoute>
            <div data-testid="public-content">Public Content</div>
          </PublicRoute>
        </TestWrapper>
      );

      expect(screen.getByTestId('public-content')).toBeInTheDocument();
    });

    it('should use custom redirect path', () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        companyName: 'Test Company',
        firstName: 'John',
        lastName: 'Doe',
      };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'simplifaq_token') return 'mock-token';
        if (key === 'simplifaq_user') return JSON.stringify(mockUser);
        return null;
      });

      render(
        <TestWrapper>
          <PublicRoute redirectTo="/custom-dashboard">
            <div data-testid="public-content">Public Content</div>
          </PublicRoute>
        </TestWrapper>
      );

      // Le contenu ne devrait pas être rendu car l'utilisateur est connecté
      expect(screen.queryByTestId('public-content')).not.toBeInTheDocument();
    });
  });

  describe('useRouteGuard hook', () => {
    it('should return correct values when not authenticated', () => {
      render(
        <TestWrapper>
          <TestRouteGuard />
        </TestWrapper>
      );

      expect(screen.getByTestId('can-access')).toHaveTextContent('false');
      expect(screen.getByTestId('should-redirect')).toHaveTextContent('true');
      expect(screen.getByTestId('redirect-path')).toHaveTextContent('/login');
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
    });

    it('should return correct values when authenticated', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        companyName: 'Test Company',
        firstName: 'John',
        lastName: 'Doe',
      };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'simplifaq_token') return 'mock-token';
        if (key === 'simplifaq_user') return JSON.stringify(mockUser);
        return null;
      });

      render(
        <TestWrapper>
          <TestRouteGuard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('can-access')).toHaveTextContent('true');
        expect(screen.getByTestId('should-redirect')).toHaveTextContent('false');
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
      });
    });

    it('should handle public route logic', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        companyName: 'Test Company',
        firstName: 'John',
        lastName: 'Doe',
      };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'simplifaq_token') return 'mock-token';
        if (key === 'simplifaq_user') return JSON.stringify(mockUser);
        return null;
      });

      function TestPublicRouteGuard() {
        const { canAccess, shouldRedirect, getRedirectPath } = useRouteGuard();
        
        return (
          <div>
            <div data-testid="can-access-public">{canAccess(false).toString()}</div>
            <div data-testid="should-redirect-public">{shouldRedirect(false).toString()}</div>
            <div data-testid="redirect-path-public">{getRedirectPath(false)}</div>
          </div>
        );
      }

      render(
        <TestWrapper initialEntries={['/login']} >
          <TestPublicRouteGuard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('can-access-public')).toHaveTextContent('true');
        expect(screen.getByTestId('should-redirect-public')).toHaveTextContent('true');
        expect(screen.getByTestId('redirect-path-public')).toHaveTextContent('/dashboard');
      });
    });
  });

  describe('custom redirect paths', () => {
    it('should use custom redirectTo for protected routes', () => {
      render(
        <TestWrapper>
          <ProtectedRoute redirectTo="/custom-login">
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      // Le contenu protégé ne devrait pas être affiché
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should preserve location state for redirect after login', () => {
      render(
        <TestWrapper initialEntries={['/dashboard']}>
          <ProtectedRoute>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      // Vérifier que le contenu protégé n'est pas rendu
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('loading states', () => {
    it('should show loading state initially', () => {
      render(
        <TestWrapper>
          <ProtectedRoute>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Chargement...')).toBeInTheDocument();
    });

    it('should not show loading state when canAccess returns false for loading', () => {
      function TestLoadingGuard() {
        const { canAccess, isLoading } = useRouteGuard();
        
        return (
          <div>
            <div data-testid="can-access-loading">{canAccess().toString()}</div>
            <div data-testid="is-loading-guard">{isLoading.toString()}</div>
          </div>
        );
      }

      render(
        <TestWrapper>
          <TestLoadingGuard />
        </TestWrapper>
      );

      expect(screen.getByTestId('can-access-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('is-loading-guard')).toHaveTextContent('false');
    });
  });
});