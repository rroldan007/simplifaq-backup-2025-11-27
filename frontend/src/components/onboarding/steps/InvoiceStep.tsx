import React, { useState, useEffect, useRef } from 'react';
import { FileText, Plus, CheckCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../services/api';

interface InvoiceStepProps {
  onComplete: () => void;
}

export default function InvoiceStep({ onComplete }: InvoiceStepProps) {
  const navigate = useNavigate();
  const [hasInvoices, setHasInvoices] = useState(false);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const dataLoadedRef = useRef(false);

  useEffect(() => {
    if (!dataLoadedRef.current) {
      checkExistingInvoices();
      dataLoadedRef.current = true;
    }
  }, []);

  const checkExistingInvoices = async () => {
    setLoading(true);
    try {
      const response = await api.get('/invoices');
      // The API returns { success: true, data: Invoice[] }
      // So response.data is the body, response.data.data is the array of invoices
      const invoices = Array.isArray(response.data.data) ? response.data.data : [];
      console.log('[InvoiceStep] Loaded invoices:', invoices.length);
      setInvoiceCount(invoices.length);
      setHasInvoices(invoices.length > 0);
    } catch (err) {
      console.error('Error loading invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = () => {
    navigate('/invoices/new?from=onboarding');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de vos factures...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="bg-green-600 rounded-full p-3">
            {hasInvoices ? (
              <CheckCircle className="h-6 w-6 text-white" />
            ) : (
              <FileText className="h-6 w-6 text-white" />
            )}
          </div>
          <div className="flex-1">
            {hasInvoices ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  ✅ Vous avez {invoiceCount} facture{invoiceCount > 1 ? 's' : ''} !
                </h3>
                <p className="text-gray-600 mb-4">
                  Parfait ! Votre configuration est maintenant complète. Cliquez sur Terminer pour finaliser l'onboarding.
                </p>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <p className="text-sm text-indigo-700">
          🤖 <strong>L'Assistant ADM peut vous aider!</strong> Essayez de lui demander:
          "Crée une facture pour [nom du client]"
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        {!hasInvoices && (
          <>
            <button
              type="button"
              onClick={checkExistingInvoices}
              className="px-4 py-3 text-gray-600 hover:text-gray-900 transition-colors font-medium text-sm"
            >
              Actualiser
            </button>
            <button
              type="button"
              onClick={handleCreateInvoice}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
            >
              <Plus className="h-5 w-5" />
              Créer une facture
            </button>
          </>
        )}

        {hasInvoices && (
          <>
            <button
              type="button"
              onClick={handleCreateInvoice}
              className="px-6 py-3 text-green-600 hover:text-green-700 transition-colors font-medium"
            >
              Créer une autre
            </button>
            <button
              type="button"
              onClick={onComplete}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium shadow-lg shadow-green-200"
            >
              Terminer 🎉
              <ArrowRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {!hasInvoices && (
        <div className="text-center text-sm text-gray-500">
          Une fois votre facture créée, revenez ici pour terminer! 🎊
        </div>
      )}
    </div>
  );
}
