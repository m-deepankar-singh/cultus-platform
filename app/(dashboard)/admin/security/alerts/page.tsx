import SecurityAlertPanel from '@/components/admin/security/SecurityAlertPanel';

export default function SecurityAlertsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Security Alerts</h1>
        <div className="text-sm text-muted-foreground">
          Active security alerts and incident management
        </div>
      </div>

      <SecurityAlertPanel />
    </div>
  );
}