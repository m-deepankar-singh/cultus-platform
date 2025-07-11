'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  AlertTriangle, 
  Shield, 
  Bell, 
  X, 
  Eye, 
  Clock, 
  Users, 
  Globe,
  CheckCircle,
  AlertCircle,
  Ban
} from 'lucide-react';
import { SecuritySeverity, SecurityAlertType } from '@/lib/security/types';

interface SecurityAlertPanelProps {
  className?: string;
}

interface SecurityAlert {
  id: string;
  timestamp: string;
  alertType: SecurityAlertType;
  severity: SecuritySeverity;
  description: string;
  relatedEvents: string[];
  actionRequired: boolean;
  metadata: Record<string, any>;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  notes?: string;
}

interface AlertAction {
  id: string;
  name: string;
  description: string;
  action: (alert: SecurityAlert) => void;
  requiresConfirmation?: boolean;
}

const SEVERITY_COLORS = {
  INFO: 'bg-blue-100 text-blue-800 border-blue-200',
  WARNING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
  EMERGENCY: 'bg-red-500 text-white border-red-600'
};

const SEVERITY_ICONS = {
  INFO: <Shield className="h-4 w-4" />,
  WARNING: <AlertTriangle className="h-4 w-4" />,
  CRITICAL: <AlertCircle className="h-4 w-4" />,
  EMERGENCY: <Ban className="h-4 w-4" />
};

const ALERT_TYPE_DESCRIPTIONS = {
  MULTIPLE_FAILED_LOGINS: 'Multiple failed login attempts detected',
  RATE_LIMIT_ABUSE: 'Rate limit abuse pattern detected',
  SUSPICIOUS_FILE_ACCESS: 'Suspicious file access pattern detected',
  PRIVILEGE_ESCALATION_ATTEMPT: 'Privilege escalation attempt detected',
  UNUSUAL_ADMIN_ACTIVITY: 'Unusual admin activity pattern detected',
  CONFIGURATION_TAMPERING: 'Configuration tampering detected'
};

