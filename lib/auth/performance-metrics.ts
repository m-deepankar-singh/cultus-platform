import { jwtVerificationService } from './jwt-verification-service';
import { authCacheManager } from './auth-cache-manager';

// Performance monitoring configuration
const PERFORMANCE_CONFIG = {
  METRICS_INTERVAL: 60000, // Collect metrics every minute
  HISTORY_RETENTION: 60, // Keep 60 minutes of history
  ALERT_THRESHOLDS: {
    MIDDLEWARE_LATENCY_WARNING: 75, // ms
    MIDDLEWARE_LATENCY_CRITICAL: 100, // ms
    CACHE_HIT_RATE_WARNING: 70, // %
    CACHE_HIT_RATE_CRITICAL: 50, // %
    AUTH_SERVER_RATE_WARNING: 10, // %
    AUTH_SERVER_RATE_CRITICAL: 20, // %
  },
} as const;

// Performance metrics interfaces
export interface MiddlewareMetrics {
  timestamp: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  requestCount: number;
  publicRouteHits: number;
  authenticationAttempts: number;
  failedAuthentications: number;
}

export interface CacheMetrics {
  timestamp: number;
  jwtVerificationMetrics: ReturnType<typeof jwtVerificationService.getMetrics>;
  authCacheMetrics: ReturnType<typeof authCacheManager.getMetrics>;
  redisConnectionPool: {
    poolUtilization: number;
    activeConnections: number;
    errorRate: number;
  };
}

export interface PerformanceAlert {
  type: 'warning' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  timestamp: number;
  description: string;
}

// Performance tracking class
class PerformanceTracker {
  private middlewareLatencies: number[] = [];
  private metricsHistory: (MiddlewareMetrics & CacheMetrics)[] = [];
  private alerts: PerformanceAlert[] = [];
  private intervalId: NodeJS.Timeout | null = null;

  // Request tracking
  private requestStats = {
    totalRequests: 0,
    publicRouteHits: 0,
    authenticationAttempts: 0,
    failedAuthentications: 0,
    latencies: [] as number[],
  };

  constructor() {
    // Start metrics collection if enabled
    if (process.env.ENABLE_PERFORMANCE_MONITORING !== 'false') {
      this.startMetricsCollection();
    }
  }

  /**
   * Record middleware processing time
   */
  recordMiddlewareLatency(latencyMs: number, isPublicRoute: boolean = false): void {
    this.middlewareLatencies.push(latencyMs);
    this.requestStats.latencies.push(latencyMs);
    this.requestStats.totalRequests++;
    
    if (isPublicRoute) {
      this.requestStats.publicRouteHits++;
    } else {
      this.requestStats.authenticationAttempts++;
    }

    // Check for real-time alerts
    this.checkLatencyAlerts(latencyMs);
  }

  /**
   * Record authentication failure
   */
  recordAuthenticationFailure(): void {
    this.requestStats.failedAuthentications++;
  }

  /**
   * Get current performance summary
   */
  getCurrentMetrics(): MiddlewareMetrics & CacheMetrics {
    const latencies = this.requestStats.latencies;
    const jwtMetrics = jwtVerificationService.getMetrics();
    const cacheMetrics = authCacheManager.getMetrics();
    
    return {
      timestamp: Date.now(),
      // Middleware metrics
      avgLatency: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      p95Latency: this.calculatePercentile(latencies, 95),
      p99Latency: this.calculatePercentile(latencies, 99),
      requestCount: this.requestStats.totalRequests,
      publicRouteHits: this.requestStats.publicRouteHits,
      authenticationAttempts: this.requestStats.authenticationAttempts,
      failedAuthentications: this.requestStats.failedAuthentications,
      // JWT verification metrics
      jwtVerificationMetrics: jwtMetrics,
      // Auth cache metrics
      authCacheMetrics: cacheMetrics,
      // Redis pool metrics (simplified)
      redisConnectionPool: {
        poolUtilization: 0, // Would need Redis pool instrumentation
        activeConnections: 5, // Static for now
        errorRate: cacheMetrics.redis_errors / Math.max(cacheMetrics.cache_hits + cacheMetrics.cache_misses, 1) * 100,
      },
    };
  }

