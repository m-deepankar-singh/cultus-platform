import { performance } from 'perf_hooks';

// Only import prom-client on server side
let register: any;
let Gauge: any;
let Counter: any;
let Histogram: any;

if (typeof window === 'undefined') {
  try {
    import('prom-client').then((promClient) => {
      register = promClient.register;
      Gauge = promClient.Gauge;
      Counter = promClient.Counter;
      Histogram = promClient.Histogram;
    }).catch(error => {
      console.warn('prom-client not available:', error);
    });
  } catch (error) {
    console.warn('prom-client not available:', error);
  }
}

export enum MemoryPressureLevel {
  NORMAL = 'normal',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

export interface MemoryStats {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
  timestamp: number;
  pressureLevel: MemoryPressureLevel;
  memoryUsagePercent: number;
}

export interface MemoryThresholds {
  warning: number;
  critical: number;
  emergency: number;
}

class MemoryMonitor {
  private static instance: MemoryMonitor;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private listeners: ((stats: MemoryStats) => void)[] = [];
  private history: MemoryStats[] = [];
  private maxHistorySize = 1000;

  private readonly thresholds: MemoryThresholds = {
    warning: 0.7,   // 70%
    critical: 0.85, // 85%
    emergency: 0.95 // 95%
  };

  // Prometheus metrics
  private readonly memoryUsageGauge: any;
  private readonly memoryPressureGauge: any;
  private readonly memoryEventsCounter: any;
  private readonly memoryHistogram: any;

  private constructor() {
    // Initialize metrics only on server side
    if (typeof window === 'undefined' && Gauge && Counter && Histogram) {
      this.memoryUsageGauge = new Gauge({
        name: 'memory_usage_bytes',
        help: 'Current memory usage in bytes',
        labelNames: ['type']
      });

      this.memoryPressureGauge = new Gauge({
        name: 'memory_pressure_level',
        help: 'Current memory pressure level (0=normal, 1=warning, 2=critical, 3=emergency)',
      });

      this.memoryEventsCounter = new Counter({
        name: 'memory_events_total',
        help: 'Total number of memory events',
        labelNames: ['level']
      });

      this.memoryHistogram = new Histogram({
        name: 'memory_usage_histogram',
        help: 'Memory usage distribution',
        buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
      });

      // Register metrics
      if (register) {
        register.registerMetric(this.memoryUsageGauge);
        register.registerMetric(this.memoryPressureGauge);
        register.registerMetric(this.memoryEventsCounter);
        register.registerMetric(this.memoryHistogram);
      }
    }
  }

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  start(intervalMs: number = 5000): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.collect();
    }, intervalMs);

    // Initial collection
    this.collect();
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  onMemoryChange(listener: (stats: MemoryStats) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  getLatestStats(): MemoryStats | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  getHistory(maxEntries?: number): MemoryStats[] {
    const entries = maxEntries || this.history.length;
    return this.history.slice(-entries);
  }

  private collect(): void {
    const memoryUsage = process.memoryUsage();
    const timestamp = Date.now();

    // Calculate memory pressure based on heap usage
    const memoryUsagePercent = memoryUsage.heapUsed / memoryUsage.heapTotal;
    const pressureLevel = this.calculatePressureLevel(memoryUsagePercent);

    const stats: MemoryStats = {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers,
      timestamp,
      pressureLevel,
      memoryUsagePercent
    };

    // Update Prometheus metrics
    this.updateMetrics(stats);

    // Add to history
    this.history.push(stats);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(stats);
      } catch (error) {
        console.error('Error in memory monitor listener:', error);
      }
    });
  }

  private calculatePressureLevel(memoryUsagePercent: number): MemoryPressureLevel {
    if (memoryUsagePercent >= this.thresholds.emergency) {
      return MemoryPressureLevel.EMERGENCY;
    } else if (memoryUsagePercent >= this.thresholds.critical) {
      return MemoryPressureLevel.CRITICAL;
    } else if (memoryUsagePercent >= this.thresholds.warning) {
      return MemoryPressureLevel.WARNING;
    }
    return MemoryPressureLevel.NORMAL;
  }

  private updateMetrics(stats: MemoryStats): void {
    // Update gauges only if available (server side)
    if (this.memoryUsageGauge) {
      this.memoryUsageGauge.set({ type: 'rss' }, stats.rss);
      this.memoryUsageGauge.set({ type: 'heap_total' }, stats.heapTotal);
      this.memoryUsageGauge.set({ type: 'heap_used' }, stats.heapUsed);
      this.memoryUsageGauge.set({ type: 'external' }, stats.external);
      this.memoryUsageGauge.set({ type: 'array_buffers' }, stats.arrayBuffers);
    }

    // Update pressure level
    if (this.memoryPressureGauge) {
      const pressureValue = this.pressureLevelToNumber(stats.pressureLevel);
      this.memoryPressureGauge.set(pressureValue);
    }

    // Update histogram
    if (this.memoryHistogram) {
      this.memoryHistogram.observe(stats.memoryUsagePercent);
    }

    // Count events for non-normal pressure levels
    if (this.memoryEventsCounter && stats.pressureLevel !== MemoryPressureLevel.NORMAL) {
      this.memoryEventsCounter.inc({ level: stats.pressureLevel });
    }
  }

  private pressureLevelToNumber(level: MemoryPressureLevel): number {
    switch (level) {
      case MemoryPressureLevel.NORMAL:
        return 0;
      case MemoryPressureLevel.WARNING:
        return 1;
      case MemoryPressureLevel.CRITICAL:
        return 2;
      case MemoryPressureLevel.EMERGENCY:
        return 3;
      default:
        return 0;
    }
  }

  getCurrentMemoryUsage(): number {
    const memoryUsage = process.memoryUsage();
    return memoryUsage.heapUsed / memoryUsage.heapTotal;
  }

  getMemoryInfo(): {
    usage: NodeJS.MemoryUsage;
    pressureLevel: MemoryPressureLevel;
    uptime: number;
  } {
    const usage = process.memoryUsage();
    const memoryUsagePercent = usage.heapUsed / usage.heapTotal;
    const pressureLevel = this.calculatePressureLevel(memoryUsagePercent);

    return {
      usage,
      pressureLevel,
      uptime: process.uptime()
    };
  }

  setThresholds(thresholds: Partial<MemoryThresholds>): void {
    Object.assign(this.thresholds, thresholds);
  }

  getThresholds(): MemoryThresholds {
    return { ...this.thresholds };
  }

  // Utility methods for formatting
  formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  formatPercent(value: number): string {
    return (value * 100).toFixed(2) + '%';
  }
}

export const memoryMonitor = MemoryMonitor.getInstance();
export default memoryMonitor;