"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Download, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Client {
  id: string
  name: string
}

interface ClientExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExport: (clientId: string | undefined) => Promise<void>
}

export function ClientExportModal({ open, onOpenChange, onExport }: ClientExportModalProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  // Fetch clients for the dropdown
  useEffect(() => {
    const fetchClients = async () => {
      setIsLoading(true)
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
          description: "Failed to load clients. Please try again.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (open) {
      fetchClients()
    }
  }, [open, toast])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await onExport(selectedClientId)
      onOpenChange(false)
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsExporting(false)
    }
  }

  // Reset selection when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedClientId(undefined)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Learner Data</DialogTitle>
          <DialogDescription>
            Select a client to export specific learner data or export all learners.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label htmlFor="client" className="text-sm font-medium leading-none">
              Client
            </label>
            <Select
              value={selectedClientId}
              onValueChange={(value) => setSelectedClientId(value)}
              disabled={isLoading || isExporting}
            >
              <SelectTrigger className="w-full" id="client">
                <SelectValue placeholder="Select a client or export all" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isLoading && (
              <div className="text-sm text-muted-foreground">Loading clients...</div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 