'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, TrendingUp, Database, Clock, Zap, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface CacheMetrics {
  total_entries: number;
  average_hits: number;
  max_hits: number;
  reused_entries: number;
  oldest_entry: string;
  newest_entry: string;
  expired_entries: number;
}

interface CacheEntry {
  cache_key: string;
  hit_count: number;
  created_at: string;
  expires_at: string;
  last_accessed: string;
  cache_tags: string[];
}

interface CacheStats {
  hitRate: number;
  topEntries: CacheEntry[];
  timestamp: string;
}

interface Efficiency {
  hitRate: number;
  activeEntries: number;
  expiredEntries: number;
  averageHitsPerEntry: number;
  topPerformingTags: any[];
}

interface ResponseTimeAnalysis {
  estimatedCacheHitTime: number;
  estimatedDatabaseQueryTime: number;
  potentialTimeSaved: number;
}

interface SystemStatus {
  healthy: boolean;
  recommendations: string[];
}

interface CacheMetricsResponse {
  overall: CacheMetrics;
  statistics: CacheStats;
  topEntries: CacheEntry[];
  efficiency: Efficiency;
  responseTimeAnalysis: ResponseTimeAnalysis;
  timestamp: string;
  systemStatus: SystemStatus;
}

export function CacheMetricsDashboard() {
  const [selectedAction, setSelectedAction] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: metricsData, isLoading, error } = useQuery({
    queryKey: ['cache-metrics'],
    queryFn: async (): Promise<CacheMetricsResponse> => {
      const response = await fetch('/api/admin/cache/metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch cache metrics');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const cacheMutation = useMutation({
    mutationFn: async (action: string) => {
      const response = await fetch(`/api/admin/cache/metrics?action=${action}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Cache operation failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cache-metrics'] });
      setSelectedAction('');
    },
  });

  const tagInvalidationMutation = useMutation({
    mutationFn: async (tags: string[]) => {
      const response = await fetch(`/api/admin/cache/metrics?action=clear_by_tags&tags=${tags.join(',')}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Tag invalidation failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cache-metrics'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-lg">Loading cache metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center text-red-700">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>Failed to load cache metrics: {error.message}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!metricsData) {
    return <div>No metrics data available</div>;
  }

  const { overall, efficiency, responseTimeAnalysis, systemStatus, topEntries } = metricsData;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Cache Performance Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Badge variant={systemStatus.healthy ? 'default' : 'destructive'}>
            {systemStatus.healthy ? 'Healthy' : 'Needs Attention'}
          </Badge>
          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['cache-metrics'] })}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Status Alert */}
      {!systemStatus.healthy && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
              <div>
                <h4 className="font-medium text-yellow-800 mb-2">System Recommendations</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {systemStatus.recommendations.map((rec, index) => (
                    <li key={index}>• {rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Database className="h-4 w-4 mr-1" />
              Total Cache Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overall?.total_entries || 0}</div>
            <p className="text-xs text-muted-foreground">
              {efficiency.activeEntries} active, {efficiency.expiredEntries} expired
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="h-4 w-4 mr-1" />
              Cache Hit Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{efficiency.hitRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {overall?.reused_entries || 0} cache hits
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Zap className="h-4 w-4 mr-1" />
              Performance Gain
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {((responseTimeAnalysis.estimatedDatabaseQueryTime - responseTimeAnalysis.estimatedCacheHitTime) / responseTimeAnalysis.estimatedDatabaseQueryTime * 100).toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              ~{Math.round(responseTimeAnalysis.potentialTimeSaved / 1000)}s saved
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Average Hits per Entry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{efficiency.averageHitsPerEntry?.toFixed(1) || '0'}</div>
            <p className="text-xs text-muted-foreground">
              Max: {overall?.max_hits || 0} hits
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="entries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="entries">Top Cache Entries</TabsTrigger>
          <TabsTrigger value="performance">Performance Analysis</TabsTrigger>
          <TabsTrigger value="management">Cache Management</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance & Health</TabsTrigger>
        </TabsList>

        <TabsContent value="entries">
          <Card>
            <CardHeader>
              <CardTitle>Most Accessed Cache Entries</CardTitle>
              <p className="text-sm text-muted-foreground">
                Top {topEntries.length} cache entries by hit count
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topEntries.map((entry, index) => {
                  const isExpired = new Date(entry.expires_at) <= new Date();
                  return (
                    <div key={entry.cache_key} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">#{index + 1}</span>
                          <code className="bg-gray-200 px-2 py-1 rounded text-xs">
                            {entry.cache_key.length > 50 ? `${entry.cache_key.substring(0, 50)}...` : entry.cache_key}
                          </code>
                          {isExpired && <Badge variant="destructive" className="text-xs">Expired</Badge>}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Tags: {entry.cache_tags.join(', ')}
                        </div>
                        <div className="text-xs text-gray-500">
                          Created: {new Date(entry.created_at).toLocaleString()} | 
                          Last accessed: {new Date(entry.last_accessed).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{entry.hit_count}</div>
                        <div className="text-xs text-gray-500">hits</div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => tagInvalidationMutation.mutate(entry.cache_tags)}
                          disabled={tagInvalidationMutation.isPending}
                          className="mt-1"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Response Time Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Cache Hit Time:</span>
                  <span className="font-bold text-green-600">{responseTimeAnalysis.estimatedCacheHitTime}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Database Query Time:</span>
                  <span className="font-bold text-red-600">{responseTimeAnalysis.estimatedDatabaseQueryTime}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Time Saved:</span>
                  <span className="font-bold text-blue-600">{Math.round(responseTimeAnalysis.potentialTimeSaved / 1000)}s</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-green-600 h-2.5 rounded-full" 
                    style={{ 
                      width: `${(responseTimeAnalysis.estimatedCacheHitTime / responseTimeAnalysis.estimatedDatabaseQueryTime) * 100}%` 
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500">
                  Cache is {Math.round((1 - responseTimeAnalysis.estimatedCacheHitTime / responseTimeAnalysis.estimatedDatabaseQueryTime) * 100)}% faster than database queries
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cache Efficiency Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Hit Rate:</span>
                  <span className={`font-bold ${efficiency.hitRate > 80 ? 'text-green-600' : efficiency.hitRate > 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {efficiency.hitRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Active Entries:</span>
                  <span className="font-bold">{efficiency.activeEntries}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Expired Entries:</span>
                  <span className={`font-bold ${efficiency.expiredEntries > 50 ? 'text-red-600' : 'text-gray-600'}`}>
                    {efficiency.expiredEntries}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Avg. Hits per Entry:</span>
                  <span className="font-bold">{efficiency.averageHitsPerEntry.toFixed(1)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="management">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cache Cleanup Actions</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage cache entries and perform maintenance operations
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => {
                    setSelectedAction('cleanup_expired');
                    cacheMutation.mutate('cleanup_expired');
                  }}
                  disabled={cacheMutation.isPending}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clean Up Expired Entries ({efficiency.expiredEntries})
                </Button>
                
                <Button
                  onClick={() => {
                    if (confirm('This will clear ALL cache entries. Are you sure?')) {
                      setSelectedAction('clear_all');
                      cacheMutation.mutate('clear_all');
                    }
                  }}
                  disabled={cacheMutation.isPending}
                  variant="destructive"
                  className="w-full justify-start"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Clear All Cache
                </Button>

                {cacheMutation.isPending && (
                  <div className="flex items-center text-sm text-gray-600">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Executing {selectedAction}...
                  </div>
                )}

                {cacheMutation.isSuccess && (
                  <div className="text-sm text-green-600 font-medium">
                    ✓ Operation completed successfully
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={() => tagInvalidationMutation.mutate(['expert_sessions'])}
                  disabled={tagInvalidationMutation.isPending}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  Clear Expert Sessions Cache
                </Button>
                <Button
                  onClick={() => tagInvalidationMutation.mutate(['product_performance'])}
                  disabled={tagInvalidationMutation.isPending}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  Clear Analytics Cache
                </Button>
                <Button
                  onClick={() => tagInvalidationMutation.mutate(['student_progress'])}
                  disabled={tagInvalidationMutation.isPending}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  Clear Student Progress Cache
                </Button>
                
                {tagInvalidationMutation.isPending && (
                  <div className="text-xs text-gray-500 mt-2">
                    <RefreshCw className="h-3 w-3 animate-spin inline mr-1" />
                    Invalidating cache...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="maintenance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cache Health Status</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Automated health analysis and recommendations
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => {
                    fetch('/api/admin/cache/maintenance?action=health_check', { method: 'POST' })
                      .then(res => res.json())
                      .then(data => {
                        console.log('Health check results:', data);
                        queryClient.invalidateQueries({ queryKey: ['cache-metrics'] });
                      })
                      .catch(console.error);
                  }}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Run Health Check
                </Button>
                
                <Button
                  onClick={() => {
                    fetch('/api/admin/cache/maintenance?action=cleanup_stats&days=7', { method: 'POST' })
                      .then(res => res.json())
                      .then(data => {
                        console.log('Cleanup stats:', data);
                      })
                      .catch(console.error);
                  }}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Cleanup History
                </Button>

                <Button
                  onClick={() => {
                    fetch('/api/admin/cache/maintenance?action=optimize_cache', { method: 'POST' })
                      .then(res => res.json())
                      .then(data => {
                        console.log('Optimization results:', data);
                        queryClient.invalidateQueries({ queryKey: ['cache-metrics'] });
                      })
                      .catch(console.error);
                  }}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Optimize Cache
                </Button>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Emergency Actions</h4>
                  <Button
                    onClick={() => {
                      if (confirm('This will clear ALL cache entries. Are you sure?')) {
                        const confirmToken = prompt('Type "EMERGENCY_CLEAR_CONFIRMED" to proceed:');
                        if (confirmToken === 'EMERGENCY_CLEAR_CONFIRMED') {
                          fetch(`/api/admin/cache/maintenance?action=emergency_clear&confirm=${confirmToken}`, { method: 'POST' })
                            .then(res => res.json())
                            .then(data => {
                              console.log('Emergency clear results:', data);
                              queryClient.invalidateQueries({ queryKey: ['cache-metrics'] });
                            })
                            .catch(console.error);
                        }
                      }
                    }}
                    variant="destructive"
                    size="sm"
                    className="w-full"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Emergency Clear All
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Maintenance Operations</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Advanced cache maintenance and cleanup tools
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Automated Cleanup</h4>
                  <Button
                    onClick={() => {
                      fetch('/api/admin/cache/maintenance?action=cleanup_expired', { method: 'POST' })
                        .then(res => res.json())
                        .then(data => {
                          console.log('Cleanup results:', data);
                          queryClient.invalidateQueries({ queryKey: ['cache-metrics'] });
                        })
                        .catch(console.error);
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clean Expired Entries
                  </Button>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Selective Cleanup</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => {
                        fetch('/api/admin/cache/maintenance?action=selective_clear', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ tags: ['test', 'temp'], older_than_hours: 1 })
                        })
                          .then(res => res.json())
                          .then(data => {
                            console.log('Selective clear results:', data);
                            queryClient.invalidateQueries({ queryKey: ['cache-metrics'] });
                          })
                          .catch(console.error);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Clear Test Data
                    </Button>
                    <Button
                      onClick={() => {
                        fetch('/api/admin/cache/maintenance?action=selective_clear', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ older_than_hours: 24 })
                        })
                          .then(res => res.json())
                          .then(data => {
                            console.log('Old data clear results:', data);
                            queryClient.invalidateQueries({ queryKey: ['cache-metrics'] });
                          })
                          .catch(console.error);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Clear Old Entries
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  <p>💡 Maintenance operations will automatically refresh metrics</p>
                  <p>🔍 Check browser console for detailed operation results</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="text-xs text-gray-500 text-center">
        Last updated: {new Date(metricsData.timestamp).toLocaleString()}
      </div>
    </div>
  );
} 