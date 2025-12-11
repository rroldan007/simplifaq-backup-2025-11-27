import React from 'react';
import { RegisterForm } from '../../components/auth/RegisterForm';
import { useNavigate } from 'react-router-dom';

export function RegisterPage() {
  const navigate = useNavigate();

  const handleSwitchToLogin = () => {
    navigate('/login');
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8"
      style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">
            SimpliFaq
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Simplifiez votre facturation suisse
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <RegisterForm onSwitchToLogin={handleSwitchToLogin} />
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