import React from 'react';

export function PrivacyPolicyPage() {
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
        <h1 className="text-3xl font-bold mb-4">Politique de Confidentialité</h1>
        <p className="text-sm text-gray-600 mb-2">Conformité LPD — Suisse et RGPD — UE</p>
        <p className="text-sm text-gray-600 mb-8 italic">Dernière mise à jour : 2 novembre 2025</p>
        
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 mb-8">
          <p className="text-gray-800 font-medium">
            Nous respectons votre vie privée.<br />
            Cette politique explique de manière claire comment sont traitées vos données.
          </p>
        </div>

        <div className="prose prose-lg max-w-none">
          <h2 className="text-2xl font-bold mt-8 mb-4">1. Données collectées</h2>
          <p className="text-gray-700 mb-4">
            Nous collectons uniquement les données nécessaires au fonctionnement du service de facturation.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">2. Utilisation des données</h2>
          <p className="text-gray-700 mb-4">
            Vos données sont utilisées exclusivement pour fournir le service de facturation et ne sont jamais partagées avec des tiers.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">3. Sécurité</h2>
          <p className="text-gray-700 mb-4">
            Nous mettons en œuvre des mesures de sécurité robustes pour protéger vos informations.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">4. Vos droits</h2>
          <p className="text-gray-700 mb-4">
            Conformément à la LPD suisse, vous disposez de droits sur vos données personnelles.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">5. Contact</h2>
          <p className="text-gray-700">
            Pour toute question concernant cette politique, contactez-nous à contact@simplifaq.ch
          </p>
        </div>
      </main>
    </div>
  );
}
