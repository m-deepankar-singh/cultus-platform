// Only import prom-client on server side
let register: any;
let Registry: any;
let collectDefaultMetrics: any;

if (typeof window === 'undefined') {
  try {
    import('prom-client').then((promClient) => {
      register = promClient.register;
      Registry = promClient.Registry;
      collectDefaultMetrics = promClient.collectDefaultMetrics;
    }).catch(error => {
      console.warn('prom-client not available:', error);
    });
  } catch (error) {
    console.warn('prom-client not available:', error);
  }
}

import { memoryMonitor } from './memory-monitor';
import { cacheMonitor } from './cache-monitor';
import { alertManager } from './alerts';

class MetricsCollector {
  private static instance: MetricsCollector;
  private registry: any;
  private isInitialized = false;

  private constructor() {
    this.registry = register;
    if (typeof window === 'undefined' && register) {
      this.setupDefaultMetrics();
    }
  }

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  private setupDefaultMetrics(): void {
    // Collect default Node.js metrics
    if (collectDefaultMetrics) {
      collectDefaultMetrics({
        register: this.registry,
        prefix: 'cultus_',
        gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
        eventLoopMonitoringPrecision: 10
      });
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Start memory monitoring
    memoryMonitor.start(5000); // Every 5 seconds

    // Set up memory alert monitoring
    memoryMonitor.onMemoryChange(async (stats) => {
      await alertManager.checkMemoryAlerts(stats);
    });

    // Set up cache alert monitoring
    cacheMonitor.onCacheChange(async (stats) => {
      await alertManager.checkCacheAlerts(stats);
    });

    this.isInitialized = true;
  }

  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    memoryMonitor.stop();
    this.isInitialized = false;
  }

  async getMetrics(): Promise<string> {
    if (typeof window !== 'undefined' || !this.registry) {
      return 'Metrics only available on server side';
    }
    return this.registry.metrics();
  }

  getRegistry(): any {
    return this.registry;
  }

  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    memory: {
      usage: number;
      pressure: string;
      formatted: string;
    };
    cache: {
      totalMemory: number;
      totalEntries: number;
      averageHitRate: number;
    };
    alerts: {
      active: number;
      critical: number;
      emergency: number;
    };
    uptime: number;
  }> {
    const memoryInfo = memoryMonitor.getMemoryInfo();
    const cacheStats = cacheMonitor.getAllCacheStats();
    const alertSummary = alertManager.getAlertSummary();

    const totalCacheMemory = cacheStats.reduce((sum, cache) => sum + cache.memoryUsage, 0);
    const totalCacheEntries = cacheStats.reduce((sum, cache) => sum + cache.size, 0);
    const averageHitRate = cacheStats.length > 0 
      ? cacheStats.reduce((sum, cache) => sum + cache.hitRate, 0) / cacheStats.length 
      : 0;

    const memoryUsage = memoryInfo.usage.heapUsed / memoryInfo.usage.heapTotal;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (alertSummary.byLevel.emergency > 0) {
      status = 'unhealthy';
    } else if (alertSummary.byLevel.critical > 0 || memoryUsage > 0.85) {
      status = 'degraded';
    }

    return {
      status,
      memory: {
        usage: memoryUsage,
        pressure: memoryInfo.pressureLevel,
        formatted: memoryMonitor.formatBytes(memoryInfo.usage.heapUsed)
      },
      cache: {
        totalMemory: totalCacheMemory,
        totalEntries: totalCacheEntries,
        averageHitRate
      },
      alerts: {
        active: alertSummary.active,
        critical: alertSummary.byLevel.critical,
        emergency: alertSummary.byLevel.emergency
      },
      uptime: memoryInfo.uptime
    };
  }

  async getDetailedReport(): Promise<{
    memory: {
      current: any;
      history: any[];
      thresholds: any;
    };
    cache: {
      stats: any[];
      efficiency: any;
    };
    alerts: {
      active: any[];
      recent: any[];
      summary: any;
    };
    system: {
      uptime: number;
      nodeVersion: string;
      platform: string;
      arch: string;
    };
  }> {
    const memoryHistory = memoryMonitor.getHistory(100); // Last 100 readings
    const memoryThresholds = memoryMonitor.getThresholds();
    const cacheEfficiency = cacheMonitor.getCacheEfficiencyReport();
    const activeAlerts = alertManager.getActiveAlerts();
    const recentAlerts = alertManager.getRecentAlerts(60); // Last hour
    const alertSummary = alertManager.getAlertSummary();

    return {
      memory: {
        current: memoryMonitor.getMemoryInfo(),
        history: memoryHistory,
        thresholds: memoryThresholds
      },
      cache: {
        stats: cacheMonitor.getAllCacheStats(),
        efficiency: cacheEfficiency
      },
      alerts: {
        active: activeAlerts,
        recent: recentAlerts,
        summary: alertSummary
      },
      system: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
  }
}

export const metricsCollector = MetricsCollector.getInstance();
export default metricsCollector;