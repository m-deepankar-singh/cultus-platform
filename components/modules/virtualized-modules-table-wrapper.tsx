import { createClient } from '@/lib/supabase/server';
import { VirtualizedModulesTable } from './virtualized-modules-table';

interface VirtualizedModulesTableWrapperProps {
  isAdmin: boolean;
  initialType?: "Course" | "Assessment" | "all";
}

export async function VirtualizedModulesTableWrapper({ isAdmin, initialType = "all" }: VirtualizedModulesTableWrapperProps) {
  return <VirtualizedModulesTable isAdmin={isAdmin} initialType={initialType} />;
} 