  /**
   * Get performance history
   */
  getMetricsHistory(): (MiddlewareMetrics & CacheMetrics)[] {
    return [...this.metricsHistory];
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    // Return alerts from last 5 minutes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return this.alerts.filter(alert => alert.timestamp > fiveMinutesAgo);
  }

  /**
   * Get performance dashboard data
   */
  getDashboardData() {
    const currentMetrics = this.getCurrentMetrics();
    const activeAlerts = this.getActiveAlerts();
    
    return {
      current: currentMetrics,
      history: this.metricsHistory.slice(-30), // Last 30 data points
      alerts: activeAlerts,
      summary: {
        healthStatus: this.calculateHealthStatus(currentMetrics, activeAlerts),
        keyMetrics: {
          middlewareLatency: `${Math.round(currentMetrics.avgLatency)}ms`,
          cacheHitRate: `${Math.round(currentMetrics.authCacheMetrics.hit_rate)}%`,
          jwtVerificationRate: `${Math.round(100 - currentMetrics.jwtVerificationMetrics.authServerRate)}%`,
          errorRate: `${Math.round(currentMetrics.failedAuthentications / Math.max(currentMetrics.authenticationAttempts, 1) * 100)}%`,
        },
      },
    };
  }

  /**
   * Start automated metrics collection
   */
  private startMetricsCollection(): void {
    this.intervalId = setInterval(() => {
      const metrics = this.getCurrentMetrics();
      
      // Add to history
      this.metricsHistory.push(metrics);
      
      // Trim history to retention limit
      if (this.metricsHistory.length > PERFORMANCE_CONFIG.HISTORY_RETENTION) {
        this.metricsHistory.shift();
      }
      
      // Reset current period stats
      this.resetPeriodStats();
      
      // Check for threshold alerts
      this.checkThresholdAlerts(metrics);
      
      // Log performance summary if enabled
      if (process.env.ENABLE_PERFORMANCE_LOGGING !== 'false') {
        console.log('Performance Summary:', {
          avgLatency: `${Math.round(metrics.avgLatency)}ms`,
          cacheHitRate: `${Math.round(metrics.authCacheMetrics.hit_rate)}%`,
          jwtVerificationSource: metrics.jwtVerificationMetrics.authServerRate < 10 ? 'local' : 'mixed',
          requestCount: metrics.requestCount,
        });
      }
    }, PERFORMANCE_CONFIG.METRICS_INTERVAL);
  }

