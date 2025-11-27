import { renderHook, waitFor, act } from '@testing-library/react';
import { useProducts } from '../useProducts';
import { api } from '../../services/api';

// Mock the API
jest.mock('../../services/api');
const mockApi = api as jest.Mocked<typeof api>;

// Local test type mirroring the Product shape from useProducts
interface TestProduct {
  id: string;
  name: string;
  description?: string;
  unitPrice: number;
  tvaRate: number;
  unit: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

describe('useProducts', () => {
  const mockProducts: TestProduct[] = [
    {
      id: '1',
      name: 'Consultation développement web',
      description: 'Consultation technique pour projets de développement web',
      unitPrice: 120,
      tvaRate: 8.1,
      unit: 'hour',
      isActive: true,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    },
    {
      id: '2',
      name: 'Formation React.js',
      description: 'Formation complète sur React.js pour développeurs',
      unitPrice: 800,
      tvaRate: 8.1,
      unit: 'day',
      isActive: false,
      createdAt: '2024-01-12T10:00:00Z',
      updatedAt: '2024-01-12T10:00:00Z'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.getProducts.mockResolvedValue({
      products: mockProducts,
      total: mockProducts.length,
      hasMore: false
    });
  });

  it('fetches products on mount', async () => {
    const { result } = renderHook(() => useProducts({ autoRefresh: false }));

    expect(result.current.loading).toBe(true);
    expect(result.current.products).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.products).toEqual(mockProducts);
    expect(result.current.total).toBe(2);
    expect(result.current.error).toBe(null);
    expect(mockApi.getProducts).toHaveBeenCalledWith({
      search: undefined,
      status: undefined,
      tvaRate: undefined,
      sortBy: undefined,
      sortOrder: undefined,
      limit: 50
    });
  });

  it('handles API errors gracefully', async () => {
    const errorMessage = 'Network error';
    mockApi.getProducts.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useProducts({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Erreur lors du chargement des produits');
    expect(result.current.products).toEqual([]);
  });

  it('creates product with optimistic update', async () => {
    const newProduct: TestProduct = {
      id: '3',
      name: 'Nouveau service',
      description: 'Description du nouveau service',
      unitPrice: 150,
      tvaRate: 8.1,
      unit: 'hour',
      isActive: true,
      createdAt: '2024-01-20T10:00:00Z',
      updatedAt: '2024-01-20T10:00:00Z'
    };

    mockApi.createProduct.mockResolvedValue(newProduct);

    const { result } = renderHook(() => useProducts({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const createData = {
      name: 'Nouveau service',
      description: 'Description du nouveau service',
      unitPrice: 150,
      tvaRate: 8.1,
      unit: 'hour',
      isActive: true
    };

    let createdProduct: TestProduct | null = null;
    await act(async () => {
      createdProduct = await result.current.createProduct(createData);
    });

    expect(createdProduct).toEqual(newProduct);
    expect(result.current.products).toHaveLength(3);
    expect(result.current.products[0]).toEqual(newProduct);
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].message).toBe('Produit créé avec succès');
    expect(result.current.notifications[0].type).toBe('success');
  });

  it('validates TVA rate during creation', async () => {
    const { result } = renderHook(() => useProducts({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const invalidData = {
      name: 'Test Product',
      unitPrice: 100,
      tvaRate: 15.5, // Invalid Swiss TVA rate
      unit: 'hour',
      isActive: true
    };

    let result_product: TestProduct | null = null;
    await act(async () => {
      result_product = await result.current.createProduct(invalidData);
    });

    expect(result_product).toBe(null);
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('error');
    expect(result.current.notifications[0].message).toContain('Taux de TVA invalide');
  });

  it('validates product data during creation', async () => {
    const { result } = renderHook(() => useProducts({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Test empty name
    const invalidData = {
      name: '',
      unitPrice: 100,
      tvaRate: 8.1,
      unit: 'hour',
      isActive: true
    };

    let result_product: TestProduct | null;
    await act(async () => {
      result_product = await result.current.createProduct(invalidData);
    });

    expect(result_product).toBe(null);
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('error');
    expect(result.current.notifications[0].message).toBe('Le nom du produit est requis');
  });

  it('validates unit price during creation', async () => {
    const { result } = renderHook(() => useProducts({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Test zero price
    const invalidData = {
      name: 'Test Product',
      unitPrice: 0,
      tvaRate: 8.1,
      unit: 'hour',
      isActive: true
    };

    let result_product: TestProduct | null = null;
    await act(async () => {
      result_product = await result.current.createProduct(invalidData);
    });

    expect(result_product).toBe(null);
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('error');
    expect(result.current.notifications[0].message).toBe('Le prix unitaire doit être supérieur à zéro');
  });

  it('updates product with optimistic update', async () => {
    const updatedProduct: TestProduct = {
      ...mockProducts[0],
      unitPrice: 150,
      updatedAt: '2024-01-16T10:00:00Z'
    };

    mockApi.updateProduct.mockResolvedValue(updatedProduct);

    const { result } = renderHook(() => useProducts({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updateData = { unitPrice: 150 };

    await act(async () => {
      await result.current.updateProduct('1', updateData);
    });

    expect(result.current.products[0].unitPrice).toBe(150);
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].message).toBe('Produit mis à jour avec succès');
  });

  it('deletes product with optimistic update', async () => {
    mockApi.deleteProduct.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useProducts({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteProduct('1');
    });

    expect(result.current.products).toHaveLength(1);
    expect(result.current.products[0].id).toBe('2');
    expect(result.current.total).toBe(1);
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].message).toBe('Produit supprimé avec succès');
  });

  it('duplicates product', async () => {
    const duplicatedProduct: TestProduct = {
      ...mockProducts[0],
      id: '3',
      name: 'Consultation développement web (Copie)',
      createdAt: '2024-01-16T10:00:00Z'
    };

    mockApi.duplicateProduct.mockResolvedValue(duplicatedProduct);

    const { result } = renderHook(() => useProducts({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let duplicated: TestProduct | null = null;
    await act(async () => {
      duplicated = await result.current.duplicateProduct('1');
    });

    expect(duplicated).toEqual(duplicatedProduct);
    expect(result.current.products).toHaveLength(3);
    expect(result.current.products[0]).toEqual(duplicatedProduct);
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].message).toBe('Produit dupliqué avec succès');
  });

  it('toggles product status', async () => {
    const updatedProduct = {
      ...mockProducts[1],
      isActive: true,
      updatedAt: '2024-01-16T10:00:00Z'
    };

    mockApi.updateProduct.mockResolvedValue(updatedProduct);

    const { result } = renderHook(() => useProducts({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.toggleProductStatus('2');
    });

    const updatedProductInState = result.current.products.find(p => p.id === '2');
    expect(updatedProductInState?.isActive).toBe(true);
    expect(result.current.notifications).toHaveLength(2); // Update success + toggle success
    expect(result.current.notifications[1].message).toBe('Produit activé avec succès');
  });

  it('searches products', async () => {
    const searchResults: TestProduct[] = [mockProducts[0]];
    mockApi.searchProducts.mockResolvedValue(searchResults);

    const { result } = renderHook(() => useProducts({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let searchResult: TestProduct[] = [];
    await act(async () => {
      searchResult = await result.current.searchProducts('Consultation');
    });

    expect(searchResult).toEqual(searchResults);
    expect(mockApi.searchProducts).toHaveBeenCalledWith('Consultation', 10);
  });

  it('handles operation errors with rollback', async () => {
    mockApi.deleteProduct.mockRejectedValue(new Error('Delete failed'));

    const { result } = renderHook(() => useProducts({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const originalLength = result.current.products.length;

    await act(async () => {
      await result.current.deleteProduct('1');
    });

    // Should rollback the optimistic update
    expect(result.current.products).toHaveLength(originalLength);
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('error');
    expect(result.current.notifications[0].message).toBe('Erreur lors de la suppression du produit');
  });

  it('tracks operation loading states', async () => {
    mockApi.deleteProduct.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
    );

    const { result } = renderHook(() => useProducts({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.deleteProduct('1');
    });

    expect(result.current.operationLoading['delete-1']).toBe(true);

    await waitFor(() => {
      expect(result.current.operationLoading['delete-1']).toBe(false);
    });
  });

  it('removes notifications', async () => {
    const { result } = renderHook(() => useProducts({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Create a notification
    await act(async () => {
      await result.current.createProduct({
        name: 'Test Product',
        unitPrice: 100,
        tvaRate: 8.1,
        unit: 'hour',
        isActive: true
      });
    });

    expect(result.current.notifications).toHaveLength(1);
    const notificationId = result.current.notifications[0].id;

    act(() => {
      result.current.removeNotification(notificationId);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('filters products by parameters', async () => {
    const { result } = renderHook(() => useProducts({ 
      search: 'Consultation',
      status: 'active',
      tvaRate: 8.1,
      autoRefresh: false 
    }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApi.getProducts).toHaveBeenCalledWith({
      search: 'Consultation',
      status: 'active',
      tvaRate: 8.1,
      sortBy: undefined,
      sortOrder: undefined,
      limit: 50
    });
  });

  it('validates description length', async () => {
    const { result } = renderHook(() => useProducts({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const invalidData = {
      name: 'Test Product',
      description: 'x'.repeat(1001), // Too long description
      unitPrice: 100,
      tvaRate: 8.1,
      unit: 'hour',
      isActive: true
    };

    let result_product: TestProduct | null = null;
    await act(async () => {
      result_product = await result.current.createProduct(invalidData);
    });

    expect(result_product).toBe(null);
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('error');
    expect(result.current.notifications[0].message).toBe('La description ne peut pas dépasser 1000 caractères');
  });

  it('validates maximum unit price', async () => {
    const { result } = renderHook(() => useProducts({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const invalidData = {
      name: 'Test Product',
      unitPrice: 1000000, // Too high price
      tvaRate: 8.1,
      unit: 'hour',
      isActive: true
    };

    let result_product: TestProduct | null = null;
    await act(async () => {
      result_product = await result.current.createProduct(invalidData);
    });

    expect(result_product).toBe(null);
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('error');
    expect(result.current.notifications[0].message).toBe('Le prix unitaire ne peut pas dépasser 999,999.99');
  });
});