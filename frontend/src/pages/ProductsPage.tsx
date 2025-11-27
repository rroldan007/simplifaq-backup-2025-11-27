import React, { useState } from 'react';
import { useProducts } from '../hooks/useProducts';
import { EnhancedProductList } from '../components/products/EnhancedProductList';
import { ProductForm } from '../components/products/ProductForm';
import { CSVImportProductsModal } from '../components/products/CSVImportProductsModal';
import type { CSVImportedProduct } from '../components/products/CSVImportProductsModal';

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
  } = useProducts();

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

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
    <div className="space-y-6 px-2 sm:px-4 md:px-6">
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
      />

      {/* CSV Import Modal */}
      <CSVImportProductsModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImportProducts}
      />
    </div>
  );
}