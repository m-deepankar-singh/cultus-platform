import { cacheManager } from './cache-manager';
import { createClient } from '@/lib/supabase/server';

export class EnhancedCacheInvalidation {
  /**
   * Cascade invalidation - handles complex relationships
   */
  async cascadeInvalidation(entityType: string, entityId: string, operation: 'create' | 'update' | 'delete') {
    const invalidationMap: Record<string, { tags: string[]; cascades?: () => Promise<void> }> = {
      student: {
        tags: ['student_progress', 'product_performance', `student:${entityId}`],
        cascades: async () => {
          // When student changes, also invalidate their modules
          const modules = await this.getStudentModules(entityId);
          for (const moduleId of modules) {
            await cacheManager.invalidateByTags([`module:${moduleId}`, 'module_completion']);
          }
        }
      },
      
      module: {
        tags: ['modules', 'product_performance', 'module_completion', `module:${entityId}`],
        cascades: async () => {
          // When module changes, invalidate all student progress for that module
          await cacheManager.invalidateByTags(['student_progress']);
          // Also invalidate product performance
          const productId = await this.getModuleProductId(entityId);
          if (productId) {
            await cacheManager.invalidateByTags([`product:${productId}`, 'product_performance']);
          }
        }
      },
      
      product: {
        tags: ['products', 'product_performance', `product:${entityId}`],
        cascades: async () => {
          // When product changes, invalidate all related modules and progress
          const modules = await this.getProductModules(entityId);
          for (const moduleId of modules) {
            await cacheManager.invalidateByTags([`module:${moduleId}`, 'module_completion']);
          }
          await cacheManager.invalidateByTags(['student_progress']);
        }
      },
      
      expert_session: {
        tags: ['expert_sessions', 'expert_session_stats', 'stats', `session:${entityId}`],
        cascades: async () => {
          // When expert session changes, invalidate progress for all viewers
          await cacheManager.invalidateByTags(['progress', 'student_progress']);
        }
      }
    };

    const config = invalidationMap[entityType];
    if (!config) {
      console.warn(`No invalidation config for entity type: ${entityType}`);
      return;
    }

    // Direct invalidation
    await cacheManager.invalidateByTags(config.tags);
    
    // Cascade invalidation
    if (config.cascades) {
      await config.cascades();
    }
    
    console.log(`Cache invalidated for ${entityType}:${entityId} (${operation})`);
  }

  /**
   * Bulk invalidation for batch operations
   */
  async bulkInvalidation(operations: Array<{entityType: string, entityId: string, operation: string}>) {
    const allTags = new Set<string>();
    
    // Collect all tags to invalidate
    for (const op of operations) {
      const tags = this.getTagsForEntity(op.entityType, op.entityId);
      tags.forEach(tag => allTags.add(tag));
    }
    
    // Single bulk invalidation call
    await cacheManager.invalidateByTags(Array.from(allTags));
    
    console.log(`Bulk cache invalidation: ${allTags.size} unique tags for ${operations.length} operations`);
  }

  /**
   * Smart invalidation based on data relationships
   */
  async smartInvalidation(changes: Array<{table: string, id: string, operation: string, data?: any}>) {
    const invalidationPlan = new Map<string, Set<string>>();
    
    for (const change of changes) {
      const tags = this.getTagsForTableChange(change.table, change.id, change.data);
      const key = change.table;
      
      if (!invalidationPlan.has(key)) {
        invalidationPlan.set(key, new Set());
      }
      
      tags.forEach(tag => invalidationPlan.get(key)!.add(tag));
    }
    
    // Execute invalidation plan
    for (const [table, tags] of invalidationPlan) {
      await cacheManager.invalidateByTags(Array.from(tags));
      console.log(`Smart invalidation for ${table}: ${tags.size} tags`);
    }
  }

  /**
   * Time-based invalidation for scheduled cleanups
   */
  async scheduleInvalidation(pattern: string, delay: number) {
    setTimeout(async () => {
      try {
        await cacheManager.invalidateByTags([pattern]);
        console.log(`Scheduled invalidation executed for pattern: ${pattern}`);
      } catch (error) {
        console.error(`Scheduled invalidation failed for ${pattern}:`, error);
      }
    }, delay);
  }

  /**
   * Conditional invalidation based on business rules
   */
  async conditionalInvalidation(entityType: string, entityId: string, conditions: Record<string, any>) {
    const shouldInvalidate = await this.evaluateInvalidationConditions(entityType, conditions);
    
    if (shouldInvalidate) {
      await this.cascadeInvalidation(entityType, entityId, 'update');
      console.log(`Conditional invalidation executed for ${entityType}:${entityId}`);
    } else {
      console.log(`Conditional invalidation skipped for ${entityType}:${entityId}`);
    }
  }

  // Helper methods
  private getTagsForEntity(entityType: string, entityId: string): string[] {
    const tagMap: Record<string, string[]> = {
      student: ['student_progress', 'product_performance', `student:${entityId}`],
      module: ['modules', 'module_completion', `module:${entityId}`],
      product: ['products', 'product_performance', `product:${entityId}`],
      expert_session: ['expert_sessions', 'stats', `session:${entityId}`]
    };
    return tagMap[entityType] || [];
  }

  private getTagsForTableChange(table: string, id: string, data?: any): string[] {
    const baseTags = this.getTagsForEntity(table.replace(/^(public\.)?/, ''), id);
    
    // Add additional tags based on data relationships
    if (data && table.includes('progress')) {
      baseTags.push('progress', 'analytics');
    }
    
    if (data && table.includes('expert_session')) {
      baseTags.push('sessions', 'expert_sessions');
    }
    
    return baseTags;
  }

