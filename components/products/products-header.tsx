"use client"

import { BookOpen, FileText, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function ProductsHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground">Manage courses and assessments for your clients.</p>
      </div>
    </div>
  )
}
