import React from 'react';
import { FileText, Plus, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface InvoiceStepProps {
  onComplete: () => void;
}

export default function InvoiceStep({ onComplete }: InvoiceStepProps) {
  const navigate = useNavigate();

  const handleCreateInvoice = () => {
    navigate('/invoices?create=true');
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="bg-green-600 rounded-full p-3">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Créez votre première facture! 🎉
            </h3>
            <p className="text-gray-600 mb-4">
              Vous y êtes presque! Créez votre première facture pour terminer la configuration.
              L'assistant IA vous guidera dans le processus.
            </p>
            <div className="bg-white rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-gray-900">Ce que vous allez faire:</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Sélectionner un client</p>
                    <p className="text-sm text-gray-600">Choisissez le client que vous venez de créer</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Ajouter des produits</p>
                    <p className="text-sm text-gray-600">Ajoutez le produit que vous avez créé</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Générer la facture</p>
                    <p className="text-sm text-gray-600">Avec QR-facture suisse incluse!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <p className="text-sm text-indigo-700">
          🤖 <strong>L'Assistant ADM peut vous aider!</strong> Essayez de lui demander:
          "Crée une facture pour [nom du client]"
        </p>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={handleCreateInvoice}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
        >
          <Plus className="h-5 w-5" />
          Créer une facture
        </button>
      </div>

      <div className="text-center text-sm text-gray-500">
        Une fois votre facture créée, l'onboarding sera terminé! 🎊
      </div>
    </div>
  );
}
