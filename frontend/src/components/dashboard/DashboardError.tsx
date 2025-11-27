import React from 'react';
import { Card } from '../ui/Card';
import { Alert } from '../ui/Alert';

interface DashboardErrorProps {
  error: string;
  onRetry?: () => void;
  lastUpdated?: Date | null;
}

export function DashboardError({ error, onRetry, lastUpdated }: DashboardErrorProps) {
  const formatLastUpdated = (date: Date) => {
    return new Intl.DateTimeFormat('fr-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="text-slate-600 mt-2">
          Vue d'ensemble de votre activité de facturation
        </p>
      </div>

      {/* Error alert */}
      <Alert variant="error">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium mb-1">
              Erreur de chargement des données
            </h3>
            <p className="text-sm">
              {error}
            </p>
            {lastUpdated && (
              <p className="text-xs mt-2 opacity-75">
                Dernière mise à jour : {formatLastUpdated(lastUpdated)}
              </p>
            )}
          </div>
          <div className="text-2xl">⚠️</div>
        </div>
      </Alert>

      {/* Error state content */}
      <Card className="p-12">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">📊</span>
          </div>
          
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Impossible de charger le tableau de bord
          </h2>
          
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            Une erreur s'est produite lors du chargement de vos données de facturation. 
            Veuillez vérifier votre connexion internet et réessayer.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span className="mr-2">🔄</span>
                Réessayer
              </button>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-6 py-3 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              <span className="mr-2">↻</span>
              Actualiser la page
            </button>
          </div>

          {/* Troubleshooting tips */}
          <div className="mt-8 p-4 bg-slate-50 rounded-lg text-left max-w-md mx-auto">
            <h3 className="font-medium text-slate-900 mb-2">
              Conseils de dépannage :
            </h3>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• Vérifiez votre connexion internet</li>
              <li>• Actualisez la page (F5)</li>
              <li>• Videz le cache de votre navigateur</li>
              <li>• Contactez le support si le problème persiste</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}