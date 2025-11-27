import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function PrivacyPolicyPage() {
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
        <h1 className="text-3xl font-bold mb-4">Politique de Confidentialité</h1>
        <p className="text-sm text-gray-600 mb-2">Conformité LPD — Suisse et RGPD — UE</p>
        <p className="text-sm text-gray-600 mb-8 italic">Dernière mise à jour : 2 novembre 2025</p>
        
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 mb-8">
          <p className="text-gray-800 font-medium">
            Nous respectons votre vie privée.<br />
            Cette politique explique de manière claire comment sont traitées vos données.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">1. Responsable du traitement</h2>
            <p className="text-gray-700 leading-relaxed">
              Patricia Roldán Boyrie — SimpliFaq (Entreprise individuelle en création)<br />
              Genève, Suisse<br />
              Email : <a href="mailto:contact@simplifaq.ch" className="text-indigo-600 hover:underline">contact@simplifaq.ch</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">2. Données collectées</h2>
            
            <h3 className="text-lg font-semibold mt-6 mb-3">📩 Lors de l'inscription à la bêta ou via un formulaire :</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Adresse email</li>
              <li>Nom / prénom</li>
              <li>Adresse IP (collectée automatiquement par MailPro)</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-3">📊 Lors de l'utilisation de l'application pendant la bêta :</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              Vous pourrez saisir des données financières et commerciales, telles que :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>factures émises,</li>
              <li>dépenses enregistrées,</li>
              <li>informations relatives à vos clients/fournisseurs (nom, adresse, montant facturé),</li>
              <li>éventuels fichiers liés aux documents comptables.</li>
            </ul>
            
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-4">
              <p className="text-gray-800 text-sm leading-relaxed">
                <strong>Ces données restent votre propriété exclusive.</strong><br />
                SimpliFaq n'accède pas au contenu de vos factures ou de vos dépenses, sauf si vous nous sollicitez pour du support technique.<br />
                <strong>Aucune donnée de paiement</strong> (CB, IBAN personnel, etc.) n'est collectée par SimpliFaq.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">3. Finalités du traitement</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Nous utilisons vos données pour :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>vous inscrire à la bêta gratuite de SimpliFaq,</li>
              <li>vous envoyer les accès et instructions d'utilisation,</li>
              <li>assurer le fonctionnement de l'application (facturation, gestion des dépenses),</li>
              <li>pour vous envoyer les nouveautés de SimpliFaq pendant et après la phase bêta.</li>
              <li>vous informer du lancement officiel</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4 font-semibold">
              Nous ne revendons jamais vos données.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">4. Base légale</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>LPD (Suisse)</strong> : exécution d'un service demandé (article 6 LPD).</li>
              <li><strong>RGPD (UE)</strong> : consentement et exécution du contrat (article 6.1.a et b RGPD).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">5. Hébergement et stockage des données</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Vos données sont stockées <strong>exclusivement en Suisse</strong> :
            </p>
            
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-800">Données</th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-800">Où sont-elles stockées ?</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-3 text-gray-700">Email + nom</td>
                    <td className="border border-gray-300 px-4 py-3 text-gray-700">MailPro (formulaire / newsletter)</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 px-4 py-3 text-gray-700">Données de l'application (factures, dépenses, clients)</td>
                    <td className="border border-gray-300 px-4 py-3 text-gray-700">Serveurs Infomaniak (hébergement cloud en Suisse)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-semibold mt-8 mb-3">🤖 Traitement de l'IA (Hostinger – Allemagne)</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              Certaines fonctionnalités expérimentales peuvent utiliser un module d'IA hébergé chez <strong>Hostinger (UE, Allemagne)</strong>.
            </p>
            <p className="text-gray-700 leading-relaxed mb-3">
              Les données envoyées sont pseudonymisées (identifiant technique / jeton), et ne permettent pas d'identifier les factures, montants ou clients.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4 mb-4">
              <p className="text-gray-800 text-sm leading-relaxed">
                <strong>Aucune donnée comptable ou commerciale identifiable n'est transmise.</strong>
              </p>
            </div>

            <p className="text-gray-700 leading-relaxed mt-4 font-semibold">
              Aucun transfert en dehors de la Suisse ou de l'UE.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">6. Durée de conservation</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Données de bêta</strong> : pendant la durée de la bêta + 12 mois.</li>
              <li><strong>Emails</strong> : jusqu'à désinscription.</li>
              <li><strong>Données supprimées</strong> → suppression définitive et irréversible.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">7. Vos droits</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Vous pouvez, à tout moment :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>demander l'accès à vos données,</li>
              <li>demander leur rectification,</li>
              <li>demander leur suppression ("droit à l'oubli"),</li>
              <li>vous désinscrire via le lien présent en bas de nos emails.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Demande simple par email : <a href="mailto:contact@simplifaq.ch" className="text-indigo-600 hover:underline font-semibold">contact@simplifaq.ch</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">8. Cookies</h2>
            <p className="text-gray-700 leading-relaxed">
              SimpliFaq n'utilise que des <strong>cookies fonctionnels indispensables</strong> au fonctionnement de l'application et du reCAPTCHA.<br />
              Aucun suivi publicitaire sans consentement préalable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">9. Sécurité</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Transmission chiffrée via HTTPS</li>
              <li>Accès restreint et authentification sécurisée</li>
              <li>Sauvegardes régulières sur serveurs suisses</li>
            </ul>
          </section>

          <section className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mt-8">
            <h2 className="text-xl font-bold mb-4">Résumé</h2>
            <ul className="space-y-2 text-gray-800">
              <li>✅ <strong>Données hébergées en Suisse</strong></li>
              <li>✅ <strong>Vous restez propriétaire de vos données financières</strong></li>
              <li>✅ <strong>Pas de revente, pas d'accès sans demande de support</strong></li>
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
