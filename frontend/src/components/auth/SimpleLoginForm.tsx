import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SimpleInput, SimplePasswordInput } from '../ui/SimpleInput';
import { useAuth } from '../../hooks/useAuth';

interface SimpleLoginFormProps {
  onSwitchToRegister?: () => void;
  onForgotPassword?: () => void;
}

export function SimpleLoginForm({
  onSwitchToRegister,
  onForgotPassword,
}: SimpleLoginFormProps) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.email.trim()) {
      newErrors.email = 'L\'adresse email est obligatoire';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Veuillez saisir une adresse email valide';
    }

    if (!formData.password) {
      newErrors.password = 'Le mot de passe est obligatoire';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // Delegate to AuthContext to ensure consistent API base + secureStorage
      await login({
        email: formData.email.trim(),
        password: formData.password,
      });

      // Redirect to dashboard on success
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ 
        general: error instanceof Error ? error.message : 'Erreur de connexion' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-primary mb-2">
          Connexion
        </h1>
        <p className="text-secondary">
          Connectez-vous à votre compte Simplifaq
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General error message */}
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">
                  {errors.general}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Email field */}
        <SimpleInput
          type="email"
          label="Adresse email"
          placeholder="votre@email.com"
          value={formData.email}
          onChange={handleInputChange('email')}
          error={errors.email}
          leftIcon={<span>📧</span>}
          fullWidth
          autoComplete="email"
          autoFocus
        />

        {/* Password field */}
        <SimplePasswordInput
          label="Mot de passe"
          placeholder="Votre mot de passe"
          value={formData.password}
          onChange={handleInputChange('password')}
          error={errors.password}
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
          leftIcon={<span>🔒</span>}
          fullWidth
          autoComplete="current-password"
        />

        {/* Options */}
        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.rememberMe}
              onChange={handleInputChange('rememberMe')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-primary rounded"
            />
            <span className="ml-2 text-sm text-secondary">
              Se souvenir de moi
            </span>
          </label>

          {onForgotPassword && (
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
            >
              Mot de passe oublié ?
            </button>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`
            w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
            ${isLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }
          `}
        >
          {isLoading ? 'Connexion en cours...' : 'Se connecter'}
        </button>

        {/* Switch to register */}
        {onSwitchToRegister && (
          <div className="text-center">
            <p className="text-sm text-secondary">
              Vous n'avez pas encore de compte ?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="text-blue-600 hover:text-blue-500 focus:outline-none focus:underline font-medium"
              >
                Créer un compte
              </button>
            </p>
          </div>
        )}
      </form>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-secondary">
          En vous connectant, vous acceptez nos{' '}
          <a href="/terms" className="text-blue-600 hover:text-blue-500">
            conditions d'utilisation
          </a>{' '}
          et notre{' '}
          <a href="/privacy" className="text-blue-600 hover:text-blue-500">
            politique de confidentialité
          </a>
          .
        </p>
      </div>
    </div>
  );
}