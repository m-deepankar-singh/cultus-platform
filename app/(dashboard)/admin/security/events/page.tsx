import SecurityEventViewer from '@/components/admin/security/SecurityEventViewer';

export default function SecurityEventsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Security Event Log</h1>
        <div className="text-sm text-muted-foreground">
          Detailed security event monitoring and analysis
        </div>
      </div>

      <SecurityEventViewer />
    </div>
  );
}