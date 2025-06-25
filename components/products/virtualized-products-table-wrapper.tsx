import { createClient } from '@/lib/supabase/server';
import { VirtualizedProductsTable } from './virtualized-products-table';

interface VirtualizedProductsTableWrapperProps {
  isAdmin: boolean;
}

export async function VirtualizedProductsTableWrapper({ isAdmin }: VirtualizedProductsTableWrapperProps) {
  return <VirtualizedProductsTable isAdmin={isAdmin} />;
} 