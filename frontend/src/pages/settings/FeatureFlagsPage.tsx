import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { FeatureFlagsPanel } from '../../components/settings/FeatureFlagsPanel';

export function FeatureFlagsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Retour</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-slate-900">Feature Flags</h1>
          </div>
          <p className="text-lg text-slate-600">
            Personnalisez votre expérience avec les dernières fonctionnalités
          </p>
        </div>

        {/* Feature Flags Panel */}
        <FeatureFlagsPanel />

        {/* Additional Info */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Comment ça marche ?</h2>
          <div className="space-y-4 text-slate-600">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Activez les fonctionnalités</h3>
                <p>Utilisez les interrupteurs pour activer ou désactiver les fonctionnalités que vous souhaitez tester.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Testez immédiatement</h3>
                <p>Les changements sont appliqués instantanément sans besoin de recharger la page.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Partagez vos retours</h3>
                <p>Vos préférences nous aident à améliorer continuellement l'application.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notice */}
        <div className="mt-6 text-center text-sm text-slate-500">
          Les paramètres sont sauvegardés localement dans votre navigateur
        </div>
      </div>
    </div>
  );
}
