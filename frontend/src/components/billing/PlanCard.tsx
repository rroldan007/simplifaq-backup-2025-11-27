import { Check, Star } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  price: number;
  currency: string;
  isActive: boolean;
  // Feature limits
  maxInvoicesPerMonth: number;
  maxClientsTotal: number;
  maxProductsTotal: number;
  storageLimit: number;
  // Core modules
  hasInvoices: boolean;
  hasQuotes: boolean;
  hasExpenses: boolean;
  // Advanced features
  hasAIAssistant: boolean;
  hasAdvancedReports: boolean;
  hasApiAccess: boolean;
  hasCustomBranding: boolean;
  // Multi features
  hasMultiUser: boolean;
  maxUsers: number;
  hasMultiCompany: boolean;
  maxCompanies: number;
  // Support
  hasEmailSupport: boolean;
  hasPrioritySupport: boolean;
  // Swiss features
  hasSwissQRBill: boolean;
  hasMultiCurrency: boolean;
  hasMultiLanguage: boolean;
}

interface PlanCardProps {
  plan: Plan;
  isCurrentPlan?: boolean;
  isPopular?: boolean;
  onSelect: (planId: string) => void;
  isLoading?: boolean;
}

export function PlanCard({ 
  plan, 
  isCurrentPlan = false, 
  isPopular = false,
  onSelect,
  isLoading = false 
}: PlanCardProps) {
  const features = getPlanFeatures(plan);
  const limits = getPlanLimits(plan);

  return (
    <div
      className={cn(
        'relative rounded-2xl p-8 transition-all duration-300 hover:shadow-2xl',
        'border-2',
        isPopular
          ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 via-white to-purple-50 shadow-xl scale-105'
          : 'border-gray-200 bg-white hover:border-indigo-300'
      )}
      style={{
        background: isPopular
          ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, white 50%, rgba(139, 92, 246, 0.05) 100%)'
          : undefined
      }}
    >
      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center shadow-lg">
            <Star className="w-4 h-4 mr-1 fill-current" />
            Populaire
          </div>
        </div>
      )}

      {/* Current Plan Badge */}
      {isCurrentPlan && (
        <div className="absolute top-4 right-4">
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
            Plan actuel
          </span>
        </div>
      )}

      {/* Plan Header */}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          {plan.displayName}
        </h3>
        {plan.description && (
          <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
        )}
        
        {/* Price */}
        <div className="flex items-baseline justify-center mb-2">
          <span className="text-5xl font-bold text-gray-900">
            {plan.price === 0 ? 'Gratuit' : plan.price}
          </span>
          {plan.price > 0 && (
            <>
              <span className="text-2xl font-semibold text-gray-600 ml-2">
                {plan.currency}
              </span>
              <span className="text-gray-500 ml-2">/mois</span>
            </>
          )}
        </div>
      </div>

      {/* Limits */}
      <div className="mb-6 space-y-2 bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 text-sm mb-3">Limites mensuelles</h4>
        {limits.map((limit, idx) => (
          <div key={idx} className="flex justify-between text-sm">
            <span className="text-gray-600">{limit.label}</span>
            <span className="font-semibold text-gray-900">{limit.value}</span>
          </div>
        ))}
      </div>

      {/* Features List */}
      <ul className="space-y-3 mb-8">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start">
            <Check className={cn(
              'w-5 h-5 mr-3 flex-shrink-0 mt-0.5',
              feature.included ? 'text-green-600' : 'text-gray-300'
            )} />
            <span className={cn(
              'text-sm',
              feature.included ? 'text-gray-700' : 'text-gray-400'
            )}>
              {feature.label}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <button
        onClick={() => onSelect(plan.id)}
        disabled={isCurrentPlan || isLoading}
        className={cn(
          'w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          isCurrentPlan
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
            : isPopular
            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl focus:ring-indigo-500'
            : 'bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-900'
        )}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Chargement...
          </span>
        ) : isCurrentPlan ? (
          'Plan actuel'
        ) : (
          'Choisir ce plan'
        )}
      </button>
    </div>
  );
}

// Helper functions
function getPlanLimits(plan: Plan): { label: string; value: string }[] {
  return [
    { 
      label: 'Factures', 
      value: plan.maxInvoicesPerMonth === -1 ? 'Illimité' : `${plan.maxInvoicesPerMonth}/mois` 
    },
    { 
      label: 'Clients', 
      value: plan.maxClientsTotal === -1 ? 'Illimité' : plan.maxClientsTotal.toString() 
    },
    { 
      label: 'Produits', 
      value: plan.maxProductsTotal === -1 ? 'Illimité' : plan.maxProductsTotal.toString() 
    },
    { 
      label: 'Stockage', 
      value: plan.storageLimit === -1 ? 'Illimité' : `${plan.storageLimit} MB` 
    },
  ];
}

function getPlanFeatures(plan: Plan): { label: string; included: boolean }[] {
  return [
    { label: '✓ Facturation électronique', included: plan.hasInvoices },
    { label: '✓ QR-facture suisse', included: plan.hasSwissQRBill },
    { label: '✓ Gestion des devis', included: plan.hasQuotes },
    { label: '✓ Suivi des charges', included: plan.hasExpenses },
    { label: '✓ Rapports avancés', included: plan.hasAdvancedReports },
    { label: '✓ Assistant IA', included: plan.hasAIAssistant },
    { label: '✓ Accès API', included: plan.hasApiAccess },
    { label: '✓ Branding personnalisé', included: plan.hasCustomBranding },
    { label: '✓ Multi-devises', included: plan.hasMultiCurrency },
    { label: '✓ Multi-langues', included: plan.hasMultiLanguage },
    { label: '✓ Support email', included: plan.hasEmailSupport },
    { label: '✓ Support prioritaire', included: plan.hasPrioritySupport },
  ];
}
