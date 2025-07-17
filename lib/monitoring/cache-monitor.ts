export interface CacheStats {
  name: string;
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsage: number;
  maxSize?: number;
  timestamp: number;
}

export interface CacheEntry {
  key: string;
  size: number;
  accessCount: number;
  lastAccess: number;
  created: number;
}

// Simple metrics interface for Vercel/serverless environments
interface CacheMetrics {
  cache_name: string;
  operation: string;
  duration_ms?: number;
  timestamp: number;
}

class CacheMonitor {
  private static instance: CacheMonitor;
  private caches = new Map<string, CacheStats>();
  private listeners: ((stats: CacheStats[]) => void)[] = [];
  private metrics: CacheMetrics[] = [];

  private constructor() {}

  static getInstance(): CacheMonitor {
    if (!CacheMonitor.instance) {
      CacheMonitor.instance = new CacheMonitor();
    }
    return CacheMonitor.instance;
  }

  registerCache(name: string, maxSize?: number): void {
    if (!this.caches.has(name)) {
      this.caches.set(name, {
        name,
        size: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
        memoryUsage: 0,
        maxSize,
        timestamp: Date.now()
      });
    }
  }

  updateCacheStats(name: string, stats: Partial<CacheStats>): void {
    const existing = this.caches.get(name);
    if (!existing) {
      this.registerCache(name);
    }

    const updated: CacheStats = {
      ...existing!,
      ...stats,
      name,
      timestamp: Date.now()
    };

    // Calculate hit rate
    const total = updated.hits + updated.misses;
    updated.hitRate = total > 0 ? updated.hits / total : 0;

    this.caches.set(name, updated);
    this.recordMetric(updated.name, 'update');
    this.notifyListeners();
  }

  recordCacheHit(name: string, accessTimeMs?: number): void {
    const stats = this.caches.get(name);
    if (stats) {
      stats.hits++;
      this.updateCacheStats(name, stats);
      this.recordMetric(name, 'hit', accessTimeMs);
    }
  }

  recordCacheMiss(name: string, accessTimeMs?: number): void {
    const stats = this.caches.get(name);
    if (stats) {
      stats.misses++;
      this.updateCacheStats(name, stats);
      this.recordMetric(name, 'miss', accessTimeMs);
    }
  }

  recordCacheSet(name: string, memoryDelta: number = 0): void {
    const stats = this.caches.get(name);
    if (stats) {
      stats.size++;
      stats.memoryUsage += memoryDelta;
      this.updateCacheStats(name, stats);
      this.recordMetric(name, 'set');
    }
  }

  recordCacheDelete(name: string, memoryDelta: number = 0): void {
    const stats = this.caches.get(name);
    if (stats) {
      stats.size = Math.max(0, stats.size - 1);
      stats.memoryUsage = Math.max(0, stats.memoryUsage - memoryDelta);
      this.updateCacheStats(name, stats);
      this.recordMetric(name, 'delete');
    }
  }

  recordCacheClear(name: string): void {
    const stats = this.caches.get(name);
    if (stats) {
      stats.size = 0;
      stats.memoryUsage = 0;
      this.updateCacheStats(name, stats);
      this.recordMetric(name, 'clear');
    }
  }

  getCacheStats(name: string): CacheStats | undefined {
    return this.caches.get(name);
  }

  getAllCacheStats(): CacheStats[] {
    return Array.from(this.caches.values());
  }

  getTotalMemoryUsage(): number {
    return Array.from(this.caches.values()).reduce((total, cache) => total + cache.memoryUsage, 0);
  }

  getTotalCacheSize(): number {
    return Array.from(this.caches.values()).reduce((total, cache) => total + cache.size, 0);
  }

  getAverageHitRate(): number {
    const stats = Array.from(this.caches.values());
    if (stats.length === 0) return 0;
    
    const totalHitRate = stats.reduce((sum, cache) => sum + cache.hitRate, 0);
    return totalHitRate / stats.length;
  }

  onCacheChange(listener: (stats: CacheStats[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private recordMetric(cacheName: string, operation: string, durationMs?: number): void {
    const metric: CacheMetrics = {
      cache_name: cacheName,
      operation,
      duration_ms: durationMs,
      timestamp: Date.now()
    };
    
    this.metrics.push(metric);
    
    // Keep only last 1000 metrics for memory management
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  private notifyListeners(): void {
    const allStats = this.getAllCacheStats();
    this.listeners.forEach(listener => {
      try {
        listener(allStats);
      } catch (error) {
        console.error('Error in cache monitor listener:', error);
      }
    });
  }

  // Utility methods
  formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  formatPercent(value: number): string {
    return (value * 100).toFixed(2) + '%';
  }

  // Cache analysis methods
  getTopCachesByMemory(limit: number = 5): CacheStats[] {
    return Array.from(this.caches.values())
      .sort((a, b) => b.memoryUsage - a.memoryUsage)
      .slice(0, limit);
  }

  getTopCachesBySize(limit: number = 5): CacheStats[] {
    return Array.from(this.caches.values())
      .sort((a, b) => b.size - a.size)
      .slice(0, limit);
  }

  getLowPerformingCaches(hitRateThreshold: number = 0.5): CacheStats[] {
    return Array.from(this.caches.values())
      .filter(cache => cache.hitRate < hitRateThreshold)
      .sort((a, b) => a.hitRate - b.hitRate);
  }

  getCacheEfficiencyReport(): {
    totalCaches: number;
    totalMemory: number;
    totalEntries: number;
    averageHitRate: number;
    topByMemory: CacheStats[];
    lowPerforming: CacheStats[];
  } {
    return {
      totalCaches: this.caches.size,
      totalMemory: this.getTotalMemoryUsage(),
      totalEntries: this.getTotalCacheSize(),
      averageHitRate: this.getAverageHitRate(),
      topByMemory: this.getTopCachesByMemory(3),
      lowPerforming: this.getLowPerformingCaches(0.5)
    };
  }
}

// Cache wrapper for easy integration
export class MonitoredCache<T> {
  private cache = new Map<string, T>();
  private monitor = CacheMonitor.getInstance();

  constructor(private name: string, private maxSize?: number) {
    this.monitor.registerCache(name, maxSize);
  }

  get(key: string): T | undefined {
    const start = performance.now();
    const value = this.cache.get(key);
    const duration = performance.now() - start;
    
    if (value !== undefined) {
      this.monitor.recordCacheHit(this.name, duration);
    } else {
      this.monitor.recordCacheMiss(this.name, duration);
    }
    
    return value;
  }

  set(key: string, value: T, estimatedSize: number = 0): void {
    if (!this.cache.has(key)) {
      this.monitor.recordCacheSet(this.name, estimatedSize);
    }
    this.cache.set(key, value);
  }

  delete(key: string, estimatedSize: number = 0): boolean {
    const existed = this.cache.delete(key);
    if (existed) {
      this.monitor.recordCacheDelete(this.name, estimatedSize);
    }
    return existed;
  }

  clear(): void {
    this.cache.clear();
    this.monitor.recordCacheClear(this.name);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  get size(): number {
    return this.cache.size;
  }

  keys(): IterableIterator<string> {
    return this.cache.keys();
  }

  values(): IterableIterator<T> {
    return this.cache.values();
  }

  entries(): IterableIterator<[string, T]> {
    return this.cache.entries();
  }
}

export const cacheMonitor = CacheMonitor.getInstance();
export default cacheMonitor;