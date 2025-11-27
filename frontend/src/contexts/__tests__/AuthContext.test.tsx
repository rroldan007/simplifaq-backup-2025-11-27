import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock fetch
global.fetch = jest.fn();

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

// Composant de test pour utiliser le hook useAuth
function TestComponent() {
  const {
    state,
    login,
    register,
    logout,
    clearError,
    updateUser,
  } = useAuth();

  return (
    <div>
      <div data-testid="loading">{state.isLoading.toString()}</div>
      <div data-testid="authenticated">{state.isAuthenticated.toString()}</div>
      <div data-testid="error">{state.error || 'no-error'}</div>
      <div data-testid="user">{state.user ? state.user.email : 'no-user'}</div>
      <button
        data-testid="login-btn"
        onClick={() => login({ email: 'test@example.com', password: 'password123' })}
      >
        Login
      </button>
      <button
        data-testid="register-btn"
        onClick={() => register({
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123',
          companyName: 'Test Company',
          firstName: 'John',
          lastName: 'Doe',
          street: '123 Test St',
          postalCode: '1000',
          city: 'Lausanne',
          canton: 'VD',
          country: 'Suisse',
        })}
      >
        Register
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
      <button data-testid="clear-error-btn" onClick={clearError}>
        Clear Error
      </button>
      <button
        data-testid="update-user-btn"
        onClick={() => updateUser({
          id: '1',
          email: 'updated@example.com',
          companyName: 'Updated Company',
          firstName: 'Jane',
          lastName: 'Doe',
        })}
      >
        Update User
      </button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  it('should provide initial state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    expect(screen.getByTestId('user')).toHaveTextContent('no-user');
  });

  it('should load user from localStorage on mount', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      companyName: 'Test Company',
      firstName: 'John',
      lastName: 'Doe',
    };

    localStorageMock.getItem.mockImplementation((key: string): string | null => {
      if (key === 'simplifaq_token') return 'mock-token';
      if (key === 'simplifaq_user') return JSON.stringify(mockUser);
      return null;
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
  });

  it('should handle successful login', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      companyName: 'Test Company',
      firstName: 'John',
      lastName: 'Doe',
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          user: mockUser,
          token: 'mock-token',
        },
      }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByTestId('login-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith('simplifaq_token', 'mock-token');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('simplifaq_user', JSON.stringify(mockUser));
  });

  it('should handle login error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: {
          message: 'Email ou mot de passe incorrect',
        },
      }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByTestId('login-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Email ou mot de passe incorrect');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });
  });

  it('should handle successful registration', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      companyName: 'Test Company',
      firstName: 'John',
      lastName: 'Doe',
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          user: mockUser,
          token: 'mock-token',
        },
      }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByTestId('register-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith('simplifaq_token', 'mock-token');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('simplifaq_user', JSON.stringify(mockUser));
  });

  it('should handle registration error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: {
          message: 'Cette adresse email est déjà utilisée',
        },
      }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByTestId('register-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Cette adresse email est déjà utilisée');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });
  });

  it('should handle logout', async () => {
    // D'abord, simuler un utilisateur connecté
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
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Vérifier que l'utilisateur est connecté
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');

    // Déconnecter
    act(() => {
      screen.getByTestId('logout-btn').click();
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('simplifaq_token');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('simplifaq_user');
  });

  it('should clear error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: {
          message: 'Test error',
        },
      }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Déclencher une erreur
    await act(async () => {
      screen.getByTestId('login-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Test error');
    });

    // Effacer l'erreur
    act(() => {
      screen.getByTestId('clear-error-btn').click();
    });

    expect(screen.getByTestId('error')).toHaveTextContent('no-error');
  });

  it('should update user', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    act(() => {
      screen.getByTestId('update-user-btn').click();
    });

    expect(screen.getByTestId('user')).toHaveTextContent('updated@example.com');
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'simplifaq_user',
      JSON.stringify({
        id: '1',
        email: 'updated@example.com',
        companyName: 'Updated Company',
        firstName: 'Jane',
        lastName: 'Doe',
      })
    );
  });

  it('should handle network errors', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByTestId('login-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Network error');
    });
  });

  it('should handle corrupted localStorage data', () => {
    localStorageMock.getItem.mockImplementation((key: string): string | null => {
      if (key === 'simplifaq_token') return 'mock-token';
      if (key === 'simplifaq_user') return 'invalid-json';
      return null;
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('simplifaq_token');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('simplifaq_user');
  });

  it('should throw error when used outside provider', () => {
    // Supprimer les erreurs de console pour ce test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth doit être utilisé dans un AuthProvider');

    consoleSpy.mockRestore();
  });
});