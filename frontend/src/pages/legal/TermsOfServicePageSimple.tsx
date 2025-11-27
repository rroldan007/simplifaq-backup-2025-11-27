import React from 'react';

export function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="leading-tight">
              <p className="font-bold text-lg text-blue-600">SimpliFaq</p>
              <p className="text-sm text-gray-500">Facturation QR suisse, simple.</p>
            </div>
          </a>
          <a href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900">
            ← Retour
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-4">Conditions d'Utilisation</h1>
        <p className="text-sm text-gray-600 mb-8 italic">Dernière mise à jour : 2 novembre 2025</p>
        
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 mb-8">
          <p className="text-gray-800">
            Les présentes conditions définissent le cadre d'utilisation de l'application SimpliFaq, développée et opérée par Patricia Roldán Boyrie — SimpliFaq (Entreprise Individuelle en création), Genève, Suisse.
          </p>
        </div>

        <div className="prose prose-lg max-w-none">
          <h2 className="text-2xl font-bold mt-8 mb-4">1. Acceptation des conditions</h2>
          <p className="text-gray-700 mb-4">
            En utilisant SimpliFaq, vous acceptez les présentes conditions d'utilisation.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">2. Description du service</h2>
          <p className="text-gray-700 mb-4">
            SimpliFaq est une application de facturation suisse permettant la création de factures et QR bills conformes aux standards suisses.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">3. Responsabilités de l'utilisateur</h2>
          <p className="text-gray-700 mb-4">
            Vous êtes responsable de l'exactitude des informations que vous saisissez et du respect des lois fiscales suisses.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">4. Propriété intellectuelle</h2>
          <p className="text-gray-700 mb-4">
            SimpliFaq et son contenu sont protégés par les droits de propriété intellectuelle.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">5. Limitation de responsabilité</h2>
          <p className="text-gray-700 mb-4">
            SimpliFaq est fourni "en l'état" et nous ne pouvons être tenus responsables des pertes découlant de son utilisation.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">6. Résiliation</h2>
          <p className="text-gray-700 mb-4">
            Vous pouvez résilier votre compte à tout moment. Nous nous réservons le droit de suspendre les comptes non conformes.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">7. Modifications</h2>
          <p className="text-gray-700 mb-4">
            Nous nous réservons le droit de modifier ces conditions. Les modifications prendront effet dès leur publication.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">8. Contact</h2>
          <p className="text-gray-700">
            Pour toute question concernant ces conditions, contactez-nous à contact@simplifaq.ch
          </p>
        </div>
      </main>
    </div>
  );
}
