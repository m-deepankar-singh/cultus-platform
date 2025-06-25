import type { Metadata } from "next"
import { createClient } from '@/lib/supabase/server'
import { VirtualizedProductsTableWrapper } from '@/components/products/virtualized-products-table-wrapper'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Products - Upskilling Platform",
  description: "Manage products in the upskilling platform",
}

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const supabase = await createClient()
  
  // Get current user and role
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id || '')
    .single()
  
  const isAdmin = userProfile?.role === 'Admin'
  
  return (
    <div className="container py-10 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">Products Management</h1>
          <p className="text-muted-foreground">
            {isAdmin 
              ? "Create and manage all products from this centralized location" 
              : "View all products from this centralized location"}
          </p>

        </div>
      </div>
      
      <VirtualizedProductsTableWrapper isAdmin={isAdmin} />
    </div>
  )
}
