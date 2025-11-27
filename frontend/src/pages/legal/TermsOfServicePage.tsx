import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="leading-tight">
              <p className="font-bold text-lg text-blue-600">SimpliFaq</p>
              <p className="text-sm text-gray-500">Facturation QR suisse, simple.</p>
            </div>
          </Link>
          <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
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

        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">1. Objet du service</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              SimpliFaq permet aux utilisateurs de gérer leur facturation et comptabilité de manière simple et conforme aux normes suisses.<br />
              Le but est d'offrir un outil complet de gestion administrative pour les entrepreneurs et PME.
            </p>
            <p className="text-gray-700 leading-relaxed font-semibold">
              L'utilisation du service implique l'acceptation des présentes conditions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">2. Accès au service</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>L'accès au service nécessite la création d'un compte.</li>
              <li>Vous devez fournir des informations exactes et à jour.</li>
              <li>Vous êtes responsable de la confidentialité de vos identifiants.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">3. Obligations de l'utilisateur</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              En utilisant SimpliFaq, vous vous engagez à :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>utiliser l'application de manière raisonnable et conforme à la loi,</li>
              <li>ne pas tenter d'accéder aux données d'autres utilisateurs,</li>
              <li>ne pas effectuer d'ingénierie inverse, copie ou extraction de code,</li>
              <li>ne pas utiliser le service à des fins illégales ou frauduleuses.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">4. Données saisies dans l'application</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Vous pouvez enregistrer des données commerciales et financières (factures, dépenses, informations clients).
            </p>
            <p className="text-gray-700 leading-relaxed mb-3">Ces données :</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>restent votre propriété exclusive,</li>
              <li>sont hébergées 100 % en Suisse,</li>
              <li>ne sont pas utilisées à des fins commerciales par SimpliFaq,</li>
              <li>peuvent être exportées ou supprimées à tout moment.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">5. Disponibilité du service</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              SimpliFaq s'efforce de maintenir le service accessible 24h/24 et 7j/7.
            </p>
            <p className="text-gray-700 leading-relaxed mb-3">Toutefois, nous ne garantissons pas :</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>le fonctionnement ininterrompu du service,</li>
              <li>l'absence totale d'erreurs ou de bugs,</li>
              <li>la disponibilité permanente de toutes les fonctionnalités.</li>
            </ul>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
              <p className="text-gray-800 text-sm">
                ⚠️ Des maintenances programmées peuvent entraîner des interruptions temporaires.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">6. Tarification et abonnements</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>SimpliFaq propose différents plans tarifaires.</li>
              <li>Les tarifs sont affichés en CHF (francs suisses).</li>
              <li>Les paiements sont sécurisés via des partenaires certifiés.</li>
              <li>Vous pouvez résilier votre abonnement à tout moment.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">7. Limitation de responsabilité</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              SimpliFaq ne pourra être tenue responsable de :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>l'utilisation incorrecte des données fournies par l'application,</li>
              <li>les décisions commerciales ou comptables prises sur la base des informations,</li>
              <li>les dommages indirects ou consécutifs,</li>
              <li>la perte de données due à une action de l'utilisateur.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4 font-semibold">
              L'utilisateur reste responsable de la vérification des informations générées.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">8. Propriété intellectuelle</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              L'ensemble du contenu de SimpliFaq (code, design, logo, documentation) est protégé par le droit d'auteur.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Toute reproduction, distribution ou modification non autorisée est interdite.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">9. Résiliation</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Vous pouvez fermer votre compte à tout moment :
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              ➡️ en demandant par email la suppression de vos données : <a href="mailto:contact@simplifaq.ch" className="text-indigo-600 hover:underline font-semibold">contact@simplifaq.ch</a>
            </p>
            <p className="text-gray-700 leading-relaxed mb-3">
              SimpliFaq peut également suspendre ou supprimer un compte en cas :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>d'abus,</li>
              <li>de non-respect des présentes conditions,</li>
              <li>de comportement frauduleux ou illégal.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">10. Fonctionnalités d'IA – statut expérimental</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Certaines fonctionnalités de SimpliFaq peuvent inclure un module d'intelligence artificielle.
            </p>
            
            <h3 className="text-lg font-semibold mt-6 mb-3">Important :</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>l'IA est expérimentale et peut produire des erreurs,</li>
              <li>aucune décision comptable ou fiscale ne doit être prise uniquement sur la base des résultats de l'IA,</li>
              <li>l'utilisateur reste responsable des données et des actions générées.</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-3">Sécurité et protection des données :</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              Le traitement d'IA est effectué via un partenaire européen, <strong>Hostinger (Allemagne)</strong>.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4 mb-4">
              <ul className="space-y-2 text-gray-800 text-sm">
                <li>➡️ <strong>Aucune donnée financière identifiable</strong> n'est transmise.</li>
                <li>➡️ Les données envoyées à l'IA <strong>ne sont pas utilisées pour entraîner le modèle</strong>.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">11. Modifications des conditions</h2>
            <p className="text-gray-700 leading-relaxed">
              SimpliFaq se réserve le droit de modifier les présentes conditions à tout moment.<br />
              Les utilisateurs seront informés par email des changements importants.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">12. Droit applicable</h2>
            <p className="text-gray-700 leading-relaxed">
              Les présentes conditions sont régies par le droit suisse.<br />
              Tout litige sera soumis à la compétence exclusive des tribunaux de Genève, Suisse.
            </p>
          </section>

          <section className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mt-8">
            <h2 className="text-xl font-bold mb-4">Résumé simplifié</h2>
            <ul className="space-y-2 text-gray-800">
              <li>✅ <strong>Vous utilisez SimpliFaq pour gérer votre facturation.</strong></li>
              <li>✅ <strong>Vos données restent votre propriété.</strong></li>
              <li>✅ <strong>Hébergement 100% Suisse.</strong></li>
              <li>⚠️ <strong>Utilisez l'IA avec discernement.</strong></li>
              <li>ℹ️ <strong>Vous pouvez résilier à tout moment.</strong></li>
            </ul>
          </section>
        </div>
      </main>

      <footer className="border-t mt-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 text-sm text-gray-600">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p>© {new Date().getFullYear()} SimpliFaq. Tous droits réservés.</p>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="hover:underline">Politique de confidentialité</Link>
              <Link to="/terms" className="hover:underline">Conditions d'utilisation</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
