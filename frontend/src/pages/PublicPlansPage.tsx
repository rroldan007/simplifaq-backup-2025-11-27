import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlanCard } from '../components/billing/PlanCard';
import { PlanComparison } from '../components/billing/PlanComparison';
import type { Plan } from '../components/billing/PlanCard';
import { getPublicPlans } from '../services/plansApi';
import { ChevronDown, Sparkles, Check } from 'lucide-react';

export function PublicPlansPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      const data = await getPublicPlans();
      // Sort plans by price
      const sortedPlans = data.sort((a, b) => a.price - b.price);
      setPlans(sortedPlans);
    } catch (err) {
      console.error('Error loading plans:', err);
      setError('Impossible de charger les plans. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlan = (planId: string) => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      // Redirect to register with selected plan
      navigate(`/register?plan=${planId}`);
    } else {
      // Redirect to subscription page
      navigate('/settings/subscription', { state: { selectedPlanId: planId } });
    }
  };

  const getPopularPlanId = (): string | null => {
    // Mark the middle-priced plan as popular
    if (plans.length >= 3) {
      return plans[1].id; // Usually the "basic" or "professional" plan
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50">
      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 mr-2" />
            Facturation suisse simplifiée
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Choisissez le plan parfait
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              pour votre entreprise
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            SimpliFaq offre des solutions de facturation adaptées aux PME suisses.
            QR-facture intégrée, conformité fiscale et interface intuitive.
          </p>

          {/* Features badges */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {[
              '✓ Sans engagement',
              '✓ QR-facture suisse',
              '✓ Support en français',
              '✓ Données en Suisse'
            ].map((feature, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-4 py-2 rounded-full bg-white border border-gray-200 text-sm text-gray-700 shadow-sm"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Plans Grid */}
      <section className="pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadPlans}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Réessayer
              </button>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    isPopular={plan.id === getPopularPlanId()}
                    onSelect={handleSelectPlan}
                  />
                ))}
              </div>

              {/* Comparison Table Toggle */}
              <div className="text-center mb-8">
                <button
                  onClick={() => setShowComparison(!showComparison)}
                  className="inline-flex items-center px-6 py-3 rounded-lg bg-white border-2 border-gray-200 text-gray-700 font-medium hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  {showComparison ? 'Masquer' : 'Comparer'} les fonctionnalités
                  <ChevronDown className={`w-5 h-5 ml-2 transition-transform ${showComparison ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Comparison Table */}
              {showComparison && (
                <div className="mt-8 animate-fadeIn">
                  <PlanComparison plans={plans} />
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Questions fréquentes
          </h2>
          
          <div className="space-y-6">
            {faqs.map((faq, idx) => (
              <FAQItem key={idx} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Prêt à simplifier votre facturation?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Commencez gratuitement, sans carte de crédit requise.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="px-8 py-4 bg-white text-indigo-600 rounded-lg font-semibold text-lg hover:bg-gray-100 shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
          >
            Commencer gratuitement
          </button>
        </div>
      </section>
    </div>
  );
}

// FAQ Component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 text-left bg-white hover:bg-gray-50 transition-colors flex items-center justify-between"
      >
        <span className="font-semibold text-gray-900">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-gray-700">{answer}</p>
        </div>
      )}
    </div>
  );
}

// FAQ Data
const faqs = [
  {
    question: 'Puis-je changer de plan à tout moment?',
    answer: 'Oui, vous pouvez changer de plan à tout moment. Le changement prendra effet immédiatement et vous serez facturé au prorata.',
  },
  {
    question: 'Quels moyens de paiement acceptez-vous?',
    answer: 'Nous acceptons les cartes de crédit (Visa, Mastercard), les virements bancaires et les paiements par facture pour les plans annuels.',
  },
  {
    question: 'Mes données sont-elles sécurisées?',
    answer: 'Absolument. Toutes vos données sont hébergées en Suisse, chiffrées et sauvegardées quotidiennement. Nous sommes conformes au RGPD et à la LPD suisse.',
  },
  {
    question: 'Puis-je annuler mon abonnement?',
    answer: 'Oui, vous pouvez annuler votre abonnement à tout moment sans frais. Votre accès restera actif jusqu\'à la fin de la période payée.',
  },
  {
    question: 'Le plan gratuit a-t-il une limitation dans le temps?',
    answer: 'Non, le plan gratuit est disponible sans limitation de temps. Vous pouvez l\'utiliser aussi longtemps que vous le souhaitez.',
  },
  {
    question: 'Proposez-vous des réductions pour les organisations à but non lucratif?',
    answer: 'Oui, nous offrons des réductions spéciales pour les associations et organisations à but non lucratif. Contactez-nous pour plus d\'informations.',
  },
];
