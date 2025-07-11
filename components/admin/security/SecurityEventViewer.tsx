'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Calendar, 
  User, 
  Globe, 
  Clock,
  AlertTriangle,
  Shield,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { SecurityEventType, SecuritySeverity, SecurityCategory } from '@/lib/security/types';

interface SecurityEventViewerProps {
  className?: string;
}

interface SecurityEvent {
  eventId: string;
  timestamp: string;
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  category: SecurityCategory;
  userId?: string;
  sessionId?: string;
  clientId?: string;
  userRole?: string;
  ipAddress: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  details: Record<string, any>;
  correlationId?: string;
  metadata?: Record<string, any>;
}

interface SecurityEventFilters {
  search?: string;
  eventType?: SecurityEventType;
  severity?: SecuritySeverity;
  category?: SecurityCategory;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  ipAddress?: string;
  endpoint?: string;
}

interface PaginatedResponse {
  events: SecurityEvent[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const SEVERITY_COLORS = {
  INFO: 'bg-blue-100 text-blue-800',
  WARNING: 'bg-yellow-100 text-yellow-800',
  CRITICAL: 'bg-red-100 text-red-800',
  EMERGENCY: 'bg-red-500 text-white'
};

const CATEGORY_COLORS = {
  AUTHENTICATION: 'bg-green-100 text-green-800',
  AUTHORIZATION: 'bg-orange-100 text-orange-800',
  DATA_ACCESS: 'bg-purple-100 text-purple-800',
  FILE_OPERATIONS: 'bg-blue-100 text-blue-800',
  ADMIN_OPERATIONS: 'bg-red-100 text-red-800',
  RATE_LIMITING: 'bg-yellow-100 text-yellow-800',
  CONFIGURATION: 'bg-gray-100 text-gray-800',
  SECURITY_INCIDENT: 'bg-red-200 text-red-900',
  STUDENT_ACTIVITY: 'bg-indigo-100 text-indigo-800'
};

const EVENT_TYPE_ICONS = {
  AUTH_SUCCESS: '✅',
  AUTH_FAILURE: '❌',
  AUTH_TOKEN_EXPIRED: '🔒',
  SESSION_EXPIRED: '⏰',
  SESSION_REFRESHED: '🔄',
  ROLE_VALIDATION_FAILED: '🚫',
  RATE_LIMIT_EXCEEDED: '⚡',
  RATE_LIMIT_CHECK: '🔄',
  UNAUTHORIZED_ACCESS: '🚨',
  FILE_UPLOAD: '📁',
  FILE_ACCESS: '📄',
  SENSITIVE_DATA_ACCESS: '🔐',
  DATA_ACCESS_FAILURE: '💾',
  ADMIN_ACTION: '👤',
  BULK_OPERATION: '📊',
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

export default function SecurityEventViewer({ className = '' }: SecurityEventViewerProps) {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SecurityEventFilters>({});
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  });

  const fetchSecurityEvents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value) acc[key] = value;
          return acc;
        }, {} as Record<string, string>)
      });

      const response = await fetch(`/api/admin/security/events?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch security events');
      }
      
      const data: PaginatedResponse = await response.json();
      setEvents(data.events);
      setPagination({
        page: data.page,
        pageSize: data.pageSize,
        total: data.total,
        totalPages: data.totalPages
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching security events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityEvents();
  }, [pagination.page, pagination.pageSize, filters]);

  const handleFilterChange = (key: keyof SecurityEventFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const clearFilters = () => {
    setFilters({});
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const exportEvents = async () => {
    try {
      const params = new URLSearchParams({
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value) acc[key] = value;
          return acc;
        }, {} as Record<string, string>),
        format: 'csv'
      });

      const response = await fetch(`/api/admin/security/events/export?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to export security events');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-events-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting events:', err);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
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

  if (loading && events.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Security Events</h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            size="sm"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button onClick={exportEvents} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={fetchSecurityEvents} variant="outline" size="sm">
            <Clock className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Event Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <Input
                  placeholder="Search events..."
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Event Type</label>
                <Select value={filters.eventType || ''} onValueChange={(value) => handleFilterChange('eventType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    {Object.values(SecurityEventType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {getEventTypeDisplayName(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Severity</label>
                <Select value={filters.severity || ''} onValueChange={(value) => handleFilterChange('severity', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All severities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All severities</SelectItem>
                    {Object.values(SecuritySeverity).map((severity) => (
                      <SelectItem key={severity} value={severity}>
                        {severity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select value={filters.category || ''} onValueChange={(value) => handleFilterChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All categories</SelectItem>
                    {Object.values(SecurityCategory).map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">User ID</label>
                <Input
                  placeholder="Filter by user ID..."
                  value={filters.userId || ''}
                  onChange={(e) => handleFilterChange('userId', e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">IP Address</label>
                <Input
                  placeholder="Filter by IP..."
                  value={filters.ipAddress || ''}
                  onChange={(e) => handleFilterChange('ipAddress', e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Endpoint</label>
                <Input
                  placeholder="Filter by endpoint..."
                  value={filters.endpoint || ''}
                  onChange={(e) => handleFilterChange('endpoint', e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <Button onClick={clearFilters} variant="outline" className="w-full">
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Security Events ({pagination.total.toLocaleString()})</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.eventId}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex-shrink-0">
                    <span className="text-lg">
                      {EVENT_TYPE_ICONS[event.eventType] || '📊'}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {getEventTypeDisplayName(event.eventType)}
                      </h3>
                      <Badge variant="secondary" className={SEVERITY_COLORS[event.severity]}>
                        {event.severity}
                      </Badge>
                      <Badge variant="outline" className={CATEGORY_COLORS[event.category]}>
                        {event.category.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(event.timestamp)}
                      </div>
                      
                      {event.userId && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {event.userId.slice(0, 8)}...
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {event.ipAddress}
                      </div>
                      
                      {event.endpoint && (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs">{event.endpoint}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex-shrink-0">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(event)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Security Event Details</DialogTitle>
                      </DialogHeader>
                      
                      {selectedEvent && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium mb-2">Event Information</h4>
                              <div className="space-y-2 text-sm">
                                <div><strong>Event ID:</strong> {selectedEvent.eventId}</div>
                                <div><strong>Type:</strong> {getEventTypeDisplayName(selectedEvent.eventType)}</div>
                                <div><strong>Severity:</strong> 
                                  <Badge variant="secondary" className={`ml-2 ${SEVERITY_COLORS[selectedEvent.severity]}`}>
                                    {selectedEvent.severity}
                                  </Badge>
                                </div>
                                <div><strong>Category:</strong> 
                                  <Badge variant="outline" className={`ml-2 ${CATEGORY_COLORS[selectedEvent.category]}`}>
                                    {selectedEvent.category}
                                  </Badge>
                                </div>
                                <div><strong>Timestamp:</strong> {formatTimestamp(selectedEvent.timestamp)}</div>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-medium mb-2">Request Information</h4>
                              <div className="space-y-2 text-sm">
                                <div><strong>IP Address:</strong> {selectedEvent.ipAddress}</div>
                                {selectedEvent.endpoint && <div><strong>Endpoint:</strong> {selectedEvent.endpoint}</div>}
                                {selectedEvent.method && <div><strong>Method:</strong> {selectedEvent.method}</div>}
                                {selectedEvent.userAgent && (
                                  <div><strong>User Agent:</strong> 
                                    <span className="font-mono text-xs break-all">{selectedEvent.userAgent}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {(selectedEvent.userId || selectedEvent.userRole) && (
                            <div>
                              <h4 className="font-medium mb-2">User Information</h4>
                              <div className="space-y-2 text-sm">
                                {selectedEvent.userId && <div><strong>User ID:</strong> {selectedEvent.userId}</div>}
                                {selectedEvent.userRole && <div><strong>Role:</strong> {selectedEvent.userRole}</div>}
                                {selectedEvent.sessionId && <div><strong>Session ID:</strong> {selectedEvent.sessionId}</div>}
                                {selectedEvent.clientId && <div><strong>Client ID:</strong> {selectedEvent.clientId}</div>}
                              </div>
                            </div>
                          )}
                          
                          <div>
                            <h4 className="font-medium mb-2">Event Details</h4>
                            <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                              {JSON.stringify(selectedEvent.details, null, 2)}
                            </pre>
                          </div>
                          
                          {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2">Metadata</h4>
                              <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                                {JSON.stringify(selectedEvent.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
            
            {events.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No security events found</h3>
                <p>Try adjusting your filters or check back later.</p>
              </div>
            )}
          </div>
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                {pagination.total} events
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={pagination.page === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPagination(prev => ({ ...prev, page }))}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export { SecurityEventViewer };