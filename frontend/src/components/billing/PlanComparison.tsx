import { Check, X } from 'lucide-react';
import type { Plan } from './PlanCard';
import { cn } from '../../utils/cn';

interface PlanComparisonProps {
  plans: Plan[];
}

interface ComparisonRow {
  category: string;
  features: {
    label: string;
    getValue: (plan: Plan) => string | boolean | number;
  }[];
}

export function PlanComparison({ plans }: PlanComparisonProps) {
  const comparisonData: ComparisonRow[] = [
    {
      category: 'Limites mensuelles',
      features: [
        {
          label: 'Factures par mois',
          getValue: (p) => p.maxInvoicesPerMonth === -1 ? 'Illimité' : p.maxInvoicesPerMonth,
        },
        {
          label: 'Clients total',
          getValue: (p) => p.maxClientsTotal === -1 ? 'Illimité' : p.maxClientsTotal,
        },
        {
          label: 'Produits total',
          getValue: (p) => p.maxProductsTotal === -1 ? 'Illimité' : p.maxProductsTotal,
        },
        {
          label: 'Espace de stockage',
          getValue: (p) => p.storageLimit === -1 ? 'Illimité' : `${p.storageLimit} MB`,
        },
      ],
    },
    {
      category: 'Modules principaux',
      features: [
        { label: 'Facturation électronique', getValue: (p) => p.hasInvoices },
        { label: 'QR-facture suisse', getValue: (p) => p.hasSwissQRBill },
        { label: 'Gestion des devis', getValue: (p) => p.hasQuotes },
        { label: 'Suivi des charges', getValue: (p) => p.hasExpenses },
      ],
    },
    {
      category: 'Fonctionnalités avancées',
      features: [
        { label: 'Rapports avancés', getValue: (p) => p.hasAdvancedReports },
        { label: 'Assistant IA', getValue: (p) => p.hasAIAssistant },
        { label: 'Accès API', getValue: (p) => p.hasApiAccess },
        { label: 'Branding personnalisé', getValue: (p) => p.hasCustomBranding },
      ],
    },
    {
      category: 'Multi-utilisateurs (à venir)',
      features: [
        { label: 'Multi-utilisateur', getValue: (p) => p.hasMultiUser },
        {
          label: 'Nombre d\'utilisateurs',
          getValue: (p) => p.maxUsers === -1 ? 'Illimité' : p.maxUsers,
        },
        { label: 'Multi-entreprise', getValue: (p) => p.hasMultiCompany },
        {
          label: 'Nombre d\'entreprises',
          getValue: (p) => p.maxCompanies === -1 ? 'Illimité' : p.maxCompanies,
        },
      ],
    },
    {
      category: 'Support',
      features: [
        { label: 'Support email', getValue: (p) => p.hasEmailSupport },
        { label: 'Support prioritaire', getValue: (p) => p.hasPrioritySupport },
      ],
    },
    {
      category: 'Fonctionnalités suisses',
      features: [
        { label: 'Multi-devises (CHF/EUR)', getValue: (p) => p.hasMultiCurrency },
        { label: 'Multi-langues', getValue: (p) => p.hasMultiLanguage },
      ],
    },
  ];

  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden rounded-lg border border-gray-200 shadow-lg">
          <table className="min-w-full divide-y divide-gray-200">
            {/* Header */}
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 bg-gray-50 px-6 py-4 text-left text-sm font-semibold text-gray-900"
                >
                  Fonctionnalités
                </th>
                {plans.map((plan) => (
                  <th
                    key={plan.id}
                    scope="col"
                    className="px-6 py-4 text-center"
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-bold text-gray-900">
                        {plan.displayName}
                      </span>
                      <span className="text-2xl font-bold text-indigo-600 mt-2">
                        {plan.price === 0 ? 'Gratuit' : `${plan.price} ${plan.currency}`}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-xs text-gray-500">/mois</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-gray-200 bg-white">
              {comparisonData.map((category, categoryIdx) => (
                <>
                  {/* Category Header */}
                  <tr key={`category-${categoryIdx}`} className="bg-gray-50">
                    <td
                      colSpan={plans.length + 1}
                      className="px-6 py-3 text-sm font-semibold text-gray-900"
                    >
                      {category.category}
                    </td>
                  </tr>

                  {/* Category Features */}
                  {category.features.map((feature, featureIdx) => (
                    <tr
                      key={`feature-${categoryIdx}-${featureIdx}`}
                      className={cn(
                        featureIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      )}
                    >
                      <td className="sticky left-0 z-10 bg-inherit px-6 py-4 text-sm text-gray-700">
                        {feature.label}
                      </td>
                      {plans.map((plan) => {
                        const value = feature.getValue(plan);
                        return (
                          <td
                            key={plan.id}
                            className="px-6 py-4 text-center"
                          >
                            {renderValue(value)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function renderValue(value: string | boolean | number) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="w-6 h-6 text-green-600 mx-auto" />
    ) : (
      <X className="w-6 h-6 text-gray-300 mx-auto" />
    );
  }

  return (
    <span className="text-sm font-medium text-gray-900">
      {value}
    </span>
  );
}
