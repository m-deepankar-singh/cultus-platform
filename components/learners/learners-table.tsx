import { Suspense } from "react"
import { MoreHorizontal, Search, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge" // Import Badge if needed for status/etc.
import { createClient } from "@/lib/supabase/server"
import { LearnersTableClient } from "./learners-table-client"
import { format } from "date-fns"

// Type definition for Learner from API response
export interface Learner {
  id: string
  full_name: string
  email: string | null
  phone_number: string | null
  client_id: string
  is_active: boolean
  created_at: string
  updated_at: string
  star_rating: number | null
  last_login_at: string | null
  temporary_password: string | null
  job_readiness_background_type: string | null
  client: {
    id: string
    name: string
  }
}

// Server Component to fetch uniqueClients data
async function LearnersTableServer() {
  const supabase = await createClient()
  
  // Fetch all clients to use for filters
  const { data: clientsData, error: clientsError } = await supabase
    .from('clients')
    .select('id, name')
  
  if (clientsError) {
    console.error('Error fetching clients:', clientsError)
    throw new Error(`Failed to fetch clients: ${clientsError.message}`)
  }
  
  // Get unique client names for filter dropdown
  const uniqueClients = Array.from(new Set((clientsData || []).map(c => c.name)))
  
  // Return empty initial learners array (will be fetched client-side with pagination)
  // and the uniqueClients list for filters
  return { learners: [], uniqueClients }
}

// Main component using Suspense for data loading
export async function LearnersTable() {
  const { learners, uniqueClients } = await LearnersTableServer()
  
  return (
    <Card>
      <LearnersTableClient initialLearners={learners} uniqueClients={uniqueClients} />
    </Card>
  )
}

// Placeholder component for loading state
export function LearnersTableSkeleton() {
  return (
    <Card className="animate-in fade-in-50">
      <div className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 h-10 bg-muted animate-pulse rounded-md"></div>
          <div className="h-10 w-24 bg-muted animate-pulse rounded-md"></div>
        </div>
      </div>
      <div className="rounded-md border">
        <div className="grid grid-cols-7 border-b">
          {Array(7).fill(0).map((_, i) => (
            <div key={i} className="p-4 h-10">
              <div className="h-5 w-20 bg-muted animate-pulse rounded"></div>
            </div>
          ))}
        </div>
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="grid grid-cols-7 border-b">
            {Array(7).fill(0).map((_, j) => (
              <div key={j} className="p-4">
                <div className="h-5 w-full bg-muted animate-pulse rounded"></div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Card>
  )
} 
