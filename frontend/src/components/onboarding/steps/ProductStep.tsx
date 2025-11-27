import React from 'react';
import { ArrowRight, Package, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProductStepProps {
  onComplete: () => void;
}

export default function ProductStep({ onComplete }: ProductStepProps) {
  const navigate = useNavigate();

  const handleCreateProduct = () => {
    navigate('/products?create=true');
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="bg-purple-600 rounded-full p-3">
            <Package className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Créez votre premier produit ou service
            </h3>
            <p className="text-gray-600 mb-4">
              Les produits/services sont ce que vous facturez à vos clients.
              Créez-en un pour pouvoir générer des factures rapidement.
            </p>
            <div className="bg-white rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-gray-900">Informations nécessaires:</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                  Nom du produit/service
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                  Prix unitaire
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                  Taux de TVA
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                  Description (optionnelle)
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          💡 <strong>Astuce:</strong> Vous pouvez créer autant de produits que vous voulez.
          Ils seront disponibles pour toutes vos futures factures.
        </p>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={handleCreateProduct}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium"
        >
          <Plus className="h-5 w-5" />
          Créer un produit
        </button>
      </div>

      <div className="text-center text-sm text-gray-500">
        Une fois votre produit créé, revenez ici pour continuer
      </div>
    </div>
  );
}
