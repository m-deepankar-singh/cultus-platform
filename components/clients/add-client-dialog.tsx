"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { ClientForm } from "@/components/clients/client-form"

interface AddClientDialogProps {
  onClientAdded?: () => void
}

export function AddClientDialog({ onClientAdded }: AddClientDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add Client
      </Button>
      <ClientForm 
        open={open} 
        setOpen={setOpen} 
        onSuccess={onClientAdded}
      />
    </>
  )
} 