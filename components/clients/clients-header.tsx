"use client"

import { Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ClientsHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
        <p className="text-muted-foreground">Manage client organizations and their access to products.</p>
      </div>
      <div className="flex items-center gap-2">
        <Button>
          <Building2 className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>
    </div>
  )
}
