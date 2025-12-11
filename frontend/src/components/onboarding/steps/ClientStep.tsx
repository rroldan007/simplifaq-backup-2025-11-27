import React, { useState, useEffect, useRef } from 'react';
import { Users, Plus, ArrowRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../services/api';

interface ClientStepProps {
  onComplete: () => void;
}

export default function ClientStep({ onComplete }: ClientStepProps) {
  const navigate = useNavigate();
  const [hasClients, setHasClients] = useState(false);
  const [clientCount, setClientCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const dataLoadedRef = useRef(false);

  useEffect(() => {
    if (!dataLoadedRef.current) {
      checkExistingClients();
      dataLoadedRef.current = true;
    }
  }, []);

  const checkExistingClients = async () => {
    setLoading(true);
    try {
      const response = await api.get('/clients');
      const data = response.data.data as { clients?: unknown[] };
      const clients = data.clients || [];
      setClientCount(clients.length);
      setHasClients(clients.length > 0);
    } catch (err) {
      console.error('Error loading clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = () => {
    // Navigate to clients page with create modal open
    navigate('/clients?create=true');
    // The onboarding will auto-detect when a client is created
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de vos clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="bg-indigo-600 rounded-full p-3">
            {hasClients ? (
              <CheckCircle className="h-6 w-6 text-white" />
            ) : (
              <Users className="h-6 w-6 text-white" />
            )}
          </div>
          <div className="flex-1">
            {hasClients ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  ✅ Vous avez {clientCount} client{clientCount > 1 ? 's' : ''} !
                </h3>
                <p className="text-gray-600 mb-4">
                  Parfait ! Vous pouvez maintenant continuer vers l'étape suivante ou ajouter plus de clients.
                </p>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        {!hasClients && (
          <button
            type="button"
            onClick={handleCreateClient}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium"
          >
            <Plus className="h-5 w-5" />
            Créer un client
          </button>
        )}
        
        {hasClients && (
          <>
            <button
              type="button"
              onClick={handleCreateClient}
              className="px-6 py-3 text-indigo-600 hover:text-indigo-700 transition-colors font-medium"
            >
              Ajouter un autre
            </button>
            <button
              type="button"
              onClick={onComplete}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium"
            >
              Continuer
              <ArrowRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {!hasClients && (
        <div className="text-center text-sm text-gray-500">
          Une fois votre client créé, revenez ici pour continuer l'onboarding
        </div>
      )}
    </div>
  );
}
