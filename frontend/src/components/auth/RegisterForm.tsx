import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Input, PasswordInput } from '../ui/Input';
import { PrimaryButton } from '../ui/Button';
import {
  isValidEmail,
  isValidSwissVAT,
  isValidSwissPostalCode,
  isValidSwissCanton,
  isValidSwissPhoneNumber,
  formatSwissPhoneNumber,
  validatePassword,
  SWISS_CANTONS,
} from '../../utils/auth';
import { cn } from '../../utils/cn';
import { WelcomeModal } from './WelcomeModal';

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
  className?: string;
}

interface RegisterFormData {
  // Informations personnelles
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;

  // Informations de l'entreprise
  companyName: string;
  vatNumber: string;

  // Adresse
  street: string;
  postalCode: string;
  city: string;
  canton: string;
  country: string;

  // Informations de contact
  phone: string;
  website: string;

  // Acceptation des conditions
  acceptTerms: boolean;

  // Newsletter (optionnel)
  subscribeNewsletter: boolean;
}

type FormFieldKeys = keyof RegisterFormData | 'general';
type FormErrors = Partial<Record<FormFieldKeys, string>>;

const initialFormData: RegisterFormData = {
  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
  companyName: '',
  vatNumber: '',
  street: '',
  postalCode: '',
  city: '',
  canton: '',
  country: 'Suisse',
  phone: '',
  website: '',
  acceptTerms: false,
  subscribeNewsletter: false,
};

