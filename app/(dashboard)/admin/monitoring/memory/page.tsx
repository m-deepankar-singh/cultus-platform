import { Metadata } from 'next';
import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Activity, Database, Zap } from 'lucide-react';
import { MemoryChart } from '@/components/monitoring/memory-chart';
import { CacheMetrics } from '@/components/monitoring/cache-metrics';
import { AlertsPanel } from '@/components/monitoring/alerts-panel';
import { SystemHealth } from '@/components/monitoring/system-health';

export const metadata: Metadata = {
  title: 'Memory Monitoring - Cultus Platform',
  description: 'Monitor memory usage, cache performance, and system health',
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <Skeleton className="h-4 w-24" />
              </CardTitle>
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle><Skeleton className="h-6 w-32" /></CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle><Skeleton className="h-6 w-32" /></CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MemoryOverview() {
  return (
    <div className="space-y-6">
      {/* System Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health
          </CardTitle>
          <CardDescription>
            Overall system health and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SystemHealth />
        </CardContent>
      </Card>

      {/* Memory Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Memory Usage
          </CardTitle>
          <CardDescription>
            Real-time memory usage and pressure levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MemoryChart />
        </CardContent>
      </Card>

      {/* Cache Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Cache Performance
          </CardTitle>
          <CardDescription>
            Cache hit rates, memory usage, and efficiency metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CacheMetrics />
        </CardContent>
      </Card>

      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Active Alerts
          </CardTitle>
          <CardDescription>
            Current system alerts and notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertsPanel />
        </CardContent>
      </Card>
    </div>
  );
}

export default function MemoryMonitoringPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Memory Monitoring</h2>
        <Badge variant="secondary" className="hidden md:inline-flex">
          Real-time
        </Badge>
      </div>
      
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Memory monitoring is active. This dashboard refreshes every 5 seconds to provide real-time insights.
        </AlertDescription>
      </Alert>

      <Suspense fallback={<LoadingSkeleton />}>
        <MemoryOverview />
      </Suspense>
    </div>
  );
}