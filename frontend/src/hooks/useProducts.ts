import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '../services/api';
import { CURRENT_SWISS_TVA_RATES } from '../config/swissTaxRates';
import { normalizeString } from '../utils/textUtils';

// Shared tolerant-search state across all hook instances
let SHARED_SEARCH_CACHE: { items: Product[]; ts: number } | null = null;
let SHARED_LAST_FETCH_AT = 0;
let SHARED_INFLIGHT_FETCH: Promise<Product[] | null> | null = null;

// Helpers to access shared state without 'any'-typed refs
const getSharedCache = (): { items: Product[]; ts: number } | null => SHARED_SEARCH_CACHE;
const setSharedCache = (v: { items: Product[]; ts: number } | null): void => { SHARED_SEARCH_CACHE = v; };
const getLastFetchAt = (): number => SHARED_LAST_FETCH_AT;
const setLastFetchAt = (v: number): void => { SHARED_LAST_FETCH_AT = v; };
const getInflightFetch = (): Promise<Product[] | null> | null => SHARED_INFLIGHT_FETCH;
const setInflightFetch = (v: Promise<Product[] | null> | null): void => { SHARED_INFLIGHT_FETCH = v; };

interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  unitPrice: number;
  tvaRate: number;
  unit: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateProductRequest {
  name: string;
  description?: string;
  unitPrice: number;
  tvaRate: number;
  unit: string;
  isService?: boolean;
  isActive: boolean;
  discountValue?: number;
  discountType?: 'PERCENT' | 'AMOUNT';
  discountActive: boolean;
}

type UpdateProductRequest = Partial<CreateProductRequest>;

