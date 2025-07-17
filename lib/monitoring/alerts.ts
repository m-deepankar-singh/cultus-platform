import { MemoryStats, MemoryPressureLevel } from './memory-monitor';
import { CacheStats } from './cache-monitor';
import { Counter, Gauge } from 'prom-client';

export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

export interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
  timestamp: number;
  acknowledged: boolean;
  resolved: boolean;
  metadata?: Record<string, any>;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (data: any) => boolean;
  level: AlertLevel;
  message: string;
  cooldownMs: number;
  enabled: boolean;
}

export interface AlertHandler {
  id: string;
  name: string;
  handler: (alert: Alert) => Promise<void>;
  levels: AlertLevel[];
  enabled: boolean;
}

class AlertManager {
  private static instance: AlertManager;
  private alerts: Alert[] = [];
  private rules: AlertRule[] = [];
  private handlers: AlertHandler[] = [];
  private lastAlertTime = new Map<string, number>();
  private maxAlerts = 1000;

  // Prometheus metrics
  private readonly alertsCounter = new Counter({
    name: 'alerts_total',
    help: 'Total number of alerts fired',
    labelNames: ['level', 'rule']
  });

  private readonly activeAlertsGauge = new Gauge({
    name: 'active_alerts',
    help: 'Number of active alerts',
    labelNames: ['level']
  });

  private constructor() {
    this.setupDefaultRules();
    this.setupDefaultHandlers();
  }

  static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  private setupDefaultRules(): void {
    // Memory pressure rules
    this.addRule({
      id: 'memory_warning',
      name: 'Memory Usage Warning',
      condition: (stats: MemoryStats) => stats.pressureLevel === MemoryPressureLevel.WARNING,
      level: AlertLevel.WARNING,
      message: 'Memory usage has reached warning threshold (70%)',
      cooldownMs: 5 * 60 * 1000, // 5 minutes
      enabled: true
    });

    this.addRule({
      id: 'memory_critical',
      name: 'Memory Usage Critical',
      condition: (stats: MemoryStats) => stats.pressureLevel === MemoryPressureLevel.CRITICAL,
      level: AlertLevel.CRITICAL,
      message: 'Memory usage has reached critical threshold (85%)',
      cooldownMs: 2 * 60 * 1000, // 2 minutes
      enabled: true
    });

    this.addRule({
      id: 'memory_emergency',
      name: 'Memory Usage Emergency',
      condition: (stats: MemoryStats) => stats.pressureLevel === MemoryPressureLevel.EMERGENCY,
      level: AlertLevel.EMERGENCY,
      message: 'Memory usage has reached emergency threshold (95%)',
      cooldownMs: 30 * 1000, // 30 seconds
      enabled: true
    });

    // Cache performance rules
    this.addRule({
      id: 'cache_low_hit_rate',
      name: 'Low Cache Hit Rate',
      condition: (stats: CacheStats[]) => {
        const avgHitRate = stats.reduce((sum, cache) => sum + cache.hitRate, 0) / stats.length;
        return avgHitRate < 0.5; // Less than 50% hit rate
      },
      level: AlertLevel.WARNING,
      message: 'Average cache hit rate is below 50%',
      cooldownMs: 10 * 60 * 1000, // 10 minutes
      enabled: true
    });

    this.addRule({
      id: 'cache_memory_high',
      name: 'High Cache Memory Usage',
      condition: (stats: CacheStats[]) => {
        const totalMemory = stats.reduce((sum, cache) => sum + cache.memoryUsage, 0);
        return totalMemory > 100 * 1024 * 1024; // More than 100MB
      },
      level: AlertLevel.WARNING,
      message: 'Total cache memory usage exceeds 100MB',
      cooldownMs: 5 * 60 * 1000, // 5 minutes
      enabled: true
    });
  }

  private setupDefaultHandlers(): void {
    // Console logger handler
    this.addHandler({
      id: 'console_logger',
      name: 'Console Logger',
      handler: async (alert: Alert) => {
        const timestamp = new Date(alert.timestamp).toISOString();
        const color = this.getConsoleColor(alert.level);
        console.log(`${color}[${alert.level.toUpperCase()}] ${timestamp} - ${alert.title}: ${alert.message}\x1b[0m`);
      },
      levels: [AlertLevel.INFO, AlertLevel.WARNING, AlertLevel.CRITICAL, AlertLevel.EMERGENCY],
      enabled: true
    });

    // File logger handler (if needed)
    this.addHandler({
      id: 'file_logger',
      name: 'File Logger',
      handler: async (alert: Alert) => {
        // Implementation would write to log file
        // For now, just console.error for critical and emergency
        if (alert.level === AlertLevel.CRITICAL || alert.level === AlertLevel.EMERGENCY) {
          console.error(`ALERT: ${alert.title} - ${alert.message}`, alert.metadata);
        }
      },
      levels: [AlertLevel.CRITICAL, AlertLevel.EMERGENCY],
      enabled: true
    });
  }

  private getConsoleColor(level: AlertLevel): string {
    switch (level) {
      case AlertLevel.INFO:
        return '\x1b[36m'; // Cyan
      case AlertLevel.WARNING:
        return '\x1b[33m'; // Yellow
      case AlertLevel.CRITICAL:
        return '\x1b[31m'; // Red
      case AlertLevel.EMERGENCY:
        return '\x1b[35m'; // Magenta
      default:
        return '\x1b[0m';  // Reset
    }
  }

