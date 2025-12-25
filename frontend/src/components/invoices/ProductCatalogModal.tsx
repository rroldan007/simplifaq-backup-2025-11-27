import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Package, Check, Barcode } from 'lucide-react';
import { Button } from '../ui/Button';

interface Product {
  id: string;
  name: string;
  sku?: string;
  unitPrice: number;
  tvaRate: number;
  unit?: string;
  isActive?: boolean;
}

interface ProductCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onAddProducts: (products: Product[]) => void;
  currency?: string;
}

export function ProductCatalogModal({
  isOpen,
  onClose,
  products,
  onAddProducts,
  currency = 'CHF'
}: ProductCatalogModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [barcodeMode, setBarcodeMode] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const barcodeBufferRef = useRef('');
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (barcodeMode) {
          barcodeInputRef.current?.focus();
        } else {
          searchInputRef.current?.focus();
        }
      }, 100);
    }
  }, [isOpen, barcodeMode]);

  // Filter products by search query (name or SKU)
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products.filter(p => p.isActive !== false);
    
    const query = searchQuery.toLowerCase().trim();
    return products
      .filter(p => p.isActive !== false)
      .filter(p => 
        p.name.toLowerCase().includes(query) ||
        (p.sku && p.sku.toLowerCase().includes(query))
      );
  }, [products, searchQuery]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-CH', { 
      style: 'currency', 
      currency 
    }).format(price);
  };

  const toggleProduct = (productId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    const allIds = new Set(filteredProducts.map(p => p.id));
    setSelectedIds(allIds);
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleConfirm = () => {
    const selectedProducts = products.filter(p => selectedIds.has(p.id));
    onAddProducts(selectedProducts);
    setSelectedIds(new Set());
    setSearchQuery('');
    onClose();
  };

  // Handle barcode scanner input (rapid character input)
  const handleBarcodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    barcodeBufferRef.current = value;
    
    // Clear previous timeout
    if (barcodeTimeoutRef.current) {
      clearTimeout(barcodeTimeoutRef.current);
    }
    
    // Set timeout to process barcode after 100ms of no input
    barcodeTimeoutRef.current = setTimeout(() => {
      const sku = barcodeBufferRef.current.trim();
      if (sku) {
        // Find product by SKU
        const product = products.find(p => 
          p.sku?.toLowerCase() === sku.toLowerCase() ||
          p.sku === sku
        );
        
        if (product) {
          // Add immediately and clear
          onAddProducts([product]);
          barcodeBufferRef.current = '';
          if (barcodeInputRef.current) {
            barcodeInputRef.current.value = '';
          }
        }
      }
    }, 100);
  };

  // Handle Enter key in barcode mode
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const sku = (e.target as HTMLInputElement).value.trim();
      
      if (sku) {
        const product = products.find(p => 
          p.sku?.toLowerCase() === sku.toLowerCase() ||
          p.sku === sku
        );
        
        if (product) {
          onAddProducts([product]);
          (e.target as HTMLInputElement).value = '';
          barcodeBufferRef.current = '';
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-3xl max-h-[85vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Package className="w-6 h-6 text-blue-600" />
                Catalogue de produits
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Sélectionnez les produits à ajouter à la facture
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Mode Toggle */}
          <div className="px-6 py-4 border-b border-slate-100 space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setBarcodeMode(false)}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  !barcodeMode 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Search className="w-4 h-4" />
                Recherche manuelle
              </button>
              <button
                onClick={() => setBarcodeMode(true)}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  barcodeMode 
                    ? 'bg-green-600 text-white shadow-md' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Barcode className="w-4 h-4" />
                Scanner code-barres
              </button>
            </div>

            {barcodeMode ? (
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  onChange={handleBarcodeInput}
                  onKeyDown={handleBarcodeKeyDown}
                  placeholder="Scannez un code-barres ou entrez le SKU..."
                  className="w-full pl-10 pr-4 py-3 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-green-50 text-lg font-mono"
                  autoComplete="off"
                />
                <p className="mt-2 text-xs text-green-700 bg-green-100 px-3 py-2 rounded">
                  Mode scanner actif: scannez un code-barres pour ajouter directement le produit à la facture
                </p>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par nom ou SKU..."
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {!barcodeMode && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''} trouvé{filteredProducts.length !== 1 ? 's' : ''}
                  {selectedIds.size > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                      {selectedIds.size} sélectionné{selectedIds.size !== 1 ? 's' : ''}
                    </span>
                  )}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Tout sélectionner
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={deselectAll}
                    className="text-slate-500 hover:text-slate-700 hover:underline"
                  >
                    Tout désélectionner
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Product List */}
          {!barcodeMode && (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">Aucun produit trouvé</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Essayez une autre recherche
                  </p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {filteredProducts.map((product) => {
                    const isSelected = selectedIds.has(product.id);
                    return (
                      <motion.button
                        key={product.id}
                        type="button"
                        onClick={() => toggleProduct(product.id)}
                        whileHover={{ scale: 1.005 }}
                        whileTap={{ scale: 0.995 }}
                        className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {/* Checkbox */}
                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected 
                            ? 'bg-blue-600 border-blue-600' 
                            : 'border-slate-300'
                        }`}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-800 truncate">
                            {product.name}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            {product.sku && (
                              <span className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">
                                {product.sku}
                              </span>
                            )}
                            <span>TVA {product.tvaRate}%</span>
                            {product.unit && <span>• {product.unit}</span>}
                          </div>
                        </div>

                        {/* Price */}
                        <div className="text-right flex-shrink-0">
                          <div className="font-semibold text-slate-800">
                            {formatPrice(product.unitPrice)}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          {!barcodeMode && (
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
              <Button variant="secondary" onClick={onClose}>
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirm}
                disabled={selectedIds.size === 0}
              >
                Ajouter {selectedIds.size > 0 ? `(${selectedIds.size})` : ''} à la facture
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
