import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../LoginForm';
import { AuthProvider } from '../../../contexts/AuthContext';
import { MemoryRouter } from 'react-router-dom';

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

// Wrapper avec AuthProvider et MemoryRouter pour fournir le contexte Router
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  );
}

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('should render login form with all fields', () => {
    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    expect(screen.getByText('Connexion')).toBeInTheDocument();
    expect(screen.getByText('Connectez-vous à votre compte Simplifaq')).toBeInTheDocument();
    expect(screen.getByLabelText('Adresse email')).toBeInTheDocument();
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument();
    expect(screen.getByText('Se souvenir de moi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const submitButton = screen.getByRole('button', { name: 'Se connecter' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('L\'adresse email est obligatoire')).toBeInTheDocument();
      expect(screen.getByText('Le mot de passe est obligatoire')).toBeInTheDocument();
    });
  });

  it('should show validation error for invalid email', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('Adresse email');
    const submitButton = screen.getByRole('button', { name: 'Se connecter' });

    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Veuillez saisir une adresse email valide')).toBeInTheDocument();
    });
  });

  it('should show validation error for short password', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('Adresse email');
    const passwordInput = screen.getByLabelText('Mot de passe');
    const submitButton = screen.getByRole('button', { name: 'Se connecter' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, '123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Le mot de passe doit contenir au moins 8 caractères')).toBeInTheDocument();
    });
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          user: {
            id: '1',
            email: 'test@example.com',
            companyName: 'Test Company',
            firstName: 'John',
            lastName: 'Doe',
          },
          token: 'mock-token',
        },
      }),
    });

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('Adresse email');
    const passwordInput = screen.getByLabelText('Mot de passe');
    const submitButton = screen.getByRole('button', { name: 'Se connecter' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });
    });
  });

  it('should show loading state during submission', async () => {
    const user = userEvent.setup();
    
    // Mock une réponse lente
    (fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('Adresse email');
    const passwordInput = screen.getByLabelText('Mot de passe');
    const submitButton = screen.getByRole('button', { name: 'Se connecter' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    expect(screen.getByText('Connexion en cours...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('should toggle password visibility', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const passwordInput = screen.getByLabelText('Mot de passe') as HTMLInputElement;
    const toggleButton = screen.getByRole('button', { name: '' }); // Le bouton toggle n'a pas de nom

    expect(passwordInput.type).toBe('password');

    await user.click(toggleButton);
    expect(passwordInput.type).toBe('text');

    await user.click(toggleButton);
    expect(passwordInput.type).toBe('password');
  });

  it('should handle remember me checkbox', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const rememberMeCheckbox = screen.getByLabelText('Se souvenir de moi') as HTMLInputElement;

    expect(rememberMeCheckbox.checked).toBe(false);

    await user.click(rememberMeCheckbox);
    expect(rememberMeCheckbox.checked).toBe(true);

    await user.click(rememberMeCheckbox);
    expect(rememberMeCheckbox.checked).toBe(false);
  });

  it('should call onSwitchToRegister when register link is clicked', async () => {
    const user = userEvent.setup();
    const onSwitchToRegister = jest.fn();
    
    render(
      <TestWrapper>
        <LoginForm onSwitchToRegister={onSwitchToRegister} />
      </TestWrapper>
    );

    const registerLink = screen.getByText('Créer un compte');
    await user.click(registerLink);

    expect(onSwitchToRegister).toHaveBeenCalledTimes(1);
  });

  it('should call onForgotPassword when forgot password link is clicked', async () => {
    const user = userEvent.setup();
    const onForgotPassword = jest.fn();
    
    render(
      <TestWrapper>
        <LoginForm onForgotPassword={onForgotPassword} />
      </TestWrapper>
    );

    const forgotPasswordLink = screen.getByText('Mot de passe oublié ?');
    await user.click(forgotPasswordLink);

    expect(onForgotPassword).toHaveBeenCalledTimes(1);
  });

  it('should display server error message', async () => {
    const user = userEvent.setup();
    
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
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('Adresse email');
    const passwordInput = screen.getByLabelText('Mot de passe');
    const submitButton = screen.getByRole('button', { name: 'Se connecter' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email ou mot de passe incorrect')).toBeInTheDocument();
    });
  });

  it('should clear field errors when user starts typing', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('Adresse email');
    const submitButton = screen.getByRole('button', { name: 'Se connecter' });

    // Déclencher une erreur de validation
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('L\'adresse email est obligatoire')).toBeInTheDocument();
    });

    // Commencer à taper dans le champ email
    await user.type(emailInput, 'test');

    // L'erreur devrait disparaître
    expect(screen.queryByText('L\'adresse email est obligatoire')).not.toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(
      <TestWrapper>
        <LoginForm />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('Adresse email');
    const passwordInput = screen.getByLabelText('Mot de passe');
    const submitButton = screen.getByRole('button', { name: 'Se connecter' });

    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('autoComplete', 'email');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
    expect(submitButton).toHaveAttribute('type', 'submit');
  });
});