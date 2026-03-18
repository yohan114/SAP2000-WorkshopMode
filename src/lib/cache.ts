/**
 * Simple in-memory caching layer for frequently accessed data
 * With TTL support and automatic cleanup
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  /**
   * Set a value in cache with TTL in seconds
   */
  set<T>(key: string, value: T, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds * 1000),
      createdAt: Date.now(),
    });
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Delete all keys matching a pattern
   */
  deletePattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get or set a value with a factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }
    
    const value = await factory();
    this.set(key, value, ttlSeconds);
    
    return value;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    keys: string[];
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      hitRate: 0, // Would need to track hits/misses for this
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Shutdown cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Singleton instance
export const cache = new MemoryCache();

/**
 * Cache key generators for consistent naming
 */
export const CacheKeys = {
  // Dashboard
  dashboardKpis: () => 'dashboard:kpis',
  dashboardWidgets: () => 'dashboard:widgets',
  dashboardAnalytics: () => 'dashboard:analytics',
  
  // Job Cards
  jobCardList: (filters: Record<string, unknown>) => `jobcards:list:${JSON.stringify(filters)}`,
  jobCardDetail: (id: string) => `jobcards:detail:${id}`,
  jobCardStats: () => 'jobcards:stats',
  
  // Assets
  assetList: (filters: Record<string, unknown>) => `assets:list:${JSON.stringify(filters)}`,
  assetDetail: (id: string) => `assets:detail:${id}`,
  assetCategories: () => 'assets:categories',
  fleetStatus: () => 'assets:fleet:status',
  
  // Inventory
  stockList: (storeId: string, filters: Record<string, unknown>) => 
    `inventory:stock:${storeId}:${JSON.stringify(filters)}`,
  stockItem: (itemId: string, storeId: string) => 
    `inventory:item:${itemId}:${storeId}`,
  lowStockAlerts: () => 'inventory:alerts:low',
  
  // Suppliers
  supplierList: () => 'suppliers:list',
  supplierDetail: (id: string) => `suppliers:detail:${id}`,
  
  // Reports
  reportData: (reportId: string, params: Record<string, unknown>) => 
    `reports:data:${reportId}:${JSON.stringify(params)}`,
  
  // Users
  userPermissions: (userId: string) => `users:permissions:${userId}`,
  
  // Quality
  qualityStats: () => 'quality:stats',
  
  // Stock Take
  stockTakeStats: () => 'stocktake:stats',
  
  // GRN
  grnStats: () => 'grn:stats',
} as const;

/**
 * Cache TTL presets in seconds
 */
export const CacheTTL = {
  SHORT: 60,        // 1 minute - for frequently changing data
  MEDIUM: 300,      // 5 minutes - for most list views
  LONG: 900,        // 15 minutes - for less frequently changing data
  VERY_LONG: 3600,  // 1 hour - for reference data
  DAY: 86400,       // 1 day - for static configuration
} as const;

/**
 * Decorator for caching method results
 */
export function Cached(key: string, ttlSeconds: number = CacheTTL.MEDIUM) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: unknown[]) {
      const cacheKey = `${key}:${JSON.stringify(args)}`;
      const cached = cache.get(cacheKey);
      
      if (cached !== null) {
        return cached;
      }
      
      const result = await originalMethod.apply(this, args);
      cache.set(cacheKey, result, ttlSeconds);
      
      return result;
    };
    
    return descriptor;
  };
}

/**
 * Invalidate related cache entries after mutations
 */
export function invalidateCache(...patterns: string[]): void {
  patterns.forEach(pattern => {
    cache.deletePattern(pattern);
  });
}

// Common invalidation helpers
export const CacheInvalidation = {
  onJobCardChange: (id?: string) => {
    invalidateCache('jobcards:*', 'dashboard:*');
    if (id) {
      cache.delete(CacheKeys.jobCardDetail(id));
    }
  },
  
  onAssetChange: (id?: string) => {
    invalidateCache('assets:*', 'dashboard:*');
    if (id) {
      cache.delete(CacheKeys.assetDetail(id));
    }
  },
  
  onInventoryChange: (storeId?: string) => {
    invalidateCache('inventory:*', 'dashboard:*');
    if (storeId) {
      cache.deletePattern(`inventory:stock:${storeId}:*`);
    }
  },
  
  onSupplierChange: (id?: string) => {
    invalidateCache('suppliers:*');
    if (id) {
      cache.delete(CacheKeys.supplierDetail(id));
    }
  },
  
  onReportChange: () => {
    invalidateCache('reports:*');
  },
} as const;
