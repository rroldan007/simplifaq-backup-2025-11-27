import React, { useState, useEffect, useRef } from 'react';
import { Package, Plus, ArrowRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../services/api';

interface ProductStepProps {
  onComplete: () => void;
}

export default function ProductStep({ onComplete }: ProductStepProps) {
  const navigate = useNavigate();
  const [hasProducts, setHasProducts] = useState(false);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const dataLoadedRef = useRef(false);

  useEffect(() => {
    if (!dataLoadedRef.current) {
      checkExistingProducts();
      dataLoadedRef.current = true;
    }
  }, []);

  const checkExistingProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/products');
      const data = response.data.data as { products?: unknown[] };
      const products = data.products || [];
      setProductCount(products.length);
      setHasProducts(products.length > 0);
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = () => {
    navigate('/products?create=true');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de vos produits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="bg-purple-600 rounded-full p-3">
            {hasProducts ? (
              <CheckCircle className="h-6 w-6 text-white" />
            ) : (
              <Package className="h-6 w-6 text-white" />
            )}
          </div>
          <div className="flex-1">
            {hasProducts ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  ✅ Vous avez {productCount} produit{productCount > 1 ? 's' : ''} !
                </h3>
                <p className="text-gray-600 mb-4">
                  Parfait ! Vous pouvez maintenant continuer ou ajouter plus de produits.
                </p>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          💡 <strong>Astuce:</strong> Vous pouvez créer autant de produits que vous voulez.
          Ils seront disponibles pour toutes vos futures factures.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        {!hasProducts && (
          <button
            type="button"
            onClick={handleCreateProduct}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium"
          >
            <Plus className="h-5 w-5" />
            Créer un produit
          </button>
        )}
        
        {hasProducts && (
          <>
            <button
              type="button"
              onClick={handleCreateProduct}
              className="px-6 py-3 text-purple-600 hover:text-purple-700 transition-colors font-medium"
            >
              Ajouter un autre
            </button>
            <button
              type="button"
              onClick={onComplete}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium"
            >
              Continuer
              <ArrowRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {!hasProducts && (
        <div className="text-center text-sm text-gray-500">
          Une fois votre produit créé, revenez ici pour continuer
        </div>
      )}
    </div>
  );
}