interface UseProductsParams {
  search?: string;
  status?: 'active' | 'inactive';
  tvaRate?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseProductsState {
  products: Product[];
  loading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  lastUpdated: Date | null;
}

interface NotificationState {
  message: string;
  type: 'success' | 'error' | 'info';
  id: string;
}

export function useProducts(params: UseProductsParams = {}) {
  const [state, setState] = useState<UseProductsState>({
    products: [],
    loading: true,
    error: null,
    total: 0,
    hasMore: false,
    lastUpdated: null,
  });

  const [notifications, setNotifications] = useState<NotificationState[]>([]);
  const [operationLoading, setOperationLoading] = useState<Record<string, boolean>>({});
  // Local normalizer to guarantee numeric fields
  const normalizeProduct = useCallback((p: Product): Product => {
    const toNumber = (v: unknown): number => {
      if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
      if (typeof v === 'string') {
        const n = parseFloat(v.replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
      }
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    return {
      ...p,
      unitPrice: toNumber((p as unknown as { unitPrice: unknown }).unitPrice),
      tvaRate: toNumber((p as unknown as { tvaRate: unknown }).tvaRate),
    } as Product;
  }, []);
  // Use shared cache and inflight/coalescer for tolerant search (via helpers)

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `notification-${Date.now()}`;
    const notification: NotificationState = { message, type, id };

    setNotifications(prev => [...prev, notification]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);

    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const fetchProducts = useCallback(async (showLoading = true) => {
    console.log('[useProducts] fetchProducts called. showLoading:', showLoading);
    try {
      if (showLoading) {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }

      const response = await api.getProducts({
        search: params.search,
        status: params.status,
        tvaRate: params.tvaRate,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        limit: 50, // Load more products for better UX
      });

      const normalizedProducts: Product[] = Array.isArray(response.products)
        ? (response.products as Product[]).map((p) => normalizeProduct(p as Product))
        : [];

      setState(prev => ({
        ...prev,
        products: normalizedProducts,
        total: response.total,
        hasMore: response.hasMore,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      }));
    } catch (error) {
      const errorMessage = error instanceof ApiError
        ? error.message
        : 'Erreur lors du chargement des produits';

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, [params.search, params.status, params.tvaRate, params.sortBy, params.sortOrder, normalizeProduct]);

  const validateTvaRate = useCallback((tvaRate: number): string[] => {
    const errors: string[] = [];

    const validRates = CURRENT_SWISS_TVA_RATES.map(rate => rate.value);
    if (!validRates.includes(tvaRate)) {
      errors.push('Taux de TVA invalide. Utilisez un taux suisse valide.');
    }

    return errors;
  }, []);

  const validateProduct = useCallback((data: CreateProductRequest | UpdateProductRequest): string[] => {
    const errors: string[] = [];

    if ('name' in data && data.name !== undefined) {
      if (!data.name.trim()) {
        errors.push('Le nom du produit est requis');
      }
      if (data.name.length > 255) {
        errors.push('Le nom du produit ne peut pas dépasser 255 caractères');
      }
    }

    if ('unitPrice' in data && data.unitPrice !== undefined) {
      if (data.unitPrice < 0) {
        errors.push('Le prix unitaire ne peut pas être négatif');
      }
      if (data.unitPrice === 0) {
        errors.push('Le prix unitaire doit être supérieur à zéro');
      }
      if (data.unitPrice > 999999.99) {
        errors.push('Le prix unitaire ne peut pas dépasser 999,999.99');
      }
    }

    if ('tvaRate' in data && data.tvaRate !== undefined) {
      const tvaErrors = validateTvaRate(data.tvaRate);
      errors.push(...tvaErrors);
    }

    if ('description' in data && data.description !== undefined && data.description !== null && data.description.length > 1000) {
      errors.push('La description ne peut pas dépasser 1000 caractères');
    }

    return errors;
  }, [validateTvaRate]);

  const createProduct = useCallback(async (data: CreateProductRequest): Promise<Product | null> => {
    const operationId = 'create';
    setOperationLoading(prev => ({ ...prev, [operationId]: true }));

    try {
      // Frontend validation
      const validationErrors = validateProduct(data);
      if (validationErrors.length > 0) {
        showNotification(validationErrors[0], 'error');
        return null;
      }

      const newProductRaw = await api.createProduct(data);
      const newProduct = newProductRaw ? normalizeProduct(newProductRaw as Product) : null;

      // Optimistic update
      if (newProduct) {
        setState(prev => ({
          ...prev,
          products: [newProduct, ...prev.products],
          total: prev.total + 1,
        }));
      }

      showNotification('Produit créé avec succès', 'success');
      return newProduct;
    } catch (error) {
      const errorMessage = error instanceof ApiError
        ? error.message
        : 'Erreur lors de la création du produit';

      showNotification(errorMessage, 'error');
      return null;
    } finally {
      setOperationLoading(prev => ({ ...prev, [operationId]: false }));
    }
  }, [showNotification, validateProduct, normalizeProduct]);

  const updateProduct = useCallback(async (id: string, data: UpdateProductRequest): Promise<Product | null> => {
    console.log('[useProducts] updateProduct called with id:', id, 'data:', data);
    const operationId = `update-${id}`;
    setOperationLoading(prev => ({ ...prev, [operationId]: true }));

    // Store original product for rollback
    const originalProduct = state.products.find(product => product.id === id);
    console.log('[useProducts] originalProduct:', originalProduct);

    try {
      // Frontend validation
      console.log('[useProducts] Running validation...');
      let validationErrors: string[] = [];
      try {
        validationErrors = validateProduct(data);
        console.log('[useProducts] Validation errors:', validationErrors);
      } catch (validationError) {
        console.error('[useProducts] Validation function threw error:', validationError);
        showNotification('Erreur de validation', 'error');
        return null;
      }
      if (validationErrors.length > 0) {
        console.log('[useProducts] Validation failed, showing notification');
        showNotification(validationErrors[0], 'error');
        return null;
      }

      // Optimistic update
      console.log('[useProducts] Applying optimistic update...');
      setState(prev => ({
        ...prev,
        products: prev.products.map(product =>
          product.id === id
            ? { ...product, ...data, updatedAt: new Date().toISOString() }
            : product
        ),
      }));

      console.log('[useProducts] Calling api.updateProduct...');
      const updatedProductRaw = await api.updateProduct(id, data);
      console.log('[useProducts] api.updateProduct returned:', updatedProductRaw);
      const updatedProduct = updatedProductRaw ? normalizeProduct(updatedProductRaw as Product) : null;
      console.log('[useProducts] Normalized product:', updatedProduct);

      // Update with server response
      if (updatedProduct) {
        setState(prev => ({
          ...prev,
          products: prev.products.map(product =>
            product.id === id ? updatedProduct : product
          ),
        }));
      }

      showNotification('Produit mis à jour avec succès', 'success');
      return updatedProduct;
    } catch (error) {
      // Rollback optimistic update
      if (originalProduct) {
        setState(prev => ({
          ...prev,
          products: prev.products.map(product =>
            product.id === id ? originalProduct : product
          ),
        }));
      }

      const errorMessage = error instanceof ApiError
        ? error.message
        : 'Erreur lors de la mise à jour du produit';

      showNotification(errorMessage, 'error');
      return null;
    } finally {
      setOperationLoading(prev => ({ ...prev, [operationId]: false }));
    }
  }, [state.products, showNotification, validateProduct, normalizeProduct]);

  const deleteProduct = useCallback(async (id: string): Promise<boolean> => {
    const operationId = `delete-${id}`;
    setOperationLoading(prev => ({ ...prev, [operationId]: true }));

    // Store original product for rollback
    const originalProduct = state.products.find(product => product.id === id);

    try {
      // Optimistic update
      setState(prev => ({
        ...prev,
        products: prev.products.filter(product => product.id !== id),
        total: prev.total - 1,
      }));

      await api.deleteProduct(id);
      showNotification('Produit supprimé avec succès', 'success');
      return true;
    } catch (error) {
      // Rollback optimistic update
      if (originalProduct) {
        setState(prev => ({
          ...prev,
          products: [...prev.products, originalProduct].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ),
          total: prev.total + 1,
        }));
      }

      const errorMessage = error instanceof ApiError
        ? error.message
        : 'Erreur lors de la suppression du produit';

      showNotification(errorMessage, 'error');
      return false;
    } finally {
      setOperationLoading(prev => ({ ...prev, [operationId]: false }));
    }
  }, [state.products, showNotification]);

  const duplicateProduct = useCallback(async (id: string): Promise<Product | null> => {
    const operationId = `duplicate-${id}`;
    setOperationLoading(prev => ({ ...prev, [operationId]: true }));

    try {
      const duplicatedProductRaw = await api.duplicateProduct(id);
      const duplicatedProduct = duplicatedProductRaw ? normalizeProduct(duplicatedProductRaw as Product) : null;

      // Add to list
      if (duplicatedProduct) {
        setState(prev => ({
          ...prev,
          products: [duplicatedProduct, ...prev.products],
          total: prev.total + 1,
        }));
      }

      showNotification('Produit dupliqué avec succès', 'success');
      return duplicatedProduct;
    } catch (error) {
      const errorMessage = error instanceof ApiError
        ? error.message
        : 'Erreur lors de la duplication du produit';

      showNotification(errorMessage, 'error');
      return null;
    } finally {
      setOperationLoading(prev => ({ ...prev, [operationId]: false }));
    }
  }, [showNotification, normalizeProduct]);

  const toggleProductStatus = useCallback(async (id: string): Promise<boolean> => {
    const product = state.products.find(p => p.id === id);
    if (!product) return false;

    const newStatus = !product.isActive;
    const result = await updateProduct(id, { isActive: newStatus });

    if (result) {
      const statusText = newStatus ? 'activé' : 'désactivé';
      showNotification(`Produit ${statusText} avec succès`, 'success');
      return true;
    }

    return false;
  }, [state.products, updateProduct, showNotification]);

  const searchProducts = useCallback(async (query: string, limit = 10): Promise<Product[]> => {
    // Helper: normalize strings (remove accents/diacritics, lowercase, collapse spaces)
    const normalize = normalizeString;

    // Helper: compute relevance score and number of token matches
    // - matches: soft matches (prefix/whole/substring) for ranking
    // - wordMatches: strict word-level matches used for full-match filtering
    const scoreProduct = (q: string, p: Product): { score: number; matches: number; wordMatches: number } => {
      const nq = normalize(q);
      if (!nq) return { score: 0, matches: 0, wordMatches: 0 };
      const tokens = nq.split(' ').filter(Boolean);
      const candidate = normalize(`${p.name} ${p.description || ''} ${p.unit || ''}`);
      if (!candidate) return { score: 0, matches: 0, wordMatches: 0 };
      const candWords = candidate.split(' ').filter(Boolean);

      let score = 0;
      let matches = 0;
      let wordMatches = 0;
      // Full query startsWith / includes bonuses
      if (candidate.startsWith(nq)) score += 8;
      if (candidate.includes(nq)) score += 4;

      for (const t of tokens) {
        if (t.length <= 1) continue; // ignore ultra-short tokens
        let matchedThisToken = false;
        if (candidate.startsWith(t + ' ')) { score += 5; matchedThisToken = true; }
        if (candidate.includes(' ' + t + ' ')) { score += 4; matchedThisToken = true; }
        if (!matchedThisToken && candidate.includes(t)) { score += 3; matchedThisToken = true; }
        if (matchedThisToken) matches += 1;
        // strict word match count
        if (candWords.includes(t)) wordMatches += 1;
      }

      // Small bonus when multiple tokens match
      if (matches >= 2) score += 3;
      if (matches >= 3) score += 2;

      return { score, matches, wordMatches };
    };

    try {
      // Tunable thresholds for multi-token prioritization (local to search)
      const MULTI_TOKEN_PREFERRED = 3; // Prefer results matching >= 3 tokens
      const MULTI_TOKEN_FALLBACK = 2; // If none, allow those matching >= 2 tokens
      // Always use local tolerant matching on a cached batch for consistency
      const now = Date.now();
      const TTL = 60 * 1000; // 60s cache TTL
      let batch: Product[] | undefined;
      const cache = getSharedCache();
      if (cache && Array.isArray(cache.items) && Number.isFinite(cache.ts) && now - cache.ts < TTL) {
        batch = cache.items as Product[];
        try { console.debug('[searchProducts] using cached batch', { size: batch.length, ageMs: now - cache.ts }); } catch { /* noop */ }
      } else {
        // Basic rate limit: avoid hitting backend too often under typing bursts
        const minInterval = 1500; // ms
        if (now - getLastFetchAt() < minInterval) {
          // Use whatever we have locally
          if (cache && Array.isArray(cache.items) && cache.items.length > 0) {
            batch = cache.items as Product[];
            try { console.debug('[searchProducts] rate-limited: using cached batch', { size: batch.length }); } catch { /* noop */ }
          } else if (state.products && state.products.length > 0) {
            batch = state.products as Product[];
            try { console.debug('[searchProducts] rate-limited: using STATE products', { size: batch.length }); } catch { /* noop */ }
          }
        }

        if (!batch) {
          // Coalesce concurrent fetches
          if (getInflightFetch()) {
            try { console.debug('[searchProducts] awaiting inflight fetch'); } catch { /* noop */ }
            const res = await getInflightFetch();
            batch = Array.isArray(res) ? res : undefined;
          } else {
            setInflightFetch((async () => {
              const batchLimit = 500; // fetch a broader slice
              const [respActive, respInactive] = await Promise.all([
                api.getProducts({ limit: batchLimit, status: 'active' }).catch(() => null),
                api.getProducts({ limit: batchLimit, status: 'inactive' }).catch(() => null),
              ]);
              type ProductsResponseLike = { products?: unknown };
              const extractProducts = (resp: unknown): Product[] => {
                if (resp && typeof resp === 'object' && Array.isArray((resp as ProductsResponseLike).products)) {
                  return ((resp as ProductsResponseLike).products as unknown[]).filter((x): x is Product => !!x) as Product[];
                }
                return [];
              };
              const listActive = extractProducts(respActive);
              const listInactive = extractProducts(respInactive);
              const merged = new Map<string, Product>();
              for (const p of listActive) merged.set(p.id, p);
              for (const p of listInactive) if (!merged.has(p.id)) merged.set(p.id, p);
              const arr = Array.from(merged.values());
              try { console.debug('[searchProducts] fetched new batch', { active: listActive.length, inactive: listInactive.length, merged: arr.length }); } catch { /* noop */ }
              return arr;
            })());

            try {
              const res = await getInflightFetch();
              setLastFetchAt(Date.now());
              setInflightFetch(null);
              batch = Array.isArray(res) ? res : undefined;
            } catch {
              setInflightFetch(null);
            }
          }
        }

        // Fallbacks when batch is empty or undefined
        // If fetch returned empty (rate limit or no data), fallback to stale cache if present
        if ((!batch || batch.length === 0) && cache && Array.isArray(cache.items) && cache.items.length > 0) {
          batch = cache.items as Product[];
          try { console.debug('[searchProducts] using STALE cache due to empty fetch', { size: batch.length }); } catch { /* noop */ }
        }
        // If still empty, fallback to in-memory state products
        if ((!batch || batch.length === 0) && Array.isArray(state.products) && state.products.length > 0) {
          batch = state.products as Product[];
          try { console.debug('[searchProducts] using STATE products as emergency batch', { size: batch.length }); } catch { /* noop */ }
        }
        // Only overwrite cache if we actually have items
        if (batch && batch.length > 0) {
          setSharedCache({ items: batch, ts: now });
        } else {
          try { console.debug('[searchProducts] no batch available after fetch and no cache to fallback'); } catch { /* noop */ }
        }
      }

      if (!batch || batch.length === 0) {
        // As a last resort, try API search directly (may be strict)
        const apiResults = await api.searchProducts(query, limit).catch(() => []);
        return Array.isArray(apiResults) ? apiResults.map(normalizeProduct) : [];
      }

      // Score and sort locally
      const tokensForFilterAll = normalize(query).split(' ').filter(Boolean);
      const tokensSig = tokensForFilterAll.filter(t => t.length >= 2);
      const scoredRaw = batch
        .map(p => {
          const { score, matches, wordMatches } = scoreProduct(query, p as Product);
          return { p, s: score, m: matches, wm: wordMatches };
        })
        .filter(({ s }) => s > 0)
        .sort((a, b) => b.s - a.s);

      // Prefer full-token matches first, then multi-token thresholds using significant tokens
      let filtered = scoredRaw;
      if (tokensSig.length >= 1) {
        const fullMatches = scoredRaw.filter(({ wm }) => wm >= tokensSig.length);
        if (fullMatches.length > 0) {
          filtered = fullMatches;
        } else if (tokensSig.length >= 2) {
          let multi = scoredRaw.filter(({ m }) => m >= MULTI_TOKEN_PREFERRED);
          if (multi.length === 0) {
            multi = scoredRaw.filter(({ m }) => m >= MULTI_TOKEN_FALLBACK);
          }
          if (multi.length > 0) filtered = multi;
        }
      }

      let scored = filtered.slice(0, limit).map(({ p }) => p as Product);
      try { console.debug('[searchProducts] scored results', { query, totalBatch: batch.length, matched: scored.length, limit }); } catch { /* noop */ }

      // If nothing matched in the broad batch, try server-filtered batches with multiple tokens
      if (!scored || scored.length === 0) {
        const nq = normalize(query);
        const tokens = nq.split(' ').filter(t => t.length >= 2);
        const uniqueTokens = Array.from(new Set(tokens));
        const prioritized = uniqueTokens.sort((a, b) => b.length - a.length).slice(0, 3); // up to 3 tokens
        if (prioritized.length > 0) {
          try { console.debug('[searchProducts] multi-token fallback', { tokens: prioritized }); } catch { /* noop */ }
          const merged2 = new Map<string, Product>();
          for (const tok of prioritized) {
            try { console.debug('[searchProducts] fallback querying token', { tok }); } catch { /* noop */ }
            const [respA, respI] = await Promise.all([
              api.getProducts({ search: tok, limit: 500, status: 'active' }).catch(() => null),
              api.getProducts({ search: tok, limit: 500, status: 'inactive' }).catch(() => null),
            ]);
            type ProductsResponseLike = { products?: unknown };
            const extractProducts = (resp: unknown): Product[] => {
              if (resp && typeof resp === 'object' && Array.isArray((resp as ProductsResponseLike).products)) {
                return ((resp as ProductsResponseLike).products as unknown[]).filter((x): x is Product => !!x) as Product[];
              }
              return [];
            };
            const listA = extractProducts(respA);
            const listI = extractProducts(respI);
            for (const p of listA) merged2.set(p.id, p);
            for (const p of listI) if (!merged2.has(p.id)) merged2.set(p.id, p);
          }
          const batch2 = Array.from(merged2.values());
          try { console.debug('[searchProducts] multi-token fallback merged size', { merged: batch2.length }); } catch { /* noop */ }
          if (batch2.length > 0) {
            const tokensForFilter2All = normalize(query).split(' ').filter(Boolean);
            const tokensSig2 = tokensForFilter2All.filter(t => t.length >= 2);
            const scoredRaw2 = batch2
              .map(p => {
                const { score, matches, wordMatches } = scoreProduct(query, p as Product);
                return { p, s: score, m: matches, wm: wordMatches };
              })
              .filter(({ s }) => s > 0)
              .sort((a, b) => b.s - a.s);

            let filtered2 = scoredRaw2;
            if (tokensSig2.length >= 1) {
              const fullMatches2 = scoredRaw2.filter(({ wm }) => wm >= tokensSig2.length);
              if (fullMatches2.length > 0) {
                filtered2 = fullMatches2;
              } else if (tokensSig2.length >= 2) {
                let multi2 = scoredRaw2.filter(({ m }) => m >= MULTI_TOKEN_PREFERRED);
                if (multi2.length === 0) {
                  multi2 = scoredRaw2.filter(({ m }) => m >= MULTI_TOKEN_FALLBACK);
                }
                if (multi2.length > 0) filtered2 = multi2;
              }
            }

            scored = filtered2
              .slice(0, limit)
              .map(({ p }) => p as Product);
          }
          try { console.debug('[searchProducts] multi-token fallback scored', { matched: scored.length }); } catch { /* noop */ }
          if (scored.length > 0) {
            // Seed cache from the successful fallback batch
            try { setSharedCache({ items: batch2, ts: Date.now() }); } catch { /* noop */ }
          }
        }
      }

      return scored;
    } catch (error) {
      const errorMessage = error instanceof ApiError
        ? error.message
        : 'Erreur lors de la recherche de produits';

      showNotification(errorMessage, 'error');
      return [];
    }
  }, [showNotification, normalizeProduct, state.products]);

  const refreshProducts = useCallback(() => {
    fetchProducts(false); // Don't show loading spinner for refresh
  }, [fetchProducts]);

  // Initial fetch
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Auto-refresh
  useEffect(() => {
    if (!params.autoRefresh) return;

    const interval = setInterval(() => {
      refreshProducts();
    }, params.refreshInterval || 30000);

    return () => clearInterval(interval);
  }, [params.autoRefresh, params.refreshInterval, refreshProducts]);

  // Seed tolerant-search cache from state products when available
  useEffect(() => {
    try {
      const now = Date.now();
      const TTL = 60 * 1000;
      const cache = getSharedCache();
      if (Array.isArray(state.products) && state.products.length > 0) {
        const shouldSeed = !cache || !Array.isArray(cache.items) || cache.items.length === 0 || (now - cache.ts > TTL && state.products.length > cache.items.length);
        if (shouldSeed) {
          setSharedCache({ items: state.products, ts: now });
          console.debug('[useProducts] seeded cache from state.products', { size: state.products.length });
        }
      }
    } catch { /* noop */ }
  }, [state.products]);

  return {
    ...state,
    notifications,
    operationLoading,
    // Actions
    createProduct,
    updateProduct,
    deleteProduct,
    duplicateProduct,
    toggleProductStatus,
    searchProducts,
    refreshProducts,
    removeNotification,
  };
}