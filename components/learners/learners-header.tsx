"use client"

import { useEffect, useState } from "react"
import { AddLearnerDialog } from "./add-learner-dialog"
import { useToast } from "@/components/ui/use-toast"

interface Client {
  id: string
  name: string
}

export function LearnersHeader() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Fetch clients for the dropdown
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch("/api/admin/clients")
        if (!response.ok) {
          throw new Error("Failed to fetch clients")
        }
        const data = await response.json()
        setClients(data)
      } catch (error) {
        console.error("Error fetching clients:", error)
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
    // We could emit an event or use a global state store to trigger a refresh
    // of the learners table, but for now we'll just rely on the Suspense boundary
    // to refetch the data when the page is navigated to again
    document.dispatchEvent(new CustomEvent('learnerAdded'))
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Learners</h1>
        <p className="text-muted-foreground">Manage learners and view their progress.</p>
      </div>
      <div className="flex items-center gap-2">
        <AddLearnerDialog 
          clients={clients} 
          onLearnerAdded={handleLearnerAdded} 
        />
      </div>
    </div>
  )
} 