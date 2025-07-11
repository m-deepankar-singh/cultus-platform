import SecurityDashboard from '@/components/admin/security/SecurityDashboard';
import SecurityEventViewer from '@/components/admin/security/SecurityEventViewer';
import SecurityAlertPanel from '@/components/admin/security/SecurityAlertPanel';

export default function SecurityDashboardPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Security Dashboard</h1>
        <div className="text-sm text-muted-foreground">
          Real-time security monitoring and event management
        </div>
      </div>

      <div className="grid gap-6">
        {/* Security Metrics Dashboard */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Security Metrics</h2>
          <SecurityDashboard />
        </div>

        {/* Security Alerts Panel */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Active Security Alerts</h2>
          <SecurityAlertPanel />
        </div>

        {/* Security Event Viewer */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Security Event Log</h2>
          <SecurityEventViewer />
        </div>
      </div>
    </div>
  );
}