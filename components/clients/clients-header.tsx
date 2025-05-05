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
    </div>
  )
}