  /**
   * Stop metrics collection
   */
  stopMetricsCollection(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Reset period statistics
   */
  private resetPeriodStats(): void {
    this.requestStats = {
      totalRequests: 0,
      publicRouteHits: 0,
      authenticationAttempts: 0,
      failedAuthentications: 0,
      latencies: [],
    };
    this.middlewareLatencies = [];
  }

  /**
   * Calculate percentile from array of numbers
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  }

  /**
   * Check for latency alerts
   */
  private checkLatencyAlerts(latencyMs: number): void {
    const thresholds = PERFORMANCE_CONFIG.ALERT_THRESHOLDS;
    
    if (latencyMs > thresholds.MIDDLEWARE_LATENCY_CRITICAL) {
      this.addAlert('critical', 'middleware_latency', latencyMs, thresholds.MIDDLEWARE_LATENCY_CRITICAL, 
        `Middleware latency ${latencyMs}ms exceeds critical threshold`);
    } else if (latencyMs > thresholds.MIDDLEWARE_LATENCY_WARNING) {
      this.addAlert('warning', 'middleware_latency', latencyMs, thresholds.MIDDLEWARE_LATENCY_WARNING,
        `Middleware latency ${latencyMs}ms exceeds warning threshold`);
    }
  }

  /**
   * Check for threshold-based alerts
   */
  private checkThresholdAlerts(metrics: MiddlewareMetrics & CacheMetrics): void {
    const thresholds = PERFORMANCE_CONFIG.ALERT_THRESHOLDS;
    
    // Cache hit rate alerts
    const cacheHitRate = metrics.authCacheMetrics.hit_rate;
    if (cacheHitRate < thresholds.CACHE_HIT_RATE_CRITICAL) {
      this.addAlert('critical', 'cache_hit_rate', cacheHitRate, thresholds.CACHE_HIT_RATE_CRITICAL,
        `Cache hit rate ${cacheHitRate.toFixed(1)}% below critical threshold`);
    } else if (cacheHitRate < thresholds.CACHE_HIT_RATE_WARNING) {
      this.addAlert('warning', 'cache_hit_rate', cacheHitRate, thresholds.CACHE_HIT_RATE_WARNING,
        `Cache hit rate ${cacheHitRate.toFixed(1)}% below warning threshold`);
    }
    
    // Auth server fallback rate alerts
    const authServerRate = metrics.jwtVerificationMetrics.authServerRate;
    if (authServerRate > thresholds.AUTH_SERVER_RATE_CRITICAL) {
      this.addAlert('critical', 'auth_server_rate', authServerRate, thresholds.AUTH_SERVER_RATE_CRITICAL,
        `Auth server fallback rate ${authServerRate.toFixed(1)}% above critical threshold`);
    } else if (authServerRate > thresholds.AUTH_SERVER_RATE_WARNING) {
      this.addAlert('warning', 'auth_server_rate', authServerRate, thresholds.AUTH_SERVER_RATE_WARNING,
        `Auth server fallback rate ${authServerRate.toFixed(1)}% above warning threshold`);
    }
  }

  /**
   * Add performance alert
   */
  private addAlert(type: 'warning' | 'critical', metric: string, value: number, threshold: number, description: string): void {
    const alert: PerformanceAlert = {
      type,
      metric,
      value,
      threshold,
      timestamp: Date.now(),
      description,
    };
    
    this.alerts.push(alert);
    
    // Trim alerts to last 100
    if (this.alerts.length > 100) {
      this.alerts.splice(0, this.alerts.length - 100);
    }
    
    // Log critical alerts
    if (type === 'critical') {
      console.error('Performance Alert (Critical):', description);
    } else {
      console.warn('Performance Alert (Warning):', description);
    }
  }

  /**
   * Calculate overall health status
   */
  private calculateHealthStatus(metrics: MiddlewareMetrics & CacheMetrics, alerts: PerformanceAlert[]): 'healthy' | 'warning' | 'critical' {
    const criticalAlerts = alerts.filter(a => a.type === 'critical');
    const warningAlerts = alerts.filter(a => a.type === 'warning');
    
    if (criticalAlerts.length > 0) return 'critical';
    if (warningAlerts.length > 2) return 'warning';
    
    // Check key metrics
    if (metrics.avgLatency > 100 || metrics.authCacheMetrics.hit_rate < 50) return 'critical';
    if (metrics.avgLatency > 75 || metrics.authCacheMetrics.hit_rate < 70) return 'warning';
    
    return 'healthy';
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics() {
    return {
      timestamp: Date.now(),
      metrics: this.getCurrentMetrics(),
      alerts: this.getActiveAlerts(),
      history: this.metricsHistory.slice(-10), // Last 10 data points
    };
  }
}

// Singleton instance
export const performanceTracker = new PerformanceTracker();

// Export configuration for testing
export { PERFORMANCE_CONFIG };

// Helper function to format metrics for logging
export function formatMetricsForLogging(metrics: MiddlewareMetrics & CacheMetrics): string {
  return [
    `Latency: ${Math.round(metrics.avgLatency)}ms (p95: ${Math.round(metrics.p95Latency)}ms)`,
    `Cache Hit Rate: ${Math.round(metrics.authCacheMetrics.hit_rate)}%`,
    `JWT Local: ${Math.round(100 - metrics.jwtVerificationMetrics.authServerRate)}%`,
    `Requests: ${metrics.requestCount}`,
  ].join(' | ');
}