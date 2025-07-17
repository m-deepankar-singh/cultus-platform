'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatBytes } from '@/lib/utils';

interface MemoryData {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  pressureLevel: string;
  memoryUsagePercent: number;
}

export function MemoryChart() {
  const [memoryData, setMemoryData] = useState<MemoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMemoryData = async () => {
      try {
        const response = await fetch('/api/monitoring/memory');
        const data = await response.json();
        setMemoryData(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching memory data:', error);
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchMemoryData();

    // Set up polling every 5 seconds
    const interval = setInterval(fetchMemoryData, 5000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  const latestData = memoryData[memoryData.length - 1];
  
  if (!latestData) {
    return (
      <div className="text-center py-8 text-gray-500">
        No memory data available
      </div>
    );
  }

  const getPressureBadgeVariant = (level: string) => {
    switch (level) {
      case 'normal':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'critical':
        return 'destructive';
      case 'emergency':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 95) return 'bg-red-500';
    if (percent >= 85) return 'bg-orange-500';
    if (percent >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const memoryPercent = latestData.memoryUsagePercent * 100;

  return (
    <div className="space-y-4">
      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Heap Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(latestData.heapUsed)}
            </div>
            <div className="text-xs text-muted-foreground">
              of {formatBytes(latestData.heapTotal)} total
            </div>
            <Progress 
              value={memoryPercent} 
              className="mt-2"
              // className={`mt-2 [&>div]:${getProgressColor(memoryPercent)}`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">RSS Memory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(latestData.rss)}
            </div>
            <div className="text-xs text-muted-foreground">
              Resident Set Size
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pressure Level</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={getPressureBadgeVariant(latestData.pressureLevel)}>
              {latestData.pressureLevel.toUpperCase()}
            </Badge>
            <div className="text-xs text-muted-foreground mt-2">
              {memoryPercent.toFixed(1)}% used
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Memory History Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Memory Usage History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between space-x-1">
            {memoryData.slice(-50).map((data, index) => {
              const height = (data.memoryUsagePercent * 100);
              const color = getProgressColor(height);
              
              return (
                <div
                  key={index}
                  className={`w-2 rounded-t transition-all duration-300 ${color}`}
                  style={{ height: `${height * 2}px` }}
                  title={`${new Date(data.timestamp).toLocaleTimeString()}: ${height.toFixed(1)}%`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>5 minutes ago</span>
            <span>Now</span>
          </div>
        </CardContent>
      </Card>

      {/* Memory Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Memory Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Heap Used</span>
                <span className="text-sm font-medium">
                  {formatBytes(latestData.heapUsed)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">External</span>
                <span className="text-sm font-medium">
                  {formatBytes(latestData.external)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Heap Total</span>
                <span className="text-sm font-medium">
                  {formatBytes(latestData.heapTotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">RSS</span>
                <span className="text-sm font-medium">
                  {formatBytes(latestData.rss)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}