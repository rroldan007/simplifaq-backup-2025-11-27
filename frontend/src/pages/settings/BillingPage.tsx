/**
 * 🇨🇭 SimpliFaq - Billing & Subscription Page
 * 
 * User billing management with subscription plans and payment methods
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser, useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { 
  ArrowLeft, 
  CreditCard, 
  Check, 
  Crown, 
  Zap,
  Calendar,
  Receipt,
  AlertCircle
} from 'lucide-react';

interface Subscription {
  id: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  date: string;
  invoiceUrl?: string;
}

const PLANS = [
  {
    id: 'free',
    name: 'Gratuit',
    price: 0,
    period: '',
    description: 'Pour découvrir SimpliFaq',
    features: [
      'Jusqu\'à 5 factures par mois',
      '1 utilisateur',
      'Support par email',
      'Fonctionnalités de base'
    ],
    icon: Check,
    color: 'gray'
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    period: '/mois',
    description: 'Pour les petites entreprises',
    features: [
      'Factures illimitées',
      'Jusqu\'à 3 utilisateurs',
      'Devis et rapports',
      'Support prioritaire',
      'Personnalisation PDF',
      'Synchronisation bancaire'
    ],
    icon: Zap,
    color: 'blue',
    popular: true
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 79,
    period: '/mois',
    description: 'Pour les entreprises en croissance',
    features: [
      'Tout de Starter',
      'Utilisateurs illimités',
      'API et webhooks',
      'Rapports avancés',
      'Gestion multi-devises',
      'Support téléphonique',
      'Formation personnalisée'
    ],
    icon: Crown,
    color: 'purple'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    period: '',
    description: 'Pour les grandes organisations',
    features: [
      'Tout de Professional',
      'Déploiement on-premise',
      'Support dédié 24/7',
      'SLA garantis',
      'Intégrations personnalisées',
      'Formation sur site',
      'Account manager dédié'
    ],
    icon: Crown,
    color: 'gold'
  }
];

export function BillingPage() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    console.log('[BillingPage] Loading billing data...');
    setLoading(true);
    try {
      // Load subscription info
      console.log('[BillingPage] Fetching subscription...');
      const subResponse = await api.get('/billing/subscription');
      console.log('[BillingPage] Subscription response:', subResponse);
      
      const subscriptionData = (subResponse as any).data?.subscription || {
        id: 'default',
        plan: 'free' as const,
        status: 'active' as const,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false
      };
      
      console.log('[BillingPage] Setting subscription:', subscriptionData);
      setSubscription(subscriptionData);

      // Load invoices
      console.log('[BillingPage] Fetching invoices...');
      const invoicesResponse = await api.get('/billing/invoices');
      console.log('[BillingPage] Invoices response:', invoicesResponse);
      
      const invoicesData = (invoicesResponse as any).data?.invoices || [];
      console.log('[BillingPage] Setting invoices:', invoicesData);
      setInvoices(invoicesData);
      
      console.log('[BillingPage] Data loaded successfully');
    } catch (error) {
      console.error('[BillingPage] Error loading billing data:', error);
      // Set default free plan if API fails
      const defaultSubscription = {
        id: 'default',
        plan: 'free' as const,
        status: 'active' as const,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false
      };
      console.log('[BillingPage] Setting default subscription:', defaultSubscription);
      setSubscription(defaultSubscription);
      showToast('Utilisation du plan gratuit par défaut', 'info');
    } finally {
      console.log('[BillingPage] Setting loading to false');
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    if (planId === 'enterprise') {
      showToast('Contactez-nous pour un plan Enterprise personnalisé', 'info');
      return;
    }

    try {
      const response = await api.post('/billing/subscribe', { plan: planId });
      if ((response as any).data?.checkoutUrl) {
        // Redirect to payment page
        window.location.href = (response as any).data.checkoutUrl;
      } else {
        showToast('Abonnement mis à jour avec succès', 'success');
        loadBillingData();
      }
    } catch (error) {
      showToast('Erreur lors de la mise à jour de l\'abonnement', 'error');
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Êtes-vous sûr de vouloir annuler votre abonnement ? Il restera actif jusqu\'à la fin de la période en cours.')) {
      return;
    }

    try {
      await api.post('/billing/cancel');
      showToast('Abonnement annulé. Il restera actif jusqu\'à la fin de la période.', 'success');
      loadBillingData();
    } catch (error) {
      showToast('Erreur lors de l\'annulation de l\'abonnement', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CH', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatAmount = (amount: number, currency: string = 'CHF') => {
    return new Intl.NumberFormat('fr-CH', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getPlanColorClass = (color: string) => {
    const colors: Record<string, { border: string; bg: string; text: string; button: string }> = {
      gray: {
        border: 'border-gray-200',
        bg: 'bg-gray-50',
        text: 'text-gray-700',
        button: 'bg-gray-600 hover:bg-gray-700'
      },
      blue: {
        border: 'border-blue-200',
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        button: 'bg-blue-600 hover:bg-blue-700'
      },
      purple: {
        border: 'border-purple-200',
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        button: 'bg-purple-600 hover:bg-purple-700'
      },
      gold: {
        border: 'border-yellow-200',
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        button: 'bg-yellow-600 hover:bg-yellow-700'
      }
    };
    return colors[color] || colors.gray;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  const currentPlan = PLANS.find(p => p.id === subscription?.plan) || PLANS[0];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded shadow-md border text-sm ${
          toast.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' :
          toast.type === 'error' ? 'bg-red-50 border-red-300 text-red-800' :
          'bg-slate-50 border-slate-300 text-slate-800'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturation & Abonnement</h1>
          <p className="text-sm text-gray-500 mt-1">Gérez votre abonnement et vos paiements</p>
        </div>
      </div>

      {/* Current Subscription Card */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Abonnement actuel</h2>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold text-gray-900">{currentPlan.name}</h3>
                {subscription?.status === 'trial' && (
                  <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded">
                    Période d'essai
                  </span>
                )}
                {subscription?.status === 'active' && (
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                    Actif
                  </span>
                )}
              </div>
              {currentPlan.price !== null && (
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {formatAmount(currentPlan.price, 'CHF')}
                  <span className="text-sm text-gray-500 font-normal">{currentPlan.period}</span>
                </p>
              )}
              <p className="text-sm text-gray-600 mt-2">{currentPlan.description}</p>

              {subscription && (
                <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Renouvellement: {formatDate(subscription.currentPeriodEnd)}</span>
                  </div>
                </div>
              )}

              {subscription?.cancelAtPeriodEnd && (
                <div className="mt-3 flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">
                    Votre abonnement sera annulé le {formatDate(subscription.currentPeriodEnd)}
                  </span>
                </div>
              )}
            </div>

            {currentPlan.id !== 'free' && !subscription?.cancelAtPeriodEnd && (
              <button
                onClick={handleCancelSubscription}
                className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 transition"
              >
                Annuler l'abonnement
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Plans disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan) => {
            const colors = getPlanColorClass(plan.color);
            const isCurrentPlan = plan.id === subscription?.plan;
            const Icon = plan.icon;

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-lg border-2 ${
                  plan.popular ? 'border-blue-500 shadow-lg scale-105' : colors.border
                } transition-all hover:shadow-md`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-full">
                      Plus populaire
                    </span>
                  </div>
                )}

                <div className="p-6">
                  <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${colors.text}`} />
                  </div>

                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  
                  <div className="mt-3">
                    {plan.price !== null ? (
                      <p className="text-3xl font-bold text-gray-900">
                        {formatAmount(plan.price, 'CHF')}
                        <span className="text-sm text-gray-500 font-normal">{plan.period}</span>
                      </p>
                    ) : (
                      <p className="text-2xl font-bold text-gray-900">Sur mesure</p>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mt-3">{plan.description}</p>

                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                        <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isCurrentPlan}
                    className={`w-full mt-6 px-4 py-2 rounded-md text-white font-medium transition ${
                      isCurrentPlan
                        ? 'bg-gray-400 cursor-not-allowed'
                        : colors.button
                    }`}
                  >
                    {isCurrentPlan ? 'Plan actuel' : plan.id === 'enterprise' ? 'Contactez-nous' : 'Choisir ce plan'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoices History */}
      {invoices.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-6 border-b">
            <div className="flex items-center gap-3">
              <Receipt className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Historique de facturation</h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(invoice.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatAmount(invoice.amount, invoice.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {invoice.status === 'paid' ? 'Payée' :
                         invoice.status === 'pending' ? 'En attente' :
                         'Échouée'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {invoice.invoiceUrl && (
                        <a
                          href={invoice.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Télécharger
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
