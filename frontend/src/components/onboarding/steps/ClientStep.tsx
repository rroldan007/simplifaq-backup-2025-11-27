import React from 'react';
import { ArrowRight, Users, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ClientStepProps {
  onComplete: () => void;
}

export default function ClientStep({ onComplete }: ClientStepProps) {
  const navigate = useNavigate();

  const handleCreateClient = () => {
    // Navigate to clients page with create modal open
    navigate('/clients?create=true');
    // The onboarding will auto-detect when a client is created
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="bg-indigo-600 rounded-full p-3">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Créez votre premier client
            </h3>
            <p className="text-gray-600 mb-4">
              Les clients sont les destinataires de vos factures. Ajoutez les informations
              de votre premier client pour pouvoir créer des factures.
            </p>
            <div className="bg-white rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-gray-900">Informations nécessaires:</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                  Nom de l'entreprise ou nom/prénom
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                  Email de contact
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                  Adresse complète
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={handleCreateClient}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium"
        >
          <Plus className="h-5 w-5" />
          Créer un client
        </button>
      </div>

      <div className="text-center text-sm text-gray-500">
        Une fois votre client créé, revenez ici pour continuer l'onboarding
      </div>
    </div>
  );
}
