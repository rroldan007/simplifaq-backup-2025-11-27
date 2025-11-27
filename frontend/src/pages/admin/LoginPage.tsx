import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, error, requiresTwoFactor, clearError } = useAdminAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    twoFactorCode: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Clear error when component mounts or form changes
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      console.log('[AdminLogin] User already authenticated, redirecting to dashboard...');
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Redirect if already authenticated (AFTER all hooks)
  if (isAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      return;
    }

    if (requiresTwoFactor && !formData.twoFactorCode) {
      return;
    }

    try {
      await login(
        formData.email,
        formData.password,
        formData.twoFactorCode || undefined
      );
      
      // Force navigation to dashboard after successful login
      console.log('[AdminLogin] Login successful, redirecting to dashboard...');
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      console.error('[AdminLogin] Login failed:', err);
      // Error is handled by the context
    }
  };

  const isFormValid = formData.email && formData.password && 
    (!requiresTwoFactor || formData.twoFactorCode);

  return (
    <div
      className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8"
      style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">SF</span>
          </div>
        </div>
        
        <h2
          className="mt-6 text-center text-3xl font-bold tracking-tight"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Administration SimpliFaq
        </h2>
        <p
          className="mt-2 text-center text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Connectez-vous à votre compte administrateur
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          {/* Error Alert */}
          {error && (
            <div className="mb-6">
              <Alert variant="error" title="Erreur de connexion" dismissible onDismiss={clearError}>
                {error}
              </Alert>
            </div>
          )}

          {/* 2FA Notice */}
          {requiresTwoFactor && (
            <div className="mb-6">
              <Alert variant="info" title="Authentification à deux facteurs">
                Veuillez saisir le code de votre application d'authentification.
              </Alert>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Field */}
            {!requiresTwoFactor && (
              <>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Adresse email
                  </label>
                  <div className="mt-1">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="admin@simplifaq.ch"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Mot de passe
                  </label>
                  <div className="mt-1 relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="••••••••"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                      Se souvenir de moi
                    </label>
                  </div>

                  <div className="text-sm">
                    <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                      Mot de passe oublié ?
                    </a>
                  </div>
                </div>
              </>
            )}

            {/* 2FA Code Field */}
            {requiresTwoFactor && (
              <div>
                <label htmlFor="twoFactorCode" className="block text-sm font-medium text-gray-700">
                  Code d'authentification
                </label>
                <div className="mt-1">
                  <Input
                    id="twoFactorCode"
                    name="twoFactorCode"
                    type="text"
                    autoComplete="one-time-code"
                    required
                    value={formData.twoFactorCode}
                    onChange={handleInputChange}
                    placeholder="123456"
                    maxLength={6}
                    disabled={isLoading}
                    className="text-center text-lg tracking-widest"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Saisissez le code à 6 chiffres de votre application d'authentification.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={!isFormValid || isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size="sm" className="mr-2" />
                    Connexion en cours...
                  </div>
                ) : requiresTwoFactor ? (
                  'Vérifier le code'
                ) : (
                  'Se connecter'
                )}
              </Button>
            </div>

            {/* Back to 2FA */}
            {requiresTwoFactor && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, twoFactorCode: '' }));
                    // Reset 2FA state - this would need to be implemented in context
                  }}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  ← Retour à la connexion
                </button>
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" style={{ borderColor: 'var(--color-border-primary)' }} />
              </div>
              <div className="relative flex justify-center text-sm">
                <span
                  className="px-2"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-surface-primary) 0%, var(--color-surface-secondary) 100%)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  Système d'administration sécurisé
                </span>
              </div>
            </div>

            <div className="mt-6 text-center text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              <p>
                Accès réservé aux administrateurs autorisés.
                <br />
                Toutes les connexions sont enregistrées et surveillées.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}