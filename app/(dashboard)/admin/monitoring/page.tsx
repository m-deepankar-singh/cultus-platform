import AuthPerformanceDashboard from '@/components/monitoring/auth-performance-dashboard';

export default function MonitoringPage() {
  return (
    <div className="container mx-auto">
      <AuthPerformanceDashboard />
    </div>
  );
}

export const metadata = {
  title: 'Authentication Performance Monitoring',
  description: 'Monitor Phase 2 authentication performance metrics and optimization',
};