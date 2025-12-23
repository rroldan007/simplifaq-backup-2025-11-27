import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { FloatingLabelInput } from '../ui/FloatingLabelInput';
import { SwissAddressAutocomplete } from './SwissAddressAutocomplete';

interface ClientFormData {
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    canton?: string;
  };
  vatNumber?: string;
  language: 'de' | 'fr' | 'it' | 'en';
  paymentTerms: number;
  notes?: string;
  isActive: boolean;
}

interface ClientFormProps {
  initialData?: Partial<ClientFormData>;
  onSubmit: (data: ClientFormData) => void;
  onCancel?: () => void;
  loading?: boolean;
  mode?: 'create' | 'edit';
}

export function ClientForm({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  mode = 'create'
}: ClientFormProps) {
  const [formData, setFormData] = useState<ClientFormData>({
    companyName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      postalCode: '',
      country: 'Suisse',
      canton: ''
    },
    vatNumber: '',
    language: 'fr',
    paymentTerms: 30,
    notes: '',
    isActive: true,
    ...initialData
  });

  const [clientType, setClientType] = useState<'company' | 'individual'>(
    initialData?.companyName || formData.companyName ? 'company' : 'individual'
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  // City suggestions from postal code (Swiss)
  type CityOption = { city: string; canton?: string };
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [isFetchingCityOptions, setIsFetchingCityOptions] = useState(false);

  // Fetch Swiss cities for a postal code using Zippopotam.us (public, no key)
  const fetchCitiesForPostalCode = async (postalCode: string) => {
    if (!/^\d{4}$/.test(postalCode) || formData.address.country !== 'Suisse') {
      setCityOptions([]);
      return;
    }
    try {
      setIsFetchingCityOptions(true);
      const res = await fetch(`https://api.zippopotam.us/CH/${postalCode}`);
      if (!res.ok) {
        setCityOptions([]);
        return;
      }
      const data = await res.json() as { places?: Array<{
        [key: string]: string;
        "place name": string;
        "state abbreviation": string;
      }>};
      const options: CityOption[] = (data.places || []).map((p) => ({
        city: p["place name"],
        canton: p["state abbreviation"],
      }));
      setCityOptions(options);
    } catch {
      setCityOptions([]);
    } finally {
      setIsFetchingCityOptions(false);
    }
  };

  // Swiss cantons
  const SWISS_CANTONS = [
    { value: '', label: 'Sélectionner un canton' },
    { value: 'AG', label: 'Argovie (AG)' },
    { value: 'AI', label: 'Appenzell Rhodes-Intérieures (AI)' },
    { value: 'AR', label: 'Appenzell Rhodes-Extérieures (AR)' },
    { value: 'BE', label: 'Berne (BE)' },
    { value: 'BL', label: 'Bâle-Campagne (BL)' },
    { value: 'BS', label: 'Bâle-Ville (BS)' },
    { value: 'FR', label: 'Fribourg (FR)' },
    { value: 'GE', label: 'Genève (GE)' },
    { value: 'GL', label: 'Glaris (GL)' },
    { value: 'GR', label: 'Grisons (GR)' },
    { value: 'JU', label: 'Jura (JU)' },
    { value: 'LU', label: 'Lucerne (LU)' },
    { value: 'NE', label: 'Neuchâtel (NE)' },
    { value: 'NW', label: 'Nidwald (NW)' },
    { value: 'OW', label: 'Obwald (OW)' },
    { value: 'SG', label: 'Saint-Gall (SG)' },
    { value: 'SH', label: 'Schaffhouse (SH)' },
    { value: 'SO', label: 'Soleure (SO)' },
    { value: 'SZ', label: 'Schwyz (SZ)' },
    { value: 'TG', label: 'Thurgovie (TG)' },
    { value: 'TI', label: 'Tessin (TI)' },
    { value: 'UR', label: 'Uri (UR)' },
    { value: 'VD', label: 'Vaud (VD)' },
    { value: 'VS', label: 'Valais (VS)' },
    { value: 'ZG', label: 'Zoug (ZG)' },
    { value: 'ZH', label: 'Zurich (ZH)' }
  ];

  type AddressField = keyof ClientFormData['address'];
  type FlatField = keyof ClientFormData;
  const updateFormData = (
    field: FlatField | `address.${AddressField}`,
    value: unknown
  ) => {
    if (typeof field === 'string' && field.startsWith('address.')) {
      const child = field.split('.')[1] as AddressField;
      const v = String(value);
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [child]: v,
        },
      }));
    } else {
      const key = field as FlatField;
      setFormData(prev => {
        switch (key) {
          case 'paymentTerms':
            return { ...prev, paymentTerms: typeof value === 'number' ? value : parseInt(String(value), 10) || 0 };
          case 'isActive':
            return { ...prev, isActive: Boolean(value) };
          case 'language':
            return { ...prev, language: String(value) as ClientFormData['language'] };
          default:
            return { ...prev, [key]: String(value) } as ClientFormData;
        }
      });
    }
    
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Client type validation
    if (clientType === 'company') {
      if (!formData.companyName?.trim()) {
        newErrors.companyName = 'Le nom de l\'entreprise est requis';
      }
      // Clear individual fields for company
      formData.firstName = '';
      formData.lastName = '';
    } else {
      if (!formData.firstName?.trim()) {
        newErrors.firstName = 'Le prénom est requis';
      }
      if (!formData.lastName?.trim()) {
        newErrors.lastName = 'Le nom est requis';
      }
      // Clear company fields for individual
      formData.companyName = '';
      formData.vatNumber = '';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    // Address validation
    if (!formData.address.street.trim()) {
      newErrors['address.street'] = 'La rue est requise';
    }
    if (!formData.address.city.trim()) {
      newErrors['address.city'] = 'La ville est requise';
    }
    if (!formData.address.postalCode.trim()) {
      newErrors['address.postalCode'] = 'Le code postal est requis';
    } else if (formData.address.country === 'Suisse' && !/^\d{4}$/.test(formData.address.postalCode.trim())) {
      newErrors['address.postalCode'] = 'Code postal suisse invalide (4 chiffres)';
    }

    // VAT number validation for companies
    if (clientType === 'company' && formData.vatNumber && formData.vatNumber.trim()) {
      if (!/^CHE-\d{3}\.\d{3}\.\d{3}$/.test(formData.vatNumber)) {
        newErrors.vatNumber = 'Format de numéro TVA suisse invalide (CHE-XXX.XXX.XXX)';
      }
    }

    // Payment terms validation
    if (formData.paymentTerms < 0 || formData.paymentTerms > 365) {
      newErrors.paymentTerms = 'Les conditions de paiement doivent être entre 0 et 365 jours';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Flatten the address object for backward compatibility
      const formDataToSubmit = {
        ...formData,
        street: formData.address.street,
        city: formData.address.city,
        postalCode: formData.address.postalCode,
        country: formData.address.country,
        canton: formData.address.canton
      };
      onSubmit(formDataToSubmit);
    }
  };

  const handleClientTypeChange = (type: 'company' | 'individual') => {
    setClientType(type);
    // Clear type-specific errors
    const newErrors = { ...errors };
    if (type === 'company') {
      delete newErrors.firstName;
      delete newErrors.lastName;
    } else {
      delete newErrors.companyName;
      delete newErrors.vatNumber;
    }
    setErrors(newErrors);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            {mode === 'create' ? 'Nouveau client' : 'Modifier le client'}
          </h1>
          <p className="mt-1 text-[var(--color-text-secondary)]">
            {mode === 'create' 
              ? 'Ajoutez un nouveau client à votre base de données'
              : 'Modifiez les informations de votre client'
            }
          </p>
        </div>
        
        <div className="flex space-x-3">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Annuler
            </Button>
          )}
          <Button type="submit" variant="primary" isLoading={loading}>
            <span className="mr-2">💾</span>
            {mode === 'create' ? 'Créer le client' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Type Selection */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
              Type de client
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleClientTypeChange('company')}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  clientType === 'company'
                    ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)]'
                    : 'border-[var(--color-border-primary)] hover:border-[var(--color-border-hover)]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🏢</span>
                  <div>
                    <h3 className="font-medium text-[var(--color-text-primary)]">Entreprise</h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">Société, SARL, SA, etc.</p>
                  </div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => handleClientTypeChange('individual')}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  clientType === 'individual'
                    ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)]'
                    : 'border-[var(--color-border-primary)] hover:border-[var(--color-border-hover)]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">👤</span>
                  <div>
                    <h3 className="font-medium text-[var(--color-text-primary)]">Particulier</h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">Personne physique</p>
                  </div>
                </div>
              </button>
            </div>
          </Card>

          {/* Client Information */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
              Informations {clientType === 'company' ? 'de l\'entreprise' : 'personnelles'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clientType === 'company' ? (
                <div className="md:col-span-2">
                  <FloatingLabelInput
                    label="Nom de l'entreprise *"
                    value={formData.companyName || ''}
                    onChange={(e) => updateFormData('companyName', e.target.value)}
                    error={errors.companyName}
                  />
                </div>
              ) : (
                <>
                  <FloatingLabelInput
                    label="Prénom *"
                    value={formData.firstName || ''}
                    onChange={(e) => updateFormData('firstName', e.target.value)}
                    error={errors.firstName}
                  />
                  <FloatingLabelInput
                    label="Nom *"
                    value={formData.lastName || ''}
                    onChange={(e) => updateFormData('lastName', e.target.value)}
                    error={errors.lastName}
                  />
                </>
              )}
              
              <FloatingLabelInput
                label="Email *"
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                error={errors.email}
              />
              
              <FloatingLabelInput
                label="Téléphone"
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => updateFormData('phone', e.target.value)}
              />
              
              {clientType === 'company' && (
                <div className="md:col-span-2">
                  <FloatingLabelInput
                    label="Numéro TVA"
                    value={formData.vatNumber || ''}
                    onChange={(e) => updateFormData('vatNumber', e.target.value)}
                    error={errors.vatNumber}
                  />
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                    Format: CHE-XXX.XXX.XXX (optionnel)
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Address */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
              Adresse
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <SwissAddressAutocomplete
                  label="Rue et numéro *"
                  value={formData.address.street}
                  error={errors['address.street']}
                  onChange={(v) => updateFormData('address.street', v)}
                  onAddressSelected={(addr) => {
                    if (addr.street) updateFormData('address.street', addr.street);
                    if (addr.city) updateFormData('address.city', addr.city);
                    if (addr.postalCode) updateFormData('address.postalCode', addr.postalCode);
                    if (addr.canton) updateFormData('address.canton', addr.canton);
                  }}
                  floatingLabel
                />
              </div>
              
              <FloatingLabelInput
                label="Code postal *"
                value={formData.address.postalCode}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                  updateFormData('address.postalCode', v);
                  fetchCitiesForPostalCode(v);
                }}
                error={errors['address.postalCode']}
              />
              
              <div>
                <FloatingLabelInput
                  label="Ville *"
                  list="cityOptions"
                  value={formData.address.city}
                  onChange={(e) => {
                    const city = e.target.value;
                    updateFormData('address.city', city);
                    // If selected matches an option, auto-fill canton
                    const match = cityOptions.find(o => o.city.toLowerCase() === city.toLowerCase());
                    if (match?.canton) updateFormData('address.canton', match.canton);
                  }}
                  error={errors['address.city']}
                />
                {/* datalist for city suggestions */}
                {formData.address.country === 'Suisse' && (
                  <datalist id="cityOptions">
                    {cityOptions.map((opt, idx) => (
                      <option key={`${opt.city}-${idx}`} value={opt.city}>{opt.canton ? `(${opt.canton})` : ''}</option>
                    ))}
                  </datalist>
                )}
                {isFetchingCityOptions && (
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Recherche des villes…</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Canton
                </label>
                <select
                  value={formData.address.canton || ''}
                  onChange={(e) => updateFormData('address.canton', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border-[var(--color-border-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-transparent"
                >
                  {SWISS_CANTONS.map((canton) => (
                    <option key={canton.value} value={canton.value}>
                      {canton.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Pays
                </label>
                <select
                  value={formData.address.country}
                  onChange={(e) => updateFormData('address.country', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border-[var(--color-border-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-transparent"
                >
                  <option value="Suisse">Suisse</option>
                  <option value="France">France</option>
                  <option value="Allemagne">Allemagne</option>
                  <option value="Italie">Italie</option>
                  <option value="Autriche">Autriche</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Additional Settings */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
              Paramètres supplémentaires
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Langue de facturation
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => updateFormData('language', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border-[var(--color-border-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-transparent"
                >
                  <option value="fr">Français</option>
                  <option value="de">Allemand</option>
                  <option value="it">Italien</option>
                  <option value="en">Anglais</option>
                </select>
              </div>
              
              <FloatingLabelInput
                label="Conditions de paiement (jours)"
                type="number"
                min={0}
                max={365}
                value={formData.paymentTerms}
                onChange={(e) => updateFormData('paymentTerms', parseInt(e.target.value) || 0)}
                error={errors.paymentTerms}
              />
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                Notes (optionnel)
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => updateFormData('notes', e.target.value)}
                placeholder="Notes internes sur le client..."
                rows={3}
                className="w-full px-3 py-2 border rounded-md bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border-[var(--color-border-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-transparent"
              />
            </div>
          </Card>
        </div>

        {/* Summary sidebar */}
        <div className="space-y-6">
          <Card className="p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
              Résumé
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">Type :</span>
                <span className="font-medium">
                  {clientType === 'company' ? 'Entreprise' : 'Particulier'}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">Langue :</span>
                <span className="font-medium">
                  {formData.language === 'fr' ? 'Français' : 
                   formData.language === 'de' ? 'Allemand' :
                   formData.language === 'it' ? 'Italien' : 'Anglais'}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">Paiement :</span>
                <span className="font-medium">
                  {formData.paymentTerms} jour{formData.paymentTerms > 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">Statut :</span>
                <span className="font-medium">
                  {formData.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>

            {/* Status toggle */}
            <div className="mt-6 pt-4 border-t border-[var(--color-border-primary)]">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => updateFormData('isActive', e.target.checked)}
                  className="rounded border-[var(--color-border-primary)] text-[var(--color-primary-600)] focus:ring-[var(--color-border-focus)]"
                />
                <span className="ml-2 text-sm text-[var(--color-text-secondary)]">
                  Client actif
                </span>
              </label>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                Les clients inactifs n'apparaissent pas dans les sélecteurs
              </p>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}