'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Loader2 } from 'lucide-react';

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
  loadMore?: () => Promise<void>;
  hasMore?: boolean;
  loading?: boolean;
  overscan?: number;
}

function VirtualizedListInner<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  loadMore,
  hasMore = false,
  loading = false,
  overscan = 3,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const totalHeight = items.length * itemHeight;
  
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);

    // Trigger load more when near bottom
    if (loadMore && hasMore && !loading && !loadingRef.current) {
      const { scrollTop: st, scrollHeight, clientHeight } = target;
      if (scrollHeight - st - clientHeight < itemHeight * 5) {
        loadingRef.current = true;
        loadMore().finally(() => {
          loadingRef.current = false;
        });
      }
    }
  }, [loadMore, hasMore, loading, itemHeight]);

  return (
    <div
      ref={containerRef}
      className="overflow-auto"
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => (
          <div
            key={startIndex + index}
            style={{
              position: 'absolute',
              top: (startIndex + index) * itemHeight,
              height: itemHeight,
              width: '100%',
            }}
          >
            {renderItem(item, startIndex + index)}
          </div>
        ))}
      </div>
      
      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      )}
    </div>
  );
}

export const VirtualizedList = memo(VirtualizedListInner) as typeof VirtualizedListInner;

/**
 * Hook for infinite scrolling with lazy loading
 */
export function useInfiniteScroll<T>(
  fetchFunction: (page: number, limit: number) => Promise<{ data: T[]; total: number }>,
  options: {
    pageSize?: number;
    initialPage?: number;
  } = {}
) {
  const { pageSize = 20, initialPage = 1 } = options;
  
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(initialPage);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const hasMore = items.length < total;

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFunction(page, pageSize);
      
      setItems(prev => [...prev, ...result.data]);
      setTotal(result.total);
      setPage(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load data'));
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, page, pageSize, loading, hasMore]);

  const refresh = useCallback(async () => {
    setItems([]);
    setPage(initialPage);
    setLoading(true);
    
    try {
      const result = await fetchFunction(initialPage, pageSize);
      setItems(result.data);
      setTotal(result.total);
      setPage(initialPage + 1);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load data'));
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, initialPage, pageSize]);

  return {
    items,
    loading,
    error,
    hasMore,
    total,
    loadMore,
    refresh,
  };
}

/**
 * Debounced search hook
 */
export function useDebouncedSearch(
  searchFunction: (term: string) => void,
  delay: number = 300
) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSearching(true);
      searchFunction(searchTerm);
      setIsSearching(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [searchTerm, delay, searchFunction]);

  return {
    searchTerm,
    setSearchTerm,
    isSearching,
  };
}

/**
 * Lazy loading wrapper component
 */
interface LazyLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  delay?: number;
}

export function LazyLoader({ children, fallback, delay = 0 }: LazyLoaderProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!loaded) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return <>{children}</>;
}
