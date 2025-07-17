'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertTriangle, XCircle, Activity } from 'lucide-react';
import { formatBytes } from '@/lib/utils';

interface HealthStatus {
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
}

export function SystemHealth() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHealthStatus = async () => {
      try {
        const response = await fetch('/api/monitoring/health');
        const data = await response.json();
        setHealthStatus(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching health status:', error);
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchHealthStatus();

    // Set up polling every 10 seconds
    const interval = setInterval(fetchHealthStatus, 10000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!healthStatus) {
    return (
      <div className="text-center py-8 text-gray-500">
        <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
        <p>Unable to fetch health status</p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-8 w-8 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-8 w-8 text-red-500" />;
      default:
        return <Activity className="h-8 w-8 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'default';
      case 'degraded':
        return 'secondary';
      case 'unhealthy':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const memoryPercent = healthStatus.memory.usage * 100;

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <div className="flex items-center space-x-4">
        {getStatusIcon(healthStatus.status)}
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold">System Status</h3>
            <Badge variant={getStatusBadgeVariant(healthStatus.status)}>
              {healthStatus.status.toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Uptime: {formatUptime(healthStatus.uptime)}
          </p>
        </div>
      </div>

      {/* Health Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {memoryPercent.toFixed(1)}%
            </div>
            <Progress value={memoryPercent} className="mb-2" />
            <div className="text-xs text-muted-foreground">
              {healthStatus.memory.formatted} used
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cache Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {(healthStatus.cache.averageHitRate * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              Hit rate across {healthStatus.cache.totalEntries.toLocaleString()} entries
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cache Memory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {formatBytes(healthStatus.cache.totalMemory)}
            </div>
            <div className="text-xs text-muted-foreground">
              Total cache usage
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {healthStatus.alerts.active}
            </div>
            <div className="text-xs text-muted-foreground">
              {healthStatus.alerts.critical} critical, {healthStatus.alerts.emergency} emergency
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">System Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Memory</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Usage</span>
                  <span>{memoryPercent.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Pressure</span>
                  <Badge variant={healthStatus.memory.pressure === 'normal' ? 'default' : 'secondary'}>
                    {healthStatus.memory.pressure}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Cache</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total Memory</span>
                  <span>{formatBytes(healthStatus.cache.totalMemory)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hit Rate</span>
                  <span>{(healthStatus.cache.averageHitRate * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}