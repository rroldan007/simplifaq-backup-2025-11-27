/**
 * 🇨🇭 TVA Explanation Modal
 * 
 * Modal component that explains the different TVA categories,
 * especially the different types of 0% TVA available to users.
 */

import React from 'react';
import { Modal } from '../ui/Modal';
import { SwissTVACategory } from '../../hooks/useTVA';

interface TVAExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TVAExplanationModal: React.FC<TVAExplanationModalProps> = ({
  isOpen,
  onClose
}) => {
  const tvaCategories = [
    {
      category: SwissTVACategory.STANDARD,
      rate: '8.1%',
      title: 'Taux Normal',
      description: 'Taux standard pour la plupart des biens et services',
      examples: ['Services de conseil', 'Produits manufacturés', 'Services informatiques', 'Réparations'],
      color: 'bg-blue-50 border-blue-200 text-blue-800'
    },
    {
      category: SwissTVACategory.REDUCED,
      rate: '2.6%',
      title: 'Taux Réduit',
      description: 'Taux réduit pour les biens de première nécessité',
      examples: ['Produits alimentaires de base', 'Médicaments', 'Livres et journaux', 'Transports publics'],
      color: 'bg-green-50 border-green-200 text-green-800'
    },
    {
      category: SwissTVACategory.SPECIAL,
      rate: '3.8%',
      title: 'Taux Spécial',
      description: 'Taux spécial pour les prestations d\'hébergement',
      examples: ['Hôtels et auberges', 'Restaurants', 'Cafés et bars', 'Services de restauration'],
      color: 'bg-yellow-50 border-yellow-200 text-yellow-800'
    },
    {
      category: SwissTVACategory.EXEMPT,
      rate: '0%',
      title: 'Non applicable',
      description: 'Services exonérés de TVA par la loi suisse',
      examples: ['Services médicaux', 'Services d\'éducation', 'Assurances', 'Services bancaires de base'],
      color: 'bg-gray-50 border-gray-200 text-gray-800',
      isZeroPercent: true
    },
    {
      category: SwissTVACategory.NOT_SUBJECT,
      rate: '0%',
      title: 'Non Assujetti',
      description: 'Prestations non assujetties à la TVA suisse',
      examples: ['Exportations', 'Services internationaux', 'Prestations à l\'étranger', 'Ventes hors Suisse'],
      color: 'bg-purple-50 border-purple-200 text-purple-800',
      isZeroPercent: true
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Guide des Taux de TVA Suisse"
      size="lg"
    >
      <div className="space-y-6">
        {/* Introduction */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Choisissez le bon taux de TVA</strong><br />
                Sélectionnez la catégorie qui correspond à votre prestation pour respecter la législation suisse.
              </p>
            </div>
          </div>
        </div>

        {/* TVA Categories */}
        <div className="grid gap-4">
          {tvaCategories.map((category) => (
            <div
              key={category.category}
              className={`border rounded-lg p-4 ${category.color}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{category.title}</h3>
                  <p className="text-sm opacity-80">{category.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{category.rate}</div>
                  {category.isZeroPercent && (
                    <div className="text-xs font-medium">TVA 0%</div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Exemples d'application :</h4>
                <ul className="text-sm space-y-1">
                  {category.examples.map((example, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-current rounded-full mr-2 opacity-60"></span>
                      {example}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Special Section for 0% TVA */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-800 mb-3">
            ⚠️ Différence entre "Non applicable" et "Non Assujetti"
          </h3>
          <div className="space-y-3 text-sm text-amber-700">
            <div>
              <strong>Non applicable (0%) :</strong> Services qui sont légalement exonérés de TVA en Suisse 
              (santé, éducation, assurances). Vous ne facturez pas de TVA et ne pouvez pas déduire la TVA sur vos achats liés.
            </div>
            <div>
              <strong>Non Assujetti (0%) :</strong> Prestations qui ne sont pas soumises à la TVA suisse 
              (exportations, services à l'étranger). Vous ne facturez pas de TVA mais pouvez déduire la TVA sur vos achats liés.
            </div>
          </div>
        </div>

        {/* Automatic Exemption Notice */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">
            ✅ Exonération Automatique
          </h3>
          <p className="text-sm text-green-700">
            Si votre chiffre d'affaires annuel est inférieur à 100'000 CHF, vous êtes automatiquement 
            exonéré de TVA. Le système appliquera automatiquement 0% TVA à toutes vos factures.
          </p>
        </div>

        {/* Legal Disclaimer */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-2">
            📋 Avertissement Légal
          </h3>
          <p className="text-xs text-gray-600">
            Cette information est fournie à titre indicatif. Pour des questions spécifiques concernant 
            l'application de la TVA à vos prestations, consultez un expert-comptable ou l'Administration 
            fédérale des contributions (AFC). SimpliFaq ne peut être tenu responsable d'erreurs dans 
            l'application des taux de TVA.
          </p>
        </div>
      </div>
    </Modal>
  );
};