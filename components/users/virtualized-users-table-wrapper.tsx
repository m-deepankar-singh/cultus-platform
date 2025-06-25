import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { VirtualizedUsersTable } from "./virtualized-users-table"

// Type for client objects
export interface ClientOption {
  id: string
  name: string
}

// Server Component to fetch client options for filtering
export async function VirtualizedUsersTableWrapper() {
  const supabase = await createClient()
  
  // Fetch all clients to use for filters
  const { data: clientsData, error: clientsError } = await supabase
    .from('clients')
    .select('id, name')
    .order('name')
  
  if (clientsError) {
    console.error('Error fetching clients:', clientsError)
    throw new Error(`Failed to fetch clients: ${clientsError.message}`)
  }
  
  // Return client objects with both id and name for filter dropdown
  const clientOptions = (clientsData || []).map(c => ({ id: c.id, name: c.name }))
  
  return <VirtualizedUsersTable clientOptions={clientOptions} />
}

// Placeholder component for loading state
export function VirtualizedUsersTableSkeleton() {
  return (
    <Card className="rounded-lg border border-border bg-card dark:bg-card/80">
      <div className="p-6 space-y-4">
        <div>
          <div className="h-8 w-32 bg-muted animate-pulse rounded"></div>
          <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2"></div>
        </div>
        <div className="h-10 w-full bg-muted animate-pulse rounded"></div>
      </div>
      <div className="grid grid-cols-7 gap-6 px-6 py-4 border-b border-border">
        {Array(7).fill(0).map((_, i) => (
          <div key={i} className="h-4">
            <div className="h-3 w-16 bg-muted animate-pulse rounded"></div>
          </div>
        ))}
      </div>
      {Array(10).fill(0).map((_, i) => (
        <div key={i} className="grid grid-cols-7 gap-6 px-6 py-4 border-b border-border">
          {Array(7).fill(0).map((_, j) => (
            <div key={j}>
              <div className="h-4 w-full bg-muted animate-pulse rounded"></div>
            </div>
          ))}
        </div>
      ))}
    </Card>
  )
} 