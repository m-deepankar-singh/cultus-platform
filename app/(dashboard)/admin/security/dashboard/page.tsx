import SecurityDashboard from '@/components/admin/security/SecurityDashboard';

export default function SecurityMetricsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Security Metrics Dashboard</h1>
        <div className="text-sm text-muted-foreground">
          Real-time security metrics and analytics
        </div>
      </div>

      <SecurityDashboard />
    </div>
  );
}