  addRule(rule: AlertRule): void {
    this.rules.push(rule);
  }

  removeRule(id: string): void {
    this.rules = this.rules.filter(rule => rule.id !== id);
  }

  addHandler(handler: AlertHandler): void {
    this.handlers.push(handler);
  }

  removeHandler(id: string): void {
    this.handlers = this.handlers.filter(handler => handler.id !== id);
  }

  async checkMemoryAlerts(stats: MemoryStats): Promise<void> {
    const memoryRules = this.rules.filter(rule => 
      rule.enabled && rule.id.startsWith('memory_')
    );

    for (const rule of memoryRules) {
      if (rule.condition(stats)) {
        await this.fireAlert(rule, stats);
      }
    }
  }

  async checkCacheAlerts(stats: CacheStats[]): Promise<void> {
    const cacheRules = this.rules.filter(rule => 
      rule.enabled && rule.id.startsWith('cache_')
    );

    for (const rule of cacheRules) {
      if (rule.condition(stats)) {
        await this.fireAlert(rule, stats);
      }
    }
  }

  private async fireAlert(rule: AlertRule, metadata: any): Promise<void> {
    const now = Date.now();
    const lastAlert = this.lastAlertTime.get(rule.id) || 0;

    // Check cooldown
    if (now - lastAlert < rule.cooldownMs) {
      return;
    }

    const alert: Alert = {
      id: `${rule.id}_${now}`,
      level: rule.level,
      title: rule.name,
      message: rule.message,
      timestamp: now,
      acknowledged: false,
      resolved: false,
      metadata
    };

    this.alerts.push(alert);
    this.lastAlertTime.set(rule.id, now);

    // Trim alerts if too many
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }

    // Update metrics
    this.alertsCounter.inc({ level: alert.level, rule: rule.id });
    this.updateActiveAlertsMetrics();

    // Execute handlers
    await this.executeHandlers(alert);
  }

  private async executeHandlers(alert: Alert): Promise<void> {
    const applicableHandlers = this.handlers.filter(handler => 
      handler.enabled && handler.levels.includes(alert.level)
    );

    const promises = applicableHandlers.map(handler => 
      handler.handler(alert).catch(error => {
        console.error(`Error in alert handler ${handler.name}:`, error);
      })
    );

    await Promise.all(promises);
  }

  private updateActiveAlertsMetrics(): void {
    const activeAlerts = this.alerts.filter(alert => !alert.resolved);
    const counts = {
      [AlertLevel.INFO]: 0,
      [AlertLevel.WARNING]: 0,
      [AlertLevel.CRITICAL]: 0,
      [AlertLevel.EMERGENCY]: 0
    };

    activeAlerts.forEach(alert => {
      counts[alert.level]++;
    });

    Object.entries(counts).forEach(([level, count]) => {
      this.activeAlertsGauge.set({ level }, count);
    });
  }

  acknowledgeAlert(id: string): void {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) {
      alert.acknowledged = true;
      this.updateActiveAlertsMetrics();
    }
  }

  resolveAlert(id: string): void {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) {
      alert.resolved = true;
      this.updateActiveAlertsMetrics();
    }
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  getAlertsByLevel(level: AlertLevel): Alert[] {
    return this.alerts.filter(alert => alert.level === level);
  }

  getRecentAlerts(minutes: number = 60): Alert[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.alerts.filter(alert => alert.timestamp > cutoff);
  }

  getAllAlerts(): Alert[] {
    return [...this.alerts];
  }

  getRules(): AlertRule[] {
    return [...this.rules];
  }

  getHandlers(): AlertHandler[] {
    return [...this.handlers];
  }

  enableRule(id: string): void {
    const rule = this.rules.find(r => r.id === id);
    if (rule) {
      rule.enabled = true;
    }
  }

  disableRule(id: string): void {
    const rule = this.rules.find(r => r.id === id);
    if (rule) {
      rule.enabled = false;
    }
  }

  enableHandler(id: string): void {
    const handler = this.handlers.find(h => h.id === id);
    if (handler) {
      handler.enabled = true;
    }
  }

  disableHandler(id: string): void {
    const handler = this.handlers.find(h => h.id === id);
    if (handler) {
      handler.enabled = false;
    }
  }

  getAlertSummary(): {
    total: number;
    active: number;
    acknowledged: number;
    resolved: number;
    byLevel: Record<AlertLevel, number>;
  } {
    const byLevel = {
      [AlertLevel.INFO]: 0,
      [AlertLevel.WARNING]: 0,
      [AlertLevel.CRITICAL]: 0,
      [AlertLevel.EMERGENCY]: 0
    };

    this.alerts.forEach(alert => {
      byLevel[alert.level]++;
    });

    return {
      total: this.alerts.length,
      active: this.alerts.filter(a => !a.resolved).length,
      acknowledged: this.alerts.filter(a => a.acknowledged).length,
      resolved: this.alerts.filter(a => a.resolved).length,
      byLevel
    };
  }
}

export const alertManager = AlertManager.getInstance();
export default alertManager;