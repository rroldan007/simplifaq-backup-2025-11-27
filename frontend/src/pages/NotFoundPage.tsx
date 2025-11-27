import React from 'react';
import { Link } from 'react-router-dom';
import { PrimaryButton } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <div
      className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8"
      style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="text-6xl font-bold text-blue-600 mb-4">404</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Page non trouvée
          </h1>
          <p className="mb-8" style={{ color: 'var(--color-text-secondary)' }}>
            Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
          </p>
          
          <div className="space-y-4">
            <Link to="/dashboard">
              <PrimaryButton size="lg">
                Retour au tableau de bord
              </PrimaryButton>
            </Link>
            
            <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <Link to="/login" className="text-blue-600 hover:text-blue-500">
                Se connecter
              </Link>
              {' ou '}
              <Link to="/register" className="text-blue-600 hover:text-blue-500">
                créer un compte
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}