export default function SecurityAlertPanel({ className = '' }: SecurityAlertPanelProps) {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('active');

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/security/alerts');
      
      if (!response.ok) {
        throw new Error('Failed to fetch security alerts');
      }
      
      const data = await response.json();
      setAlerts(data.alerts || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching security alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/admin/security/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to acknowledge alert');
      }
      
      await fetchAlerts(); // Refresh alerts
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const resolveAlert = async (alertId: string, notes?: string) => {
    try {
      const response = await fetch(`/api/admin/security/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to resolve alert');
      }
      
      await fetchAlerts(); // Refresh alerts
    } catch (err) {
      console.error('Error resolving alert:', err);
    }
  };

  const dismissAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/admin/security/alerts/${alertId}/dismiss`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to dismiss alert');
      }
      
      await fetchAlerts(); // Refresh alerts
    } catch (err) {
      console.error('Error dismissing alert:', err);
    }
  };

  useEffect(() => {
    fetchAlerts();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    return alert.status === filter;
  });

  const getAlertActions = (alert: SecurityAlert): AlertAction[] => {
    const actions: AlertAction[] = [];
    
    if (alert.status === 'active') {
      actions.push({
        id: 'acknowledge',
        name: 'Acknowledge',
        description: 'Mark this alert as acknowledged',
        action: () => acknowledgeAlert(alert.id),
      });
    }
    
    if (alert.status === 'active' || alert.status === 'acknowledged') {
      actions.push({
        id: 'resolve',
        name: 'Resolve',
        description: 'Mark this alert as resolved',
        action: () => resolveAlert(alert.id),
      });
    }
    
    if (alert.status === 'active' && alert.severity !== 'EMERGENCY') {
      actions.push({
        id: 'dismiss',
        name: 'Dismiss',
        description: 'Dismiss this alert',
        action: () => dismissAlert(alert.id),
        requiresConfirmation: true,
      });
    }
    
    return actions;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'acknowledged':
        return <Eye className="h-4 w-4 text-yellow-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error loading security alerts: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const activeAlerts = alerts.filter(alert => alert.status === 'active');
  const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'CRITICAL' || alert.severity === 'EMERGENCY');

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Security Alerts</h2>
          {activeAlerts.length > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <Bell className="h-3 w-3" />
              {activeAlerts.length} Active
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['all', 'active', 'acknowledged', 'resolved'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1 rounded-md text-sm font-medium capitalize transition-colors ${
                  filter === status
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <Button onClick={fetchAlerts} variant="outline" size="sm">
            <Clock className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Critical Security Alerts:</strong> {criticalAlerts.length} alerts require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.map((alert) => (
          <Card 
            key={alert.id} 
            className={`${alert.severity === 'EMERGENCY' ? 'border-red-500 bg-red-50' : ''} ${
              alert.severity === 'CRITICAL' ? 'border-red-300 bg-red-25' : ''
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="flex-shrink-0 mt-1">
                    {SEVERITY_ICONS[alert.severity]}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className={SEVERITY_COLORS[alert.severity]}>
                        {alert.severity}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {alert.alertType.replace('_', ' ').toLowerCase()}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        {getStatusIcon(alert.status)}
                        <span className="capitalize">{alert.status}</span>
                      </div>
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {alert.description}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(alert.timestamp)}
                      </div>
                      
                      {alert.relatedEvents.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {alert.relatedEvents.length} related events
                        </div>
                      )}
                      
                      {alert.actionRequired && (
                        <Badge variant="destructive" className="text-xs">
                          Action Required
                        </Badge>
                      )}
                    </div>
                    
                    {/* Alert metadata summary */}
                    {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                      <div className="text-sm text-gray-600 mb-3">
                        {alert.metadata.ipAddress && (
                          <span className="flex items-center gap-1 mb-1">
                            <Globe className="h-3 w-3" />
                            IP: {alert.metadata.ipAddress}
                          </span>
                        )}
                        {alert.metadata.eventCount && (
                          <span>Events: {alert.metadata.eventCount}</span>
                        )}
                      </div>
                    )}
                    
                    {/* Status information */}
                    {alert.status !== 'active' && (
                      <div className="text-xs text-gray-500 mb-2">
                        {alert.status === 'acknowledged' && alert.acknowledgedBy && (
                          <div>Acknowledged by {alert.acknowledgedBy} at {formatTimestamp(alert.acknowledgedAt!)}</div>
                        )}
                        {alert.status === 'resolved' && alert.resolvedBy && (
                          <div>Resolved by {alert.resolvedBy} at {formatTimestamp(alert.resolvedAt!)}</div>
                        )}
                        {alert.notes && (
                          <div className="mt-1 italic">Note: {alert.notes}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Action buttons */}
                  {getAlertActions(alert).map((action) => (
                    <Button
                      key={action.id}
                      onClick={() => action.action(alert)}
                      variant={action.id === 'dismiss' ? 'destructive' : 'outline'}
                      size="sm"
                    >
                      {action.name}
                    </Button>
                  ))}
                  
                  {/* View details button */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedAlert(alert)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Security Alert Details</DialogTitle>
                      </DialogHeader>
                      
                      {selectedAlert && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium mb-2">Alert Information</h4>
                              <div className="space-y-2 text-sm">
                                <div><strong>Alert ID:</strong> {selectedAlert.id}</div>
                                <div><strong>Type:</strong> {selectedAlert.alertType}</div>
                                <div><strong>Severity:</strong> 
                                  <Badge variant="secondary" className={`ml-2 ${SEVERITY_COLORS[selectedAlert.severity]}`}>
                                    {selectedAlert.severity}
                                  </Badge>
                                </div>
                                <div><strong>Status:</strong> 
                                  <span className="ml-2 capitalize">{selectedAlert.status}</span>
                                </div>
                                <div><strong>Timestamp:</strong> {formatTimestamp(selectedAlert.timestamp)}</div>
                                <div><strong>Action Required:</strong> {selectedAlert.actionRequired ? 'Yes' : 'No'}</div>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-medium mb-2">Related Events</h4>
                              <div className="space-y-2 text-sm">
                                <div><strong>Event Count:</strong> {selectedAlert.relatedEvents.length}</div>
                                {selectedAlert.relatedEvents.slice(0, 3).map((eventId, index) => (
                                  <div key={index} className="font-mono text-xs">
                                    {eventId}
                                  </div>
                                ))}
                                {selectedAlert.relatedEvents.length > 3 && (
                                  <div className="text-xs text-gray-500">
                                    ...and {selectedAlert.relatedEvents.length - 3} more
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-2">Description</h4>
                            <p className="text-sm text-gray-700">{selectedAlert.description}</p>
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-2">Metadata</h4>
                            <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                              {JSON.stringify(selectedAlert.metadata, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredAlerts.length === 0 && (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'active' ? 'No Active Alerts' : `No ${filter} Alerts`}
            </h3>
            <p className="text-gray-500">
              {filter === 'active' 
                ? 'Your system is secure. No active alerts at this time.' 
                : `No ${filter} alerts found.`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export { SecurityAlertPanel };