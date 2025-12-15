import React from 'react';
import { Sparkles, X, ArrowRight, CheckCircle } from 'lucide-react';

interface WelcomeModalProps {
  onClose: () => void;
  onStartOnboarding: () => void;
  companyName?: string;
}

export default function WelcomeModal({ onClose, onStartOnboarding, companyName }: WelcomeModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-4 sm:p-8 text-white relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-pattern"></div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors z-10"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-full p-3">
                <Sparkles className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl font-bold">Bienvenue sur SimpliFaq! 🎉</h1>
                {companyName && (
                  <p className="text-indigo-100 text-base sm:text-lg mt-1">{companyName}</p>
                )}
              </div>
            </div>
            <p className="text-indigo-100 text-sm sm:text-lg">
              Votre solution de facturation suisse intelligente
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 sm:space-y-6 min-h-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
              Commençons votre parcours! 🚀
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Nous allons configurer votre compte en quelques étapes simples. Cela ne prendra que quelques minutes.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">QR-factures suisses</h3>
                <p className="text-sm text-gray-600">
                  Génération automatique de QR Bills conformes aux standards suisses
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Envoi automatique</h3>
                <p className="text-sm text-gray-600">
                  Envoyez vos factures directement par email depuis votre domaine
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Assistant IA</h3>
                <p className="text-sm text-gray-600">
                  Créez des factures en langage naturel avec notre assistant intelligent
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Rapports détaillés</h3>
                <p className="text-sm text-gray-600">
                  Suivez votre CA, charges et utilité en temps réel
                </p>
              </div>
            </div>
          </div>

          {/* What we'll set up */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-4 sm:p-6">
            <h3 className="font-bold text-indigo-900 mb-2 sm:mb-3 text-base sm:text-lg">Ce que nous allons configurer:</h3>
            <div className="space-y-2 text-sm text-indigo-800">
              <p className="flex items-center gap-2">
                <span className="text-indigo-600">1️⃣</span>
                <span><strong>Informations de votre entreprise</strong> - Nom, adresse, contact</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-indigo-600">2️⃣</span>
                <span><strong>Logo</strong> (optionnel) - Pour personnaliser vos factures</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-indigo-600">3️⃣</span>
                <span><strong>IBAN</strong> - Pour générer les QR-factures suisses ⭐</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-indigo-600">4️⃣</span>
                <span><strong>Configuration SMTP</strong> (optionnel) - Pour envoyer vos factures</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-indigo-600">5️⃣</span>
                <span><strong>Premier client et produit</strong> - Les bases de votre facturation</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2 sm:pt-4">
            <button
              onClick={onStartOnboarding}
              className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold text-base sm:text-lg"
            >
              Commencer la configuration
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="px-4 sm:px-6 py-3 sm:py-4 text-gray-600 hover:text-gray-900 transition-colors font-medium rounded-xl hover:bg-gray-100"
            >
              Plus tard
            </button>
          </div>

          <p className="text-center text-xs text-gray-500">
            ⏱️ Temps estimé: 5-10 minutes • Vous pouvez passer certaines étapes
          </p>
        </div>
      </div>
    </div>
  );
}
