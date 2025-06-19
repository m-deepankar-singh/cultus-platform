"use client"

import { useEffect, useState } from "react"
import { AddLearnerDialog } from "./add-learner-dialog"
import { BulkUploadDialog } from "./bulk-upload-dialog"
import { ExportLearnersButton } from "./export-learners-button"
import { useToast } from "@/components/ui/use-toast"

interface Client {
  id: string
  name: string
}

interface PaginatedResponse<T> {
  data: T[];
  metadata: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

export function LearnersHeader() {
  const [clients, setClients] = useState<Client[]>([])
  const [, setLoading] = useState(true)
  const { toast } = useToast()

  // Fetch clients for the dropdown
  useEffect(() => {
    console.log("LearnersHeader: Starting to fetch clients")
    
    const fetchClients = async () => {
      try {
        console.log("LearnersHeader: About to fetch clients from API")
        // Use a large pageSize to get all clients in one request for the dropdown
        const response = await fetch("/api/admin/clients?pageSize=100")
        console.log("LearnersHeader: API response received", { status: response.status, ok: response.ok })
        
        if (!response.ok) {
          throw new Error(`Failed to fetch clients: ${response.status}`)
        }
        
        const responseData = await response.json() as PaginatedResponse<Client>
        console.log("LearnersHeader: Clients response:", responseData)
        
        // Extract the actual clients array from the paginated response
        const clientsData = responseData.data
        
        // Ensure data is an array before setting state
        if (Array.isArray(clientsData) && clientsData.length > 0) {
          console.log("LearnersHeader: Setting clients array", clientsData)
          setClients(clientsData)
        } else {
          console.warn("LearnersHeader: Clients API returned empty or invalid data:", responseData)
          setClients([])
          toast({
            variant: "destructive",
            title: "Warning",
            description: "No clients available. Please add a client before adding learners."
          })
        }
      } catch (error) {
        console.error("LearnersHeader: Error fetching clients:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load clients. Some features may be limited."
        })
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [toast])

  const handleLearnerAdded = () => {
    // This will be called after a learner is added successfully
    // We dispatch a custom event that will be caught by LearnersTableClient
    document.dispatchEvent(new CustomEvent('learnerAdded'))
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Learners</h1>
        <p className="text-muted-foreground">Manage learners and view their progress.</p>
      </div>
      <div className="flex items-center gap-2">
        <ExportLearnersButton />
        <BulkUploadDialog onLearnersBulkUploaded={handleLearnerAdded} />
        <AddLearnerDialog 
          clients={clients} 
          onLearnerAdded={handleLearnerAdded} 
        />
      </div>
    </div>
  )
} 