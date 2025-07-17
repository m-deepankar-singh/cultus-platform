'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Clock, Database, Zap, TrendingUp } from 'lucide-react';

interface AuthPerformanceMetrics {
  phase: string;
  timestamp: string;
  database: {
    rpc_function_stats: Array<{
      function_name: string;
      total_calls: number;
      avg_execution_time: number;
      cache_hit_ratio: number;
    }>;
    materialized_view_stats: {
      view_name: string;
      total_rows: number;
      last_refresh: string;
      size_mb: number;
    };
    query_performance: {
      avg_auth_query_time: number;
      slow_query_count: number;
    };
  };
  redis: {
    cache_hits: number;
    cache_misses: number;
    hit_rate: number;
    avg_response_time: number;
    database_fallbacks: number;
  };
  application: {
    auth_requests_per_minute: number;
    avg_auth_response_time: number;
    concurrent_users: number;
    error_rate: number;
  };
}

interface PerformanceReport {
  current_metrics: AuthPerformanceMetrics;
  trends: {
    cache_hit_rate_trend: Array<{ timestamp: string; hit_rate: number }>;
    response_time_trend: Array<{ timestamp: string; avg_response_time: number }>;
    database_fallback_trend: Array<{ timestamp: string; fallbacks: number }>;
  };
  summary: {
    total_users_cached: number;
    cache_effectiveness: number;
    performance_improvement: {
      response_time_improvement: number;
      cache_hit_improvement: number;
      overall_score: number;
    };
    recommendations: Array<{
      type: string;
      priority: string;
      message: string;
    }>;
  };
}

export default function AuthPerformanceDashboard() {
  const [metrics, setMetrics] = useState<AuthPerformanceMetrics | null>(null);
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/monitoring/auth-performance?action=metrics');
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/monitoring/auth-performance?action=report');
      if (!response.ok) throw new Error('Failed to fetch report');
      const data = await response.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchReport();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchMetrics();
      fetchReport();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading && !metrics) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading performance metrics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>Error loading metrics: {error}</span>
            </div>
            <Button onClick={() => { setError(null); fetchMetrics(); }} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Authentication Performance Monitor</h1>
          <p className="text-gray-600">Phase 2 - Redis + RPC Hybrid Implementation</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchMetrics} variant="outline" size="sm">
            Refresh Metrics
          </Button>
          <Button onClick={fetchReport} variant="outline" size="sm">
            Generate Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="redis">Redis Cache</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.redis.hit_rate?.toFixed(1) || '0.0'}%</div>
                <Progress value={metrics?.redis.hit_rate || 0} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.redis.avg_response_time?.toFixed(1) || '0.0'}ms</div>
                <p className="text-xs text-muted-foreground">
                  Target: &lt;50ms
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Users Cached</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.database.materialized_view_stats?.total_rows || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Materialized view size
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">DB Fallbacks</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.redis.database_fallbacks || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Lower is better
                </p>
              </CardContent>
            </Card>
          </div>

          {report && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {report?.summary?.performance_improvement?.overall_score?.toFixed(1) || '0.0'}%
                    </div>
                    <p className="text-sm text-gray-600">Overall Improvement</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {report?.summary?.cache_effectiveness?.toFixed(1) || '0.0'}%
                    </div>
                    <p className="text-sm text-gray-600">Cache Effectiveness</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {report?.summary?.total_users_cached || 0}
                    </div>
                    <p className="text-sm text-gray-600">Total Users Cached</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>RPC Function Performance</CardTitle>
              <CardDescription>Database function execution statistics</CardDescription>
            </CardHeader>
            <CardContent>
              {(metrics?.database?.rpc_function_stats?.length || 0) > 0 ? (
                metrics?.database?.rpc_function_stats?.map((stat, index) => (
                  <div key={index} className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{stat.function_name}</h4>
                      <p className="text-sm text-gray-600">Total calls: {stat.total_calls}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{stat?.avg_execution_time?.toFixed(1) || '0.0'}ms</div>
                      <div className="text-sm text-gray-600">Hit ratio: {stat?.cache_hit_ratio || 0}%</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No RPC function stats available</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Materialized View Stats</CardTitle>
              <CardDescription>Cache view performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>View Name:</span>
                  <span className="font-mono">{metrics?.database?.materialized_view_stats?.view_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Rows:</span>
                  <span className="font-bold">{metrics?.database?.materialized_view_stats?.total_rows || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Size:</span>
                  <span>{metrics?.database?.materialized_view_stats?.size_mb?.toFixed(2) || '0.00'} MB</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Refresh:</span>
                  <span className="text-sm">{new Date(metrics?.database?.materialized_view_stats?.last_refresh || '').toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="redis" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Cache Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Cache Hits:</span>
                  <span className="font-bold text-green-600">{metrics?.redis?.cache_hits || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cache Misses:</span>
                  <span className="font-bold text-red-600">{metrics?.redis?.cache_misses || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hit Rate:</span>
                  <span className="font-bold">{metrics?.redis?.hit_rate?.toFixed(1) || '0.0'}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Response Time:</span>
                  <span className="font-bold">{metrics?.redis?.avg_response_time?.toFixed(1) || '0.0'}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Database Fallbacks:</span>
                  <span className="font-bold">{metrics?.redis?.database_fallbacks || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  {(metrics?.redis?.hit_rate || 0) > 90 ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span>Cache Hit Rate</span>
                  <Badge variant={(metrics?.redis?.hit_rate || 0) > 90 ? 'default' : 'secondary'}>
                    {(metrics?.redis?.hit_rate || 0) > 90 ? 'Excellent' : 'Needs Improvement'}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  {(metrics?.redis?.avg_response_time || 0) < 50 ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span>Response Time</span>
                  <Badge variant={(metrics?.redis?.avg_response_time || 0) < 50 ? 'default' : 'secondary'}>
                    {(metrics?.redis?.avg_response_time || 0) < 50 ? 'Fast' : 'Slow'}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  {(metrics?.redis?.database_fallbacks || 0) < 10 ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span>Fallback Rate</span>
                  <Badge variant={(metrics?.redis?.database_fallbacks || 0) < 10 ? 'default' : 'destructive'}>
                    {(metrics?.redis?.database_fallbacks || 0) < 10 ? 'Low' : 'High'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Recommendations</CardTitle>
              <CardDescription>Actionable insights to improve authentication performance</CardDescription>
            </CardHeader>
            <CardContent>
              {(report?.summary?.recommendations?.length || 0) === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No recommendations at this time. Your authentication system is performing well!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {report?.summary?.recommendations?.map((rec, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                      <AlertCircle className={`h-5 w-5 mt-1 ${
                        rec.priority === 'high' ? 'text-red-500' : 
                        rec.priority === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                      }`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'secondary' : 'default'}>
                            {rec.priority.toUpperCase()}
                          </Badge>
                          <span className="font-medium capitalize">{rec.type.replace('_', ' ')}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{rec.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}