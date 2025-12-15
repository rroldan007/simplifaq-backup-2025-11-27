import React, { useEffect } from 'react';
import { SimpleLoginForm } from '../../components/auth/SimpleLoginForm';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  // If already logged in, redirect away from /login
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSwitchToRegister = () => {
    navigate('/register');
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  // Optionally avoid flicker while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div style={{ color: 'var(--color-text-secondary)' }}>Chargement...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8"
      style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img
              src="/brand/app-icon.png"
              alt="SimpliFaq Logo"
              className="h-16 w-16 rounded-xl shadow-lg"
            />
          </div>
          <h1 className="text-3xl font-bold text-blue-600 mb-2">
            SimpliFaq
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Simplifiez votre facturation suisse
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <SimpleLoginForm
            onSwitchToRegister={handleSwitchToRegister}
            onForgotPassword={handleForgotPassword}
          />
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          © 2024 SimpliFaq. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}