  private async evaluateInvalidationConditions(entityType: string, conditions: Record<string, any>): Promise<boolean> {
    // Business rules for conditional invalidation
    if (entityType === 'student' && conditions.status_change === 'inactive') {
      return true; // Always invalidate when student becomes inactive
    }
    
    if (entityType === 'module' && conditions.is_active === false) {
      return true; // Always invalidate when module is deactivated
    }
    
    if (entityType === 'expert_session' && conditions.view_count_threshold && conditions.view_count > conditions.view_count_threshold) {
      return true; // Invalidate high-traffic sessions more frequently
    }
    
    return false;
  }

  private async getStudentModules(studentId: string): Promise<string[]> {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from('student_module_progress')
        .select('module_id')
        .eq('student_id', studentId);
      
      return data?.map(row => row.module_id) || [];
    } catch (error) {
      console.error('Error fetching student modules:', error);
      return [];
    }
  }

  private async getModuleProductId(moduleId: string): Promise<string | null> {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from('modules')
        .select('product_id')
        .eq('id', moduleId)
        .single();
      
      return data?.product_id || null;
    } catch (error) {
      console.error('Error fetching module product:', error);
      return null;
    }
  }

  private async getProductModules(productId: string): Promise<string[]> {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from('modules')
        .select('id')
        .eq('product_id', productId);
      
      return data?.map(row => row.id) || [];
    } catch (error) {
      console.error('Error fetching product modules:', error);
      return [];
    }
  }
}

// Export enhanced invalidation system
export const enhancedCacheInvalidation = new EnhancedCacheInvalidation();

// Legacy hooks for backward compatibility and common patterns
export const CacheInvalidationHooks = {
  /**
   * Invalidate cache when student progress is updated
   */
  onStudentProgressUpdate: async (studentId: string, moduleId: string) => {
    await enhancedCacheInvalidation.cascadeInvalidation('student', studentId, 'update');
  },

  /**
   * Invalidate cache when expert session is updated
   */
  onExpertSessionUpdate: async (sessionId: string) => {
    await enhancedCacheInvalidation.cascadeInvalidation('expert_session', sessionId, 'update');
  },

  /**
   * Invalidate cache when product changes
   */
  onProductChange: async (productId: string) => {
    await enhancedCacheInvalidation.cascadeInvalidation('product', productId, 'update');
  },

  /**
   * Invalidate cache when module is updated
   */
  onModuleUpdate: async (moduleId: string) => {
    await enhancedCacheInvalidation.cascadeInvalidation('module', moduleId, 'update');
  },

  /**
   * Bulk invalidate cache for multiple entities
   */
  onBulkUpdate: async (updates: Array<{type: string, id: string}>) => {
    const operations = updates.map(update => ({
      entityType: update.type,
      entityId: update.id,
      operation: 'update'
    }));
    await enhancedCacheInvalidation.bulkInvalidation(operations);
  },

  /**
   * Invalidate analytics cache
   */
  onAnalyticsUpdate: async () => {
    await cacheManager.invalidateByTags(['analytics', 'performance', 'stats']);
  },

  /**
   * Emergency cache clear
   */
  emergencyCacheClear: async () => {
    await cacheManager.invalidateByTags(['*']); // Clear all cache
    console.warn('Emergency cache clear executed');
  }
};

// Utility functions for common invalidation patterns
export const CacheInvalidationUtils = {
  /**
   * Generate invalidation tags for a given context
   */
  generateTags: (context: {
    userId?: string;
    productId?: string;
    moduleId?: string;
    sessionId?: string;
    operation?: string;
  }) => {
    const tags: string[] = [];
    
    if (context.userId) tags.push(`student:${context.userId}`, 'student_progress');
    if (context.productId) tags.push(`product:${context.productId}`, 'product_performance');
    if (context.moduleId) tags.push(`module:${context.moduleId}`, 'module_completion');
    if (context.sessionId) tags.push(`session:${context.sessionId}`, 'expert_sessions');
    
    if (context.operation === 'analytics') tags.push('analytics', 'stats', 'performance');
    
    return tags;
  },

  /**
   * Get tags for a specific entity type and ID
   */
  getTagsForEntity: (entityType: string, entityId: string): string[] => {
    const tagMap: Record<string, string[]> = {
      student: ['student_progress', 'product_performance', `student:${entityId}`],
      module: ['modules', 'module_completion', `module:${entityId}`],
      product: ['products', 'product_performance', `product:${entityId}`],
      expert_session: ['expert_sessions', 'stats', `session:${entityId}`]
    };
    return tagMap[entityType] || [];
  },

  /**
   * Get cache invalidation priority
   */
  getInvalidationPriority: (entityType: string) => {
    const priorities: Record<string, string> = {
      student: 'high',       // Affects user experience immediately
      expert_session: 'high', // Content changes need immediate refresh
      product: 'medium',     // Business-critical but less frequent
      module: 'medium',      // Important but cached longer
      analytics: 'low'       // Can tolerate stale data briefly
    };
    return priorities[entityType] || 'medium';
  },

  /**
   * Calculate optimal cache duration based on entity type
   */
  getOptimalCacheDuration: (entityType: string, context?: any) => {
    const durations: Record<string, string> = {
      student_progress: '2 minutes',
      expert_sessions: '5 minutes',
      product_performance: '15 minutes',
      analytics: '30 minutes',
      static_content: '1 hour'
    };
    
    // Adjust based on context (e.g., high-traffic periods)
    if (context?.highTraffic) {
      return durations[entityType]?.replace(/(\d+)/, (match: string) => String(parseInt(match) / 2));
    }
    
    return durations[entityType] || '10 minutes';
  }
}; 