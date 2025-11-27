import React from 'react';

export function WelcomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🇨🇭 SimpliFaq
          </h1>
          <p className="text-gray-600">
            Système de facturation suisse
          </p>
        </div>
        
        <div className="space-y-4">
          <a 
            href="/login"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors inline-block"
          >
            Connexion
          </a>
          <a 
            href="/register"
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors inline-block"
          >
            Créer un compte
          </a>
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          <p>✅ Facturation suisse</p>
          <p>✅ Swiss QR Bills</p>
          <p>✅ Calcul TVA automatique</p>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-3">Utilisateur bêta ?</p>
          <a 
            href="/feedback.html"
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 no-underline inline-block"
          >
            <span>💬</span>
            <span>Donner mon feedback</span>
          </a>
        </div>
      </div>
    </div>
  );
}
