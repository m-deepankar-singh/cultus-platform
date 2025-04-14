"use client"

import { Layers } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ModulesHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Modules</h1>
        <p className="text-muted-foreground">Create and manage modules for your products.</p>
      </div>
      <div className="flex items-center gap-2">
        <Button>
          <Layers className="mr-2 h-4 w-4" />
          Create Module
        </Button>
      </div>
    </div>
  )
}
