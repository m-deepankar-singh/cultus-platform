import { Metadata } from 'next';
import { CacheMetricsDashboard } from '@/components/admin/cache/CacheMetricsDashboard';

export const metadata: Metadata = {
  title: 'Cache Management - Admin Dashboard',
  description: 'Monitor and manage database cache performance',
};

export default function CacheManagementPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <CacheMetricsDashboard />
    </div>
  );
} 