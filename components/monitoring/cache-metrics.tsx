'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatBytes } from '@/lib/utils';

interface CacheData {
  name: string;
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsage: number;
  maxSize?: number;
}

export function CacheMetrics() {
  const [cacheData, setCacheData] = useState<CacheData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCacheData = async () => {
      try {
        const response = await fetch('/api/monitoring/cache');
        const data = await response.json();
        setCacheData(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching cache data:', error);
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchCacheData();

    // Set up polling every 5 seconds
    const interval = setInterval(fetchCacheData, 5000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-2 w-full bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalMemory = cacheData.reduce((sum, cache) => sum + cache.memoryUsage, 0);
  const totalEntries = cacheData.reduce((sum, cache) => sum + cache.size, 0);
  const averageHitRate = cacheData.length > 0 
    ? cacheData.reduce((sum, cache) => sum + cache.hitRate, 0) / cacheData.length 
    : 0;

  const getHitRateBadgeVariant = (hitRate: number) => {
    if (hitRate >= 0.8) return 'default';
    if (hitRate >= 0.6) return 'secondary';
    if (hitRate >= 0.4) return 'outline';
    return 'destructive';
  };

  return (
    <div className="space-y-4">
      {/* Cache Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Memory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(totalMemory)}
            </div>
            <div className="text-xs text-muted-foreground">
              Across {cacheData.length} caches
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalEntries.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              Cached items
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Hit Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(averageHitRate * 100).toFixed(1)}%
            </div>
            <Badge variant={getHitRateBadgeVariant(averageHitRate)} className="mt-2">
              {averageHitRate >= 0.8 ? 'Excellent' : 
               averageHitRate >= 0.6 ? 'Good' : 
               averageHitRate >= 0.4 ? 'Fair' : 'Poor'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Individual Cache Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Cache Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cacheData.map((cache) => (
              <div key={cache.name} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{cache.name}</h4>
                  <Badge variant={getHitRateBadgeVariant(cache.hitRate)}>
                    {(cache.hitRate * 100).toFixed(1)}%
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Entries</div>
                    <div className="font-medium">{cache.size.toLocaleString()}</div>
                    {cache.maxSize && (
                      <Progress 
                        value={(cache.size / cache.maxSize) * 100} 
                        className="mt-1 h-1"
                      />
                    )}
                  </div>
                  
                  <div>
                    <div className="text-muted-foreground">Memory</div>
                    <div className="font-medium">{formatBytes(cache.memoryUsage)}</div>
                  </div>
                  
                  <div>
                    <div className="text-muted-foreground">Hits</div>
                    <div className="font-medium">{cache.hits.toLocaleString()}</div>
                  </div>
                  
                  <div>
                    <div className="text-muted-foreground">Misses</div>
                    <div className="font-medium">{cache.misses.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cache Efficiency Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Hit Rate Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {cacheData.map((cache) => (
              <div key={cache.name} className="flex items-center space-x-4">
                <div className="w-32 text-sm truncate">{cache.name}</div>
                <div className="flex-1">
                  <Progress value={cache.hitRate * 100} className="h-2" />
                </div>
                <div className="text-sm font-medium w-12">
                  {(cache.hitRate * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}