import { AlertCircle } from 'lucide-react';
import { usePlanLimits } from '../../hooks/usePlanLimits';
import { cn } from '../../utils/cn';

export function SubscriptionUsage() {
  const { usage, getUsagePercentage, subscription } = usePlanLimits();

  if (!usage || !subscription) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  const resources = [
    {
      label: 'Factures ce mois',
      current: usage.invoicesThisMonth,
      limit: usage.invoicesLimit,
      percentage: getUsagePercentage('invoices'),
      icon: '📄',
    },
    {
      label: 'Clients',
      current: usage.clientsTotal,
      limit: usage.clientsLimit,
      percentage: getUsagePercentage('clients'),
      icon: '👥',
    },
    {
      label: 'Produits',
      current: usage.productsTotal,
      limit: usage.productsLimit,
      percentage: getUsagePercentage('products'),
      icon: '📦',
    },
    {
      label: 'Stockage',
      current: usage.storageUsed,
      limit: usage.storageLimit,
      percentage: getUsagePercentage('storage'),
      icon: '💾',
      unit: ' MB',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Utilisation actuelle
      </h3>

      <div className="space-y-6">
        {resources.map((resource, idx) => {
          const isWarning = resource.percentage >= 80 && resource.percentage < 100;
          const isDanger = resource.percentage >= 100;
          const isUnlimited = resource.limit === -1;

          return (
            <div key={idx}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{resource.icon}</span>
                  <span className="text-sm font-medium text-gray-700">
                    {resource.label}
                  </span>
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {resource.current}
                  {resource.unit || ''}
                  {!isUnlimited && (
                    <>
                      <span className="text-gray-400 mx-1">/</span>
                      {resource.limit}
                      {resource.unit || ''}
                    </>
                  )}
                  {isUnlimited && (
                    <span className="text-green-600 ml-1">Illimité</span>
                  )}
                </div>
              </div>

              {!isUnlimited && (
                <>
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        isDanger
                          ? 'bg-red-600'
                          : isWarning
                          ? 'bg-yellow-500'
                          : 'bg-green-600'
                      )}
                      style={{ width: `${Math.min(resource.percentage, 100)}%` }}
                    />
                  </div>

                  {/* Warning/Danger Message */}
                  {(isWarning || isDanger) && (
                    <div
                      className={cn(
                        'flex items-center mt-2 text-sm',
                        isDanger ? 'text-red-600' : 'text-yellow-600'
                      )}
                    >
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {isDanger ? (
                        <span>Limite atteinte - Passez à un plan supérieur</span>
                      ) : (
                        <span>Vous approchez de la limite</span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Current Plan Badge */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Plan actuel</span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-800">
            {subscription.plan.displayName}
          </span>
        </div>
      </div>
    </div>
  );
}
