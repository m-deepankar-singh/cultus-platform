'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Shield, Users, Activity, Clock, TrendingUp } from 'lucide-react';
import { SecurityEventType, SecuritySeverity, SecurityMetrics } from '@/lib/security/types';

interface SecurityDashboardProps {
  className?: string;
}

interface SecurityDashboardData {
  metrics: SecurityMetrics;
  recentEvents: SecurityEvent[];
  alerts: SecurityAlert[];
}

interface SecurityEvent {
  eventId: string;
  timestamp: string;
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  userId?: string;
  userRole?: string;
  ipAddress: string;
  endpoint?: string;
  details: Record<string, any>;
}

interface SecurityAlert {
  id: string;
  type: string;
  severity: SecuritySeverity;
  description: string;
  timestamp: string;
  actionRequired: boolean;
}

const SEVERITY_COLORS = {
  INFO: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  WARNING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  EMERGENCY: 'bg-red-500 text-white dark:bg-red-600 dark:text-white'
};

const EVENT_TYPE_ICONS = {
  AUTH_SUCCESS: '✅',
  AUTH_FAILURE: '❌',
  AUTH_TOKEN_EXPIRED: '🔐',
  SESSION_EXPIRED: '⏰',
  SESSION_REFRESHED: '🔄',
  ROLE_VALIDATION_FAILED: '🚷',
  RATE_LIMIT_EXCEEDED: '⚡',
  RATE_LIMIT_CHECK: '🔄',
  UNAUTHORIZED_ACCESS: '🚫',
  FILE_UPLOAD: '📁',
  FILE_ACCESS: '📂',
  SENSITIVE_DATA_ACCESS: '🔒',
  DATA_ACCESS_FAILURE: '💾',
  ADMIN_ACTION: '👤',
  BULK_OPERATION: '🔄',
  CONFIGURATION_ACCESS: '⚙️',
  SUSPICIOUS_ACTIVITY: '🔍',
  PRIVILEGE_ESCALATION: '⬆️',
  SYSTEM_ERROR: '💥',
  STUDENT_API_ACCESS: '📚',
  STUDENT_AUTH_SUCCESS: '✅',
  STUDENT_AUTH_FAILURE: '❌',
  STUDENT_SUBMISSION: '📤',
  STUDENT_PROGRESS: '📈'
};

export default function SecurityDashboard({ className = '' }: SecurityDashboardProps) {
  const [timeWindow, setTimeWindow] = useState('1h');
  const [dashboardData, setDashboardData] = useState<SecurityDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/security/dashboard?timeWindow=${timeWindow}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch security data');
      }
      
      const data = await response.json();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching security data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchSecurityData, 30000);
    return () => clearInterval(interval);
  }, [timeWindow]);

  const formatTimeWindow = (window: string) => {
    const windows: Record<string, string> = {
      '1h': 'Last Hour',
      '24h': 'Last 24 Hours',
      '7d': 'Last 7 Days',
      '30d': 'Last 30 Days'
    };
    return windows[window] || window;
  };

  const getSeverityIcon = (severity: SecuritySeverity) => {
    const icons = {
      INFO: '🔵',
      WARNING: '🟡',
      CRITICAL: '🔴',
      EMERGENCY: '🚨'
    };
    return icons[severity] || '⚪';
  };

  const getEventTypeDisplayName = (eventType: SecurityEventType) => {
    const names: Record<SecurityEventType, string> = {
      AUTH_SUCCESS: 'Authentication Success',
      AUTH_FAILURE: 'Authentication Failure',
      AUTH_TOKEN_EXPIRED: 'Token Expired',
      SESSION_EXPIRED: 'Session Expired',
      SESSION_REFRESHED: 'Session Refreshed',
      ROLE_VALIDATION_FAILED: 'Role Validation Failed',
      RATE_LIMIT_EXCEEDED: 'Rate Limit Exceeded',
      RATE_LIMIT_CHECK: 'Rate Limit Check',
      UNAUTHORIZED_ACCESS: 'Unauthorized Access',
      FILE_UPLOAD: 'File Upload',
      FILE_ACCESS: 'File Access',
      SENSITIVE_DATA_ACCESS: 'Sensitive Data Access',
      DATA_ACCESS_FAILURE: 'Data Access Failure',
      ADMIN_ACTION: 'Admin Action',
      BULK_OPERATION: 'Bulk Operation',
      CONFIGURATION_ACCESS: 'Configuration Access',
      SUSPICIOUS_ACTIVITY: 'Suspicious Activity',
      PRIVILEGE_ESCALATION: 'Privilege Escalation',
      SYSTEM_ERROR: 'System Error',
      STUDENT_API_ACCESS: 'Student API Access',
      STUDENT_AUTH_SUCCESS: 'Student Auth Success',
      STUDENT_AUTH_FAILURE: 'Student Auth Failure',
      STUDENT_SUBMISSION: 'Student Submission',
      STUDENT_PROGRESS: 'Student Progress'
    };
    return names[eventType] || eventType;
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span>Error loading security dashboard: {error}</span>
            </div>
            <Button onClick={fetchSecurityData} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { metrics, recentEvents, alerts } = dashboardData;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Security Dashboard</h2>
        <div className="flex items-center gap-4">
          <Select value={timeWindow} onValueChange={setTimeWindow}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchSecurityData} variant="outline" size="sm">
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics.totalEvents.toLocaleString()}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatTimeWindow(timeWindow)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Unique Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics.uniqueUsers.toLocaleString()}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Active users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Suspicious Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.suspiciousActivityCount.toLocaleString()}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Alerts Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics.alertsGenerated.toLocaleString()}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">System alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* Event Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Event Types Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.eventsByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {EVENT_TYPE_ICONS[type as SecurityEventType] || '📊'}
                    </span>
                    <span className="text-sm font-medium">
                      {getEventTypeDisplayName(type as SecurityEventType)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{
                          width: `${(count / metrics.totalEvents) * 100}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[3ch]">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Severity Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.eventsBySeverity).map(([severity, count]) => (
                <div key={severity} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {getSeverityIcon(severity as SecuritySeverity)}
                    </span>
                    <Badge variant="secondary" className={SEVERITY_COLORS[severity as SecuritySeverity]}>
                      {severity}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-red-600 h-2 rounded-full" 
                        style={{
                          width: `${(count / metrics.totalEvents) * 100}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[3ch]">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Security Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentEvents.map((event) => (
                <div key={event.eventId} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-shrink-0">
                    <Badge variant="secondary" className={SEVERITY_COLORS[event.severity]}>
                      {event.severity}
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {getEventTypeDisplayName(event.eventType)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {event.endpoint} • {event.ipAddress}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {recentEvents.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No recent events in the selected time window
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Active Security Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex-shrink-0">
                    <Badge variant="secondary" className={SEVERITY_COLORS[alert.severity]}>
                      {alert.severity}
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {alert.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                    {alert.actionRequired && (
                      <Badge variant="destructive" className="mt-2">
                        Action Required
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <div className="text-center py-8 text-green-600">
                  <Shield className="h-8 w-8 mx-auto mb-2" />
                  No active security alerts
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Most Active Endpoints
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.topEndpoints.map((endpoint, index) => (
              <div key={endpoint.endpoint} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-300">
                    {index + 1}
                  </div>
                  <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{endpoint.endpoint}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{
                        width: `${(endpoint.count / metrics.topEndpoints[0]?.count || 1) * 100}%`
                      }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[3ch]">{endpoint.count}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { SecurityDashboard };