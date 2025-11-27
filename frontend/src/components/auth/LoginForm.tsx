import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input, PasswordInput } from '../ui/Input';
import { PrimaryButton } from '../ui/Button';
import { isValidEmail } from '../../utils/auth';
import { cn } from '../../utils/cn';

interface LoginFormProps {
  onSwitchToRegister?: () => void;
  onForgotPassword?: () => void;
  className?: string;
}

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export function LoginForm({
  onSwitchToRegister,
  onForgotPassword,
  className,
}: LoginFormProps) {
  const { login, error: authError, isLoading } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  // Validation du formulaire
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validation de l'email
    if (!formData.email.trim()) {
      newErrors.email = 'L\'adresse email est obligatoire';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Veuillez saisir une adresse email valide';
    }

    // Validation du mot de passe
    if (!formData.password) {
      newErrors.password = 'Le mot de passe est obligatoire';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Gestion de la soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await login({
        email: formData.email.trim(),
        password: formData.password,
      });
      // Redirection après succès
      navigate('/');
    } catch (error) {
      // L'erreur est déjà gérée par le contexte d'authentification
      console.error('Erreur de connexion:', error);
    }
  };

  // Gestion des changements de champs
  const handleInputChange = (field: keyof LoginFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Effacer l'erreur du champ modifié
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className={cn('w-full max-w-md mx-auto', className)}>
      {/* En-tête */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-primary mb-2">
          Connexion
        </h1>
        <p className="text-secondary">
          Connectez-vous à votre compte Simplifaq
        </p>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Message d'erreur général */}
        {(authError || errors.general) && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">
                  {authError || errors.general}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Champ email */}
        <Input
          type="email"
          label="Adresse email"
          placeholder="votre@email.com"
          value={formData.email}
          onChange={handleInputChange('email')}
          error={errors.email}
          leftIcon={<MailIcon className="w-4 h-4" />}
          fullWidth
          autoComplete="email"
          autoFocus
        />

        {/* Champ mot de passe */}
        <PasswordInput
          label="Mot de passe"
          placeholder="Votre mot de passe"
          value={formData.password}
          onChange={handleInputChange('password')}
          error={errors.password}
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
          leftIcon={<LockIcon className="w-4 h-4" />}
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

        {/* Bouton de connexion */}
        <PrimaryButton
          type="submit"
          isLoading={isLoading}
          fullWidth
          size="lg"
        >
          {isLoading ? 'Connexion en cours...' : 'Se connecter'}
        </PrimaryButton>

        {/* Lien vers l'inscription */}
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

      {/* Informations supplémentaires */}
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

// Icônes
function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

function ExclamationCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}