import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { VirtualizedLearnersTable } from "./virtualized-learners-table"

// Type for client objects
export interface ClientOption {
  id: string
  name: string
}

// Server Component to fetch client options for filtering
export async function VirtualizedLearnersTableWrapper() {
  const supabase = await createClient()
  
  // Fetch all clients to use for filters
  const { data: clientsData, error: clientsError } = await supabase
    .from('clients')
    .select('id, name')
  
  if (clientsError) {
    console.error('Error fetching clients:', clientsError)
    throw new Error(`Failed to fetch clients: ${clientsError.message}`)
  }
  
  // Return client objects with both id and name for filter dropdown
  const clientOptions = (clientsData || []).map(c => ({ id: c.id, name: c.name }))
  
  return <VirtualizedLearnersTable clientOptions={clientOptions} />
}

// Placeholder component for loading state
export function VirtualizedLearnersTableSkeleton() {
  return (
    <Card className="animate-in fade-in-50">
      <div className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 h-10 bg-muted animate-pulse rounded-md"></div>
          <div className="h-10 w-24 bg-muted animate-pulse rounded-md"></div>
        </div>
      </div>
      <div className="rounded-md border bg-white">
        <div className="grid grid-cols-7 gap-6 px-6 py-4 border-b">
          {Array(7).fill(0).map((_, i) => (
            <div key={i} className="h-4">
              <div className="h-3 w-16 bg-muted animate-pulse rounded"></div>
            </div>
          ))}
        </div>
        {Array(10).fill(0).map((_, i) => (
          <div key={i} className="grid grid-cols-7 gap-6 px-6 py-4 border-b">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-muted animate-pulse rounded-lg"></div>
              <div className="space-y-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
                <div className="h-3 w-16 bg-muted animate-pulse rounded"></div>
              </div>
            </div>
            {Array(6).fill(0).map((_, j) => (
              <div key={j}>
                <div className="h-4 w-full bg-muted animate-pulse rounded"></div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Card>
  )
} 