export function RegisterForm({
  onSwitchToLogin,
  className,
}: RegisterFormProps) {
  const { register, error: authError, isLoading } = useAuth();
  const [formData, setFormData] = useState<RegisterFormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Validation du formulaire
  const validateForm = (step?: number): boolean => {
    const newErrors: FormErrors = {};
    const stepToValidate = step || currentStep;

    if (stepToValidate === 1) {
      // Étape 1: Informations personnelles
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'Le prénom est obligatoire';
      }

      if (!formData.lastName.trim()) {
        newErrors.lastName = 'Le nom est obligatoire';
      }

      if (!formData.email.trim()) {
        newErrors.email = 'L\'adresse email est obligatoire';
      } else if (!isValidEmail(formData.email)) {
        newErrors.email = 'Veuillez saisir une adresse email valide';
      }

      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.errors[0];
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
      }
    }

    if (stepToValidate === 2) {
      // Étape 2: Informations de l'entreprise
      if (!formData.companyName.trim()) {
        newErrors.companyName = 'Le nom de l\'entreprise est obligatoire';
      }

      if (formData.vatNumber && !isValidSwissVAT(formData.vatNumber)) {
        newErrors.vatNumber = 'Numéro de TVA invalide (format: CHE-123.456.789)';
      }
    }

    if (stepToValidate === 3) {
      // Étape 3: Adresse
      if (!formData.street.trim()) {
        newErrors.street = 'L\'adresse est obligatoire';
      }

      if (!formData.postalCode.trim()) {
        newErrors.postalCode = 'Le code postal est obligatoire';
      } else if (!isValidSwissPostalCode(formData.postalCode)) {
        newErrors.postalCode = 'Code postal invalide (4 chiffres requis)';
      }

      if (!formData.city.trim()) {
        newErrors.city = 'La ville est obligatoire';
      }

      if (!formData.canton) {
        newErrors.canton = 'Le canton est obligatoire';
      } else if (!isValidSwissCanton(formData.canton)) {
        newErrors.canton = 'Canton invalide';
      }

      if (formData.phone && !isValidSwissPhoneNumber(formData.phone)) {
        newErrors.phone = 'Numéro de téléphone invalide';
      }

      if (formData.website && !isValidUrl(formData.website)) {
        newErrors.website = 'URL invalide';
      }

      if (!formData.acceptTerms) {
        newErrors.acceptTerms = 'Vous devez accepter les conditions d\'utilisation';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validation d'URL simple
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  // Gestion de la soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await register({
        email: formData.email.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        companyName: formData.companyName.trim(),
        vatNumber: formData.vatNumber.trim() || undefined,
        street: formData.street.trim(),
        postalCode: formData.postalCode.trim(),
        city: formData.city.trim(),
        canton: formData.canton,
        country: formData.country,
        phone: formData.phone ? formatSwissPhoneNumber(formData.phone) : undefined,
        website: formData.website.trim() || undefined,
        subscribeNewsletter: formData.subscribeNewsletter,
      });

      // Si el registro requiere confirmación de email, mostrar mensaje específico
      // El AuthContext se encargará de la redirección apropiada
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
      // El error ya se maneja en el contexto de autenticación
    }
  };

  // Gestion des changements de champs
  const handleInputChange = (field: keyof RegisterFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));

    // Effacer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Navigation entre les étapes
  const nextStep = () => {
    if (validateForm(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  return (
    <div className={cn('w-full max-w-2xl mx-auto', className)}>
      {/* En-tête */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-primary mb-2">
          Créer un compte
        </h1>
        <p className="text-secondary">
          Rejoignez SimpliFaq et simplifiez votre facturation
        </p>
      </div>

      {/* Indicateur d'étapes */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-full overflow-x-auto">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center flex-shrink-0">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0',
                  step <= currentStep
                    ? 'bg-blue-600 text-white'
                    : 'surface-elevated text-secondary'
                )}
              >
                {step}
              </div>
              <div className="ml-2 text-xs sm:text-sm whitespace-nowrap">
                <span className="hidden sm:inline">
                  {step === 1 && 'Informations personnelles'}
                  {step === 2 && 'Entreprise'}
                  {step === 3 && 'Adresse et finalisation'}
                </span>
                <span className="sm:hidden">
                  {step === 1 && 'Personnel'}
                  {step === 2 && 'Entreprise'}
                  {step === 3 && 'Finalisation'}
                </span>
              </div>
              {step < 3 && (
                <div
                  className={cn(
                    'h-0.5 mx-2 sm:mx-4 w-8 sm:w-16',
                    step < currentStep ? 'bg-blue-600' : 'surface-elevated'
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Message d'erreur général */}
        {authError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{authError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Étape 1: Informations personnelles */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Prénom"
                placeholder="Jean"
                value={formData.firstName}
                onChange={handleInputChange('firstName')}
                error={errors.firstName}
                fullWidth
                autoComplete="given-name"
                autoFocus
              />
              <Input
                label="Nom"
                placeholder="Dupont"
                value={formData.lastName}
                onChange={handleInputChange('lastName')}
                error={errors.lastName}
                fullWidth
                autoComplete="family-name"
              />
            </div>

            <Input
              type="email"
              label="Adresse email"
              placeholder="jean.dupont@entreprise.ch"
              value={formData.email}
              onChange={handleInputChange('email')}
              error={errors.email}
              leftIcon={<MailIcon className="w-4 h-4" />}
              fullWidth
              autoComplete="email"
            />

            <PasswordInput
              label="Mot de passe"
              placeholder="Choisissez un mot de passe sécurisé"
              value={formData.password}
              onChange={handleInputChange('password')}
              error={errors.password}
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              leftIcon={<LockIcon className="w-4 h-4" />}
              fullWidth
              autoComplete="new-password"
              helperText="Au moins 8 caractères avec majuscule, minuscule, chiffre et caractère spécial"
            />

            <PasswordInput
              label="Confirmer le mot de passe"
              placeholder="Confirmez votre mot de passe"
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              error={errors.confirmPassword}
              showPassword={showConfirmPassword}
              onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
              leftIcon={<LockIcon className="w-4 h-4" />}
              fullWidth
              autoComplete="new-password"
            />
          </div>
        )}

        {/* Étape 2: Informations de l'entreprise */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <Input
              label="Nom de l'entreprise"
              placeholder="SimpliFaq SA"
              value={formData.companyName}
              onChange={handleInputChange('companyName')}
              error={errors.companyName}
              leftIcon={<BuildingIcon className="w-4 h-4" />}
              fullWidth
              autoComplete="organization"
            />

            <Input
              label="Numéro de TVA (optionnel)"
              placeholder="CHE-123.456.789"
              value={formData.vatNumber}
              onChange={handleInputChange('vatNumber')}
              error={errors.vatNumber}
              leftIcon={<DocumentIcon className="w-4 h-4" />}
              fullWidth
              helperText="Format: CHE-123.456.789 (optionnel)"
            />
          </div>
        )}

        {/* Étape 3: Adresse et finalisation */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <Input
              label="Adresse"
              placeholder="123 Avenue de la Gare"
              value={formData.street}
              onChange={handleInputChange('street')}
              error={errors.street}
              leftIcon={<LocationIcon className="w-4 h-4" />}
              fullWidth
              autoComplete="street-address"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Code postal"
                placeholder="1000"
                value={formData.postalCode}
                onChange={handleInputChange('postalCode')}
                error={errors.postalCode}
                fullWidth
                autoComplete="postal-code"
              />
              <Input
                label="Ville"
                placeholder="Lausanne"
                value={formData.city}
                onChange={handleInputChange('city')}
                error={errors.city}
                fullWidth
                autoComplete="address-level2"
              />
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Canton
                </label>
                <select
                  value={formData.canton}
                  onChange={handleInputChange('canton')}
                  className={cn(
                    'block w-full rounded-md border shadow-sm px-3 py-2 text-sm input-theme',
                    'focus:outline-none focus:ring-1',
                    errors.canton
                      ? 'focus:border-red-500 focus:ring-red-500'
                      : 'focus:border-blue-500 focus:ring-blue-500'
                  )}
                >
                  <option value="">Sélectionner</option>
                  {SWISS_CANTONS.map((canton) => (
                    <option key={canton.code} value={canton.code}>
                      {canton.name} ({canton.code})
                    </option>
                  ))}
                </select>
                {errors.canton && (
                  <p className="mt-1 text-xs text-red-600">{errors.canton}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="tel"
                label="Téléphone (optionnel)"
                placeholder="+41 21 123 45 67"
                value={formData.phone}
                onChange={handleInputChange('phone')}
                error={errors.phone}
                leftIcon={<PhoneIcon className="w-4 h-4" />}
                fullWidth
                autoComplete="tel"
              />
              <Input
                type="url"
                label="Site web (optionnel)"
                placeholder="www.entreprise.ch"
                value={formData.website}
                onChange={handleInputChange('website')}
                error={errors.website}
                leftIcon={<GlobeIcon className="w-4 h-4" />}
                fullWidth
                autoComplete="url"
              />
            </div>

            {/* Acceptation des conditions */}
            <div className="flex items-start">
              <input
                type="checkbox"
                checked={formData.acceptTerms}
                onChange={handleInputChange('acceptTerms')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-primary rounded mt-1"
              />
              <div className="ml-3">
                <label className="text-sm text-secondary">
                  J'accepte les{' '}
                  <a href="/terms" className="text-blue-600 hover:text-blue-500">
                    conditions d'utilisation
                  </a>{' '}
                  et la{' '}
                  <a href="/privacy" className="text-blue-600 hover:text-blue-500">
                    politique de confidentialité
                  </a>
                </label>
                {errors.acceptTerms && (
                  <p className="mt-1 text-xs text-red-600">{errors.acceptTerms}</p>
                )}
              </div>
            </div>

            {/* Newsletter (optionnel) */}
            <div className="flex items-start">
              <input
                type="checkbox"
                checked={formData.subscribeNewsletter}
                onChange={handleInputChange('subscribeNewsletter')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-primary rounded mt-1"
              />
              <div className="ml-3">
                <label className="text-sm text-secondary">
                  Je souhaite recevoir la newsletter avec des conseils, astuces et actualités sur la facturation{' '}
                  <span className="text-xs text-gray-500">(optionnel)</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Boutons de navigation */}
        <div className="flex justify-between pt-6">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="px-4 py-2 text-sm font-medium text-secondary border border-primary rounded-md hover:bg-[var(--color-bg-secondary)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Précédent
            </button>
          )}

          <div className="ml-auto">
            {currentStep < 3 ? (
              <PrimaryButton
                type="button"
                onClick={nextStep}
                size="lg"
              >
                Suivant
              </PrimaryButton>
            ) : (
              <PrimaryButton
                type="submit"
                isLoading={isLoading}
                size="lg"
              >
                {isLoading ? 'Création du compte...' : 'Créer mon compte'}
              </PrimaryButton>
            )}
          </div>
        </div>

        {/* Lien vers la connexion */}
        {onSwitchToLogin && (
          <div className="text-center pt-4">
            <p className="text-sm text-secondary">
              Vous avez déjà un compte ?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-blue-600 hover:text-blue-500 focus:outline-none focus:underline font-medium"
              >
                Se connecter
              </button>
            </p>
          </div>
        )}
      </form>

      {/* Modal de bienvenida */}
      {showWelcomeModal && (
        <WelcomeModal
          firstName={formData.firstName}
          companyName={formData.companyName}
          onClose={() => setShowWelcomeModal(false)}
        />
      )}
    </div>
  );
}

// Icônes
function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function LocationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function ExclamationCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}