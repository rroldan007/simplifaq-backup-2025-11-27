import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSubscription } from '../../hooks/useSubscription';
import { PlanCard } from '../../components/billing/PlanCard';
import { SubscriptionUsage } from '../../components/billing/SubscriptionUsage';
import type { Plan } from '../../components/billing/PlanCard';
import { getPublicPlans } from '../../services/plansApi';
import { 
  CreditCard, 
  Calendar, 
  AlertCircle, 
  CheckCircle,
  X
} from 'lucide-react';
import { cn } from '../../utils/cn';

export function SubscriptionPage() {
  const location = useLocation();
  const { subscription, usage, isLoading, error, changePlan, cancelSubscription, reactivateSubscription } = useSubscription();
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadPlans();
    
    // Check if there's a selected plan from navigation state
    if (location.state?.selectedPlanId) {
      setSelectedPlanId(location.state.selectedPlanId);
    }
  }, [location]);

  const loadPlans = async () => {
    try {
      const plans = await getPublicPlans();
      setAvailablePlans(plans);
    } catch (err) {
      console.error('Error loading plans:', err);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    if (subscription && planId === subscription.planId) {
      return; // Already on this plan
    }

    setSelectedPlanId(planId);
    setIsChangingPlan(true);
    
    const success = await changePlan(planId);
    
    if (success) {
      setActionMessage({ type: 'success', text: 'Votre plan a été changé avec succès!' });
      setSelectedPlanId(null);
    } else {
      setActionMessage({ type: 'error', text: 'Erreur lors du changement de plan. Veuillez réessayer.' });
    }
    
    setIsChangingPlan(false);
  };

  const handleCancelSubscription = async () => {
    const success = await cancelSubscription();
    
    if (success) {
      setActionMessage({ 
        type: 'success', 
        text: 'Votre abonnement sera annulé à la fin de la période en cours.' 
      });
    } else {
      setActionMessage({ type: 'error', text: 'Erreur lors de l\'annulation. Veuillez réessayer.' });
    }
    
    setShowCancelDialog(false);
  };

  const handleReactivate = async () => {
    const success = await reactivateSubscription();
    
    if (success) {
      setActionMessage({ type: 'success', text: 'Votre abonnement a été réactivé avec succès!' });
    } else {
      setActionMessage({ type: 'error', text: 'Erreur lors de la réactivation. Veuillez réessayer.' });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading || loadingPlans) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Link to="/dashboard" className="text-indigo-600 hover:text-indigo-700">
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mon abonnement</h1>
        <p className="text-gray-600">
          Gérez votre plan, consultez votre utilisation et vos paiements
        </p>
      </div>

      {/* Action Message */}
      {actionMessage && (
        <div
          className={cn(
            'mb-6 p-4 rounded-lg flex items-center',
            actionMessage.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          )}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 mr-3" />
          ) : (
            <AlertCircle className="w-5 h-5 mr-3" />
          )}
          <span>{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="ml-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Current Subscription & Usage */}
        <div className="lg:col-span-1 space-y-6">
          {/* Current Subscription Card */}
          {subscription && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Plan actuel
              </h2>

              <div className="space-y-4">
                <div>
                  <div className="text-3xl font-bold text-indigo-600 mb-1">
                    {subscription.plan.displayName}
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {subscription.plan.price === 0 ? (
                      'Gratuit'
                    ) : (
                      <>
                        {subscription.plan.price} {subscription.plan.currency}
                        <span className="text-sm text-gray-500 font-normal">/mois</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center space-x-2">
                  <span
                    className={cn(
                      'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
                      subscription.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : subscription.status === 'cancelled'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    )}
                  >
                    {subscription.status === 'active' && 'Actif'}
                    {subscription.status === 'cancelled' && 'Annulé'}
                    {subscription.status === 'past_due' && 'En retard'}
                    {subscription.status === 'unpaid' && 'Impayé'}
                  </span>
                </div>

                {/* Dates */}
                <div className="pt-4 border-t border-gray-200 space-y-2">
                  <div className="flex items-center text-sm">
                    <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-600">
                      Période: {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                    </span>
                  </div>

                  {subscription.cancelAtPeriodEnd && subscription.cancelledAt && (
                    <div className="flex items-start text-sm">
                      <AlertCircle className="w-4 h-4 text-yellow-500 mr-2 mt-0.5" />
                      <span className="text-yellow-700">
                        Votre abonnement se terminera le {formatDate(subscription.currentPeriodEnd)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-gray-200 space-y-2">
                  {subscription.cancelAtPeriodEnd ? (
                    <button
                      onClick={handleReactivate}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Réactiver l'abonnement
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowCancelDialog(true)}
                      className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Annuler l'abonnement
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Usage Card */}
          <SubscriptionUsage />
        </div>

        {/* Right Column - Available Plans */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Plans disponibles
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {availablePlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={subscription?.planId === plan.id}
                isPopular={plan.name === 'basic' || plan.name === 'professional'}
                onSelect={handleSelectPlan}
                isLoading={isChangingPlan && selectedPlanId === plan.id}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Confirmer l'annulation
            </h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir annuler votre abonnement? Vous pourrez continuer
              à utiliser les fonctionnalités de votre plan jusqu'à la fin de la période en cours.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowCancelDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Retour
              </button>
              <button
                onClick={handleCancelSubscription}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Confirmer l'annulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
