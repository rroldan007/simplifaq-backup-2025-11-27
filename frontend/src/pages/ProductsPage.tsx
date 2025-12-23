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
  isService: boolean;
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
    // Count services using the isService flag
    const services = products.filter((p) => (p as { isService?: boolean }).isService === true).length;
    return { total, active, inactive: total - active, services };
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Hero Header */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-transparent to-blue-500/5 pointer-events-none" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Header Row */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-violet-600 bg-violet-100 rounded-full">
                <Sparkles className="w-3.5 h-3.5" />
                Catalogue intelligent
              </div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <Package className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-800">Produits & Services</h1>
                  <p className="text-slate-500 mt-0.5">Centralisez vos tarifs, unités et TVA</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
              <button
                onClick={() => setIsImportOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-sm"
              >
                <Upload className="w-4 h-4" />
                Importer CSV
              </button>
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 rounded-xl shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4" />
                Nouveau produit
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Catalogue Total */}
            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-[40px]" />
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-blue-600">Catalogue total</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-800">{stats.total}</span>
                <span className="text-sm text-slate-500">éléments</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">{stats.active} actifs • {stats.inactive} brouillons</p>
            </div>

            {/* Services */}
            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-500/10 to-transparent rounded-bl-[40px]" />
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-amber-600">Services</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-800">{stats.services}</span>
                <span className="text-sm text-slate-500">entrées</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">{Math.round((stats.services / Math.max(stats.total, 1)) * 100)}% du catalogue</p>
            </div>

            {/* Activation */}
            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-violet-500/10 to-transparent rounded-bl-[40px]" />
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-violet-600">Activation</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-800">
                  {Math.round((stats.active / Math.max(stats.total, 1)) * 100)}%
                </span>
                <span className="text-sm text-slate-500">actifs</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Optimisez vos fiches inactives</p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Tip Card */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-50 to-violet-50/50 rounded-2xl border border-slate-200/60 p-6">
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-violet-100/50 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Conseil express</p>
                <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                  Harmonisez les unités, couleurs et descriptions pour retrouver rapidement vos services dans les Factures et Devis.
                  Vous pouvez importer des tarifs existants ou dupliquer un produit populaire.
                </p>
              </div>
            </div>
            <button 
              onClick={handleExportProducts}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-sm whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exporter le catalogue
            </button>
          </div>
        </div>

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