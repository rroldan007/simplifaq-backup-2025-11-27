import { useState, useEffect, useRef, useCallback } from 'react';

interface UseLazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export const useLazyLoad = (options: UseLazyLoadOptions = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = true,
  } = options;

  const [isInView, setIsInView] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || (triggerOnce && hasTriggered)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          setHasTriggered(true);
          
          if (triggerOnce) {
            observer.disconnect();
          }
        } else if (!triggerOnce) {
          setIsInView(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce, hasTriggered]);

  return { elementRef, isInView };
};

// Hook for lazy loading data
export const useLazyData = <T>(
  fetchFn: () => Promise<T>,
  options: UseLazyLoadOptions = {}
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { elementRef, isInView } = useLazyLoad(options);

  useEffect(() => {
    if (!isInView || data || loading) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await fetchFn();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isInView, data, loading, fetchFn]);

  return { elementRef, data, loading, error, isInView };
};

// Hook for infinite scrolling
export const useInfiniteScroll = <T>(
  fetchFn: (page: number) => Promise<T[]>,
  options: {
    initialPage?: number;
    pageSize?: number;
    threshold?: number;
    rootMargin?: string;
  } = {}
) => {
  const {
    initialPage = 1,
    pageSize = 10,
    threshold = 0.1,
    rootMargin = '100px',
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const elementRef = useRef<HTMLElement>(null);

  // Load more data when element comes into view
  const { isInView } = useLazyLoad({
    threshold,
    rootMargin,
    triggerOnce: false,
  });

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const newData = await fetchFn(page);
      
      if (newData.length < pageSize) {
        setHasMore(false);
      }
      
      setData(prev => [...prev, ...newData]);
      setPage(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [fetchFn, page, pageSize, loading, hasMore]);

  // Trigger load more when element is in view
  useEffect(() => {
    if (isInView && hasMore && !loading) {
      loadMore();
    }
  }, [isInView, hasMore, loading, loadMore]);

  // Initial load
  useEffect(() => {
    if (data.length === 0 && !loading) {
      loadMore();
    }
  }, [data.length, loading, loadMore]);

  const reset = useCallback(() => {
    setData([]);
    setPage(initialPage);
    setHasMore(true);
    setError(null);
  }, [initialPage]);

  return {
    data,
    loading,
    error,
    hasMore,
    loadMore,
    reset,
    elementRef,
  };
};

// Hook for virtual scrolling (for large lists)
export const useVirtualScroll = <T>(
  items: T[],
  options: {
    itemHeight: number;
    containerHeight: number;
    overscan?: number;
  }
) => {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = useState(0);

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length, startIndex + visibleCount + overscan * 2);

  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    startIndex,
    endIndex,
  };
};

export default useLazyLoad;