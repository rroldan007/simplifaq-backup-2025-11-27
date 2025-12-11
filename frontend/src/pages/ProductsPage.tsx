import React, { useMemo, useState } from 'react';
import { Package, Plus, Upload, RefreshCw, Sparkles } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { EnhancedProductList } from '../components/products/EnhancedProductList';
import { ProductForm } from '../components/products/ProductForm';
import { CSVImportProductsModal } from '../components/products/CSVImportProductsModal';
import type { CSVImportedProduct } from '../components/products/CSVImportProductsModal';
import { NotificationContainer } from '../components/ui/Notification';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface ProductFormData {
  name: string;
  description?: string;
  unitPrice: number;
  tvaRate: number;
  unit: string;
  isActive: boolean;
  discountValue?: number;
  discountType?: 'PERCENT' | 'AMOUNT';
  discountActive: boolean;
}

export function ProductsPage() {
  const {
    products,
    loading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
    duplicateProduct,
    operationLoading,
    refreshProducts,
    notifications,
    removeNotification,
  } = useProducts();

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.isActive).length;
    const services = products.filter((p) =>
      ['heure', 'h', 'hour', 'service', 'consultation', 'forfait'].includes(p.unit.toLowerCase())
    ).length;
    const catalogValue = products.reduce((sum, p) => sum + (p.unitPrice || 0), 0);
    const averagePrice = total ? catalogValue / total : 0;
    return { total, active, inactive: total - active, services, catalogValue, averagePrice };
  }, [products]);

  const handleImportProducts = async (products: CSVImportedProduct[]) => {
    // Import sequentially to keep notifications readable
    for (const p of products) {
      await createProduct({
        name: p.name,
        description: p.description,
        unitPrice: p.unitPrice,
        tvaRate: p.tvaRate,
        unit: p.unit,
        isActive: p.isActive,
        discountActive: false,
      });
    }
  };

  const handleCreateNew = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleEdit = (productId: string) => {
    setEditingProduct(productId);
    setShowForm(true);
  };

  const handleFormSubmit = async (data: ProductFormData) => {
    console.log('[ProductsPage] handleFormSubmit called with data:', data);
    console.log('[ProductsPage] editingProduct:', editingProduct);
    try {
      if (editingProduct) {
        console.log('[ProductsPage] Calling updateProduct...');
        const result = await updateProduct(editingProduct, data);
        console.log('[ProductsPage] updateProduct result:', result);
      } else {
        console.log('[ProductsPage] Calling createProduct...');
        const result = await createProduct(data);
        console.log('[ProductsPage] createProduct result:', result);
      }
      console.log('[ProductsPage] Closing form...');
      setShowForm(false);
      setEditingProduct(null);
    } catch (error) {
      // Error handling is done in the hook
      console.error('[ProductsPage] Form submission error:', error);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  const handleDelete = async (productId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      await deleteProduct(productId);
    }
  };

  const handleDuplicate = async (productId: string) => {
    await duplicateProduct(productId);
  };

  // Export products to CSV
  const handleExportProducts = () => {
    const headers = ['Name','Description','UnitPrice','TVA','Unit','Active'];
    const rows = products.map(p => [
      p.name || '',
      p.description || '',
      String(p.unitPrice ?? ''),
      String(p.tvaRate ?? ''),
      p.unit || '',
      p.isActive ? 'yes' : 'no'
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0,10);
    a.download = `catalogue-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const editingProductData = editingProduct 
    ? products.find(p => p.id === editingProduct)
    : undefined;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshProducts();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Show form view
  if (showForm) {
    return (
      <div
        className="min-h-screen"
        style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
      >
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <ProductForm
            initialData={editingProductData}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            loading={operationLoading[`${editingProduct ? 'update' : 'create'}-${editingProduct || 'new'}`]}
            mode={editingProduct ? 'edit' : 'create'}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <section className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-sm font-medium text-blue-600">
                <Sparkles className="w-4 h-4" />
                Catalogue intelligent
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Produits & Services</h1>
                  <p className="text-slate-600">Centralisez vos tarifs, unités et TVA dans un espace élégant</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="min-w-[130px]"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsImportOpen(true)}
                className="min-w-[150px]"
              >
                <Upload className="w-4 h-4 mr-2" />
                Importer CSV
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateNew}
                className="min-w-[170px]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouveau produit
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
              <p className="text-sm text-blue-700 font-medium">Catalogue total</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-3xl font-bold text-blue-900">{stats.total}</span>
                <span className="text-sm text-blue-600">éléments</span>
              </div>
              <p className="text-xs text-blue-500 mt-1">{stats.active} actifs • {stats.inactive} brouillons</p>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
              <p className="text-sm text-emerald-700 font-medium">Valeur catalogue</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-3xl font-bold text-emerald-900">
                  {stats.catalogValue.toLocaleString('fr-CH', { style: 'currency', currency: 'CHF' })}
                </span>
              </div>
              <p className="text-xs text-emerald-600 mt-1">Prix moyen {stats.averagePrice.toFixed(2)} CHF</p>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200">
              <p className="text-sm text-orange-700 font-medium">Services</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-3xl font-bold text-orange-900">{stats.services}</span>
                <span className="text-sm text-orange-600">entrées</span>
              </div>
              <p className="text-xs text-orange-600 mt-1">{Math.round((stats.services / Math.max(stats.total, 1)) * 100)}% du catalogue</p>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
              <p className="text-sm text-slate-700 font-medium">Activation</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-3xl font-bold text-slate-900">
                  {Math.round((stats.active / Math.max(stats.total, 1)) * 100)}%
                </span>
                <span className="text-sm text-slate-600">actifs</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Optimisez vos fiches inactives pour gagner du temps</p>
            </Card>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Card className="p-6 shadow-sm border border-slate-200 bg-white/90">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-700">Conseil express</p>
              <p className="text-slate-500 mt-1 max-w-2xl">
                Harmonisez les unités, couleurs et descriptions pour retrouver rapidement vos services dans les Factures et Devis.
                Vous pouvez importer des tarifs existants ou dupliquer un produit populaire pour gagner du temps.
              </p>
            </div>
            <Button variant="secondary" onClick={handleExportProducts}>
              <Package className="w-4 h-4 mr-2" />
              Exporter le catalogue
            </Button>
          </div>
        </Card>

        <EnhancedProductList
          products={products}
          loading={loading}
          error={error}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onCreateNew={handleCreateNew}
          currency="CHF"
          onOpenImport={() => setIsImportOpen(true)}
          onExport={handleExportProducts}
          showInsights={false}
        />
      </div>

      {/* CSV Import Modal */}
      <CSVImportProductsModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImportProducts}
      />

      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
        position="top-right"
      />
    </div>
  );
}