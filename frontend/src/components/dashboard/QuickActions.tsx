import React from 'react';
import { Card } from '../ui/Card';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  onClick: () => void;
}

interface QuickActionsProps {
  onCreateInvoice?: () => void;
  onCreateClient?: () => void;
  onCreateProduct?: () => void;
  onViewReports?: () => void;
}

export function QuickActions({
  onCreateInvoice,
  onCreateClient,
  onCreateProduct,
  onViewReports
}: QuickActionsProps) {
  const actions: QuickAction[] = [
    {
      id: 'create-invoice',
      title: '+ Facture',
      description: 'Créer une nouvelle facture pour un client',
      icon: '📄',
      color: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
      onClick: onCreateInvoice || (() => {})
    },
    {
      id: 'create-client',
      title: 'Nouveau client',
      description: 'Ajouter un nouveau client à votre base',
      icon: '👥',
      color: 'bg-green-50 text-green-600 hover:bg-green-100',
      onClick: onCreateClient || (() => {})
    },
    {
      id: 'create-product',
      title: 'Nouveau produit',
      description: 'Ajouter un produit ou service',
      icon: '📦',
      color: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
      onClick: onCreateProduct || (() => {})
    },
    {
      id: 'view-reports',
      title: 'Rapports TVA',
      description: 'Consulter vos rapports fiscaux',
      icon: '📊',
      color: 'bg-amber-50 text-amber-600 hover:bg-amber-100',
      onClick: onViewReports || (() => {})
    }
  ];

  const recentActions = [
    {
      title: 'Facture FAC-2024-015',
      description: 'Créée il y a 2 heures',
      status: 'Brouillon',
      statusColor: 'bg-slate-100 text-slate-600'
    },
    {
      title: 'Client Entreprise SA',
      description: 'Ajouté hier',
      status: 'Actif',
      statusColor: 'bg-green-100 text-green-600'
    },
    {
      title: 'Rapport TVA Q4',
      description: 'Généré la semaine dernière',
      status: 'Exporté',
      statusColor: 'bg-blue-100 text-blue-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Actions rapides */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">
          Actions rapides
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              className="p-4 text-left border border-slate-200 rounded-lg hover:border-slate-300 transition-all duration-200 group"
            >
              <div className="flex items-start space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${action.color}`}>
                  <span className="text-lg">{action.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 group-hover:text-slate-700">
                    {action.title}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    {action.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Raccourcis clavier */}
        <div className="mt-6 pt-4 border-t border-slate-200">
          <h3 className="text-sm font-medium text-slate-900 mb-3">
            Raccourcis clavier
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">+ Facture</span>
              <kbd className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-mono">
                Ctrl + N
              </kbd>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Rechercher</span>
              <kbd className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-mono">
                Ctrl + K
              </kbd>
            </div>
          </div>
        </div>
      </Card>

      {/* Activité récente */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">
          Activité récente
        </h2>
        
        <div className="space-y-4">
          {recentActions.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-slate-900">
                    {item.title}
                  </p>
                  <p className="text-sm text-slate-600">
                    {item.description}
                  </p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.statusColor}`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>

        {/* Lien vers l'historique complet */}
        <div className="mt-6 pt-4 border-t border-slate-200">
          <button className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
            Voir toute l'activité →
          </button>
        </div>
      </Card>
    </div>
  );
}