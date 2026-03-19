/**
 * In-Memory Rate Limiting Utility
 * 
 * Provides rate limiting for API endpoints without Redis dependency.
 * Uses sliding window algorithm for accurate rate limiting.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
  requests: number[]; // Timestamps of requests in the window
}

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests per window
  keyGenerator?: (identifier: string) => string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // Photo uploads: 20 requests per minute
  PHOTO_UPLOAD: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
  },
  // Photo downloads: 50 requests per minute
  PHOTO_DOWNLOAD: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50,
  },
  // General API: 100 requests per minute
  GENERAL_API: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },
  // Auth endpoints: 10 requests per minute (more restrictive)
  AUTH: {
    windowMs: 60 * 1000,
    maxRequests: 10,
  },
  // Export operations: 10 requests per minute
  EXPORT: {
    windowMs: 60 * 1000,
    maxRequests: 10,
  },
  // Bulk operations: 5 requests per minute
  BULK: {
    windowMs: 60 * 1000,
    maxRequests: 5,
  },
} as const;

class MemoryRateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Run cleanup every 30 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 30000);
  }

  /**
   * Check if a request is allowed under rate limiting
   */
  checkLimit(
    identifier: string,
    config: RateLimitConfig,
    type: string = 'default'
  ): RateLimitResult {
    const key = config.keyGenerator 
      ? config.keyGenerator(identifier) 
      : `${type}:${identifier}`;
    
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    let entry = this.limits.get(key);
    
    if (!entry) {
      // First request - create new entry
      entry = {
        count: 1,
        windowStart: now,
        requests: [now],
      };
      this.limits.set(key, entry);
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: now + config.windowMs,
      };
    }
    
    // Remove requests outside the current window (sliding window)
    entry.requests = entry.requests.filter(timestamp => timestamp > windowStart);
    entry.count = entry.requests.length;
    
    if (entry.count >= config.maxRequests) {
      // Rate limit exceeded
      const oldestRequest = entry.requests[0];
      const retryAfter = oldestRequest + config.windowMs - now;
      
      return {
        allowed: false,
        remaining: 0,
        resetAt: oldestRequest + config.windowMs,
        retryAfter: Math.ceil(retryAfter / 1000), // in seconds
      };
    }
    
    // Allow the request
    entry.requests.push(now);
    entry.count++;
    
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetAt: now + config.windowMs,
    };
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string, type: string = 'default'): void {
    const key = `${type}:${identifier}`;
    this.limits.delete(key);
  }

  /**
   * Get current rate limit status
   */
  getStatus(
    identifier: string,
    config: RateLimitConfig,
    type: string = 'default'
  ): Omit<RateLimitResult, 'allowed'> {
    const key = config.keyGenerator 
      ? config.keyGenerator(identifier) 
      : `${type}:${identifier}`;
    
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    const entry = this.limits.get(key);
    
    if (!entry) {
      return {
        remaining: config.maxRequests,
        resetAt: now + config.windowMs,
      };
    }
    
    // Count requests in current window
    const requestsInWindow = entry.requests.filter(ts => ts > windowStart);
    
    return {
      remaining: Math.max(0, config.maxRequests - requestsInWindow.length),
      resetAt: (entry.requests[0] || now) + config.windowMs,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.limits.entries()) {
      // Remove entries with all requests outside any reasonable window (5 minutes)
      const fiveMinutesAgo = now - 5 * 60 * 1000;
      const hasValidRequests = entry.requests.some(ts => ts > fiveMinutesAgo);
      
      if (!hasValidRequests) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Get statistics about the rate limiter
   */
  getStats(): { totalKeys: number; keysByType: Record<string, number> } {
    const keysByType: Record<string, number> = {};
    
    for (const key of this.limits.keys()) {
      const type = key.split(':')[0] || 'unknown';
      keysByType[type] = (keysByType[type] || 0) + 1;
    }
    
    return {
      totalKeys: this.limits.size,
      keysByType,
    };
  }

  /**
   * Shutdown cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.limits.clear();
  }
}

// Singleton instance
export const rateLimiter = new MemoryRateLimiter();

/**
 * Helper function to get client identifier from request
 */
export function getClientIdentifier(request: Request): string {
  // Try various headers for client IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for may contain multiple IPs, use the first one
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback to user agent hash for identification
  const userAgent = request.headers.get('user-agent') || 'unknown';
  return `ua:${hashString(userAgent)}`;
}

/**
 * Simple string hash for identification
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', result.remaining.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.resetAt.toString());
  
  if (result.retryAfter) {
    headers.set('Retry-After', result.retryAfter.toString());
  }
  
  return headers;
}

/**
 * Rate limit middleware helper
 */
export function withRateLimit(
  request: Request,
  limitType: keyof typeof RATE_LIMITS
): RateLimitResult {
  const identifier = getClientIdentifier(request);
  const config = RATE_LIMITS[limitType];
  return rateLimiter.checkLimit(identifier, config, limitType);
}

/**
 * Higher-order function to wrap API handlers with rate limiting
 */
export function rateLimited(
  limitType: keyof typeof RATE_LIMITS,
  handler: (request: Request) => Promise<Response>
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const result = withRateLimit(request, limitType);
    
    if (!result.allowed) {
      const headers = createRateLimitHeaders(result);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Too many requests',
          message: `Rate limit exceeded. Please retry after ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            ...Object.fromEntries(headers),
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    const response = await handler(request);
    
    // Add rate limit headers to response
    const headers = createRateLimitHeaders(result);
    headers.forEach((value, key) => {
      response.headers.set(key, value);
    });
    
    return response;
  };
}
