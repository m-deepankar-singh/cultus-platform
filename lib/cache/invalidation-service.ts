import { createClient } from '@/lib/supabase/server';
import { DatabaseCacheManager } from './cache-manager';

/**
 * Application-level cache invalidation service
 * Provides methods to manually invalidate cache from API routes
 */
export class CacheInvalidationService {
  private cacheManager: DatabaseCacheManager;

  constructor() {
    this.cacheManager = new DatabaseCacheManager();
  }

  /**
   * Invalidate job readiness products cache
   * Call this when products or product assignments are modified through API routes
   */
  async invalidateJobReadinessProductsCache(clientId?: string): Promise<number> {
    const tags = ['job_readiness_products', 'products'];
    if (clientId) {
      tags.push(`client:${clientId}`);
    }
    return this.cacheManager.invalidateByTags(tags);
  }

  /**
   * Invalidate expert sessions cache
   * Call this when expert sessions are created, updated, or deleted through API routes
   */
  async invalidateExpertSessionsCache(productId?: string): Promise<number> {
    const tags = ['expert_sessions', 'job_readiness'];
    if (productId) {
      tags.push(`product:${productId}`);
    }
    return this.cacheManager.invalidateByTags(tags);
  }

  /**
   * Invalidate client configurations cache
   * Call this when client settings or product assignments are modified
   */
  async invalidateClientConfigurationsCache(clientId?: string): Promise<number> {
    const tags = ['client_configs', 'clients', 'settings'];
    if (clientId) {
      tags.push(`client:${clientId}`);
    }
    return this.cacheManager.invalidateByTags(tags);
  }

  /**
   * Invalidate module content cache
   * Call this when modules, lessons, or educational content is modified
   */
  async invalidateModuleContentCache(moduleId?: string): Promise<number> {
    const tags = ['module_content', 'modules', 'lessons'];
    if (moduleId) {
      tags.push(`module:${moduleId}`);
    }
    return this.cacheManager.invalidateByTags(tags);
  }

  /**
   * Invalidate all cached data from Phase 1 (users, clients, analytics)
   * Use sparingly - only when major system changes occur
   */
  async invalidatePhase1Cache(): Promise<number> {
    const tags = ['users', 'clients', 'analytics', 'dashboard'];
    return this.cacheManager.invalidateByTags(tags);
  }

  /**
   * Invalidate all Phase 2 static content caches
   * Use when bulk data imports or major content updates occur
   */
  async invalidatePhase2Cache(): Promise<number> {
    const tags = [
      'job_readiness_products', 
      'expert_sessions', 
      'client_configs', 
      'module_content'
    ];
    return this.cacheManager.invalidateByTags(tags);
  }

  /**
   * Bulk invalidation method for when multiple related entities are updated
   * Example: When a new product is created with modules and expert sessions
   */
  async invalidateRelatedCaches(options: {
    products?: boolean;
    expertSessions?: boolean;
    moduleContent?: boolean;
    clientConfigs?: boolean;
    clientId?: string;
    productId?: string;
    moduleId?: string;
  }): Promise<number> {
    const tags: string[] = [];
    
    if (options.products) {
      tags.push('job_readiness_products', 'products');
    }
    
    if (options.expertSessions) {
      tags.push('expert_sessions', 'job_readiness');
    }
    
    if (options.moduleContent) {
      tags.push('module_content', 'modules', 'lessons');
    }
    
    if (options.clientConfigs) {
      tags.push('client_configs', 'clients', 'settings');
    }
    
    // Add specific entity tags
    if (options.clientId) {
      tags.push(`client:${options.clientId}`);
    }
    
    if (options.productId) {
      tags.push(`product:${options.productId}`);
    }
    
    if (options.moduleId) {
      tags.push(`module:${options.moduleId}`);
    }
    
    return this.cacheManager.invalidateByTags(tags);
  }

  /**
   * Get cache statistics to monitor invalidation effectiveness
   */
  async getCacheInvalidationStats(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    hitRate: number;
    oldestEntry: string;
    newestEntry: string;
  }> {
    const metrics = await this.cacheManager.getCacheMetrics();
    
    if (!metrics) {
      return {
        totalEntries: 0,
        expiredEntries: 0,
        hitRate: 0,
        oldestEntry: '',
        newestEntry: ''
      };
    }

    const hitRate = metrics.total_entries > 0 
      ? (metrics.reused_entries / metrics.total_entries) * 100 
      : 0;

    return {
      totalEntries: metrics.total_entries,
      expiredEntries: metrics.expired_entries,
      hitRate: Math.round(hitRate * 100) / 100,
      oldestEntry: metrics.oldest_entry,
      newestEntry: metrics.newest_entry
    };
  }
}

// Singleton instance for use across the application
export const cacheInvalidation = new CacheInvalidationService();

// Utility functions for common invalidation patterns
export const CacheInvalidationUtils = {
  /**
   * Call this when a new job readiness product is created
   */
  onProductCreated: async (productId: string, clientId?: string) => {
    return cacheInvalidation.invalidateRelatedCaches({
      products: true,
      clientConfigs: true,
      clientId,
      productId
    });
  },

  /**
   * Call this when an expert session is uploaded or modified
   */
  onExpertSessionModified: async (productId?: string) => {
    return cacheInvalidation.invalidateExpertSessionsCache(productId);
  },

  /**
   * Call this when module content (lessons, quizzes) is updated
   */
  onModuleContentModified: async (moduleId: string) => {
    return cacheInvalidation.invalidateModuleContentCache(moduleId);
  },

  /**
   * Call this when client settings or product assignments change
   */
  onClientConfigModified: async (clientId: string) => {
    return cacheInvalidation.invalidateRelatedCaches({
      products: true,
      clientConfigs: true,
      clientId
    });
  },

  /**
   * Call this during bulk data operations or imports
   */
  onBulkDataImport: async () => {
    return cacheInvalidation.invalidatePhase2Cache();
  }
}; 