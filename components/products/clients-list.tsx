"use client"

import { Building2, MoreHorizontal, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

interface ClientsListProps {
  productId: string
}

interface Client {
  id: string
  name: string
  type: "University" | "Corporate" | "Government"
  status: "Active" | "Inactive"
  users: number
  dateAssigned: string
}

export function ClientsList({ productId }: ClientsListProps) {
  // In a real app, this data would come from an API
  const clients: Client[] = [
    {
      id: "1",
      name: "Stanford University",
      type: "University",
      status: "Active",
      users: 450,
      dateAssigned: "Jan 15, 2023",
    },
    {
      id: "2",
      name: "Acme Corporation",
      type: "Corporate",
      status: "Active",
      users: 120,
      dateAssigned: "Mar 22, 2023",
    },
    {
      id: "3",
      name: "Department of Education",
      type: "Government",
      status: "Active",
      users: 85,
      dateAssigned: "Apr 10, 2023",
    },
    {
      id: "4",
      name: "MIT",
      type: "University",
      status: "Inactive",
      users: 0,
      dateAssigned: "Feb 8, 2023",
    },
  ]

  return (
    <div className="divide-y">
      {clients.map((client) => (
        <div key={client.id} className="flex items-center gap-3 p-4 hover:bg-muted/50">
          <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="flex-1">
            <div className="font-medium">{client.name}</div>
            <div className="text-sm text-muted-foreground dark:text-muted-foreground/90">{client.type}</div>
          </div>

          <Badge
            variant={client.status === "Active" ? "success" : "secondary"}
          >
            {client.status}
          </Badge>

          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{client.users}</span>
          </div>

          <div className="text-sm text-muted-foreground">Assigned: {client.dateAssigned}</div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View client details</DropdownMenuItem>
              <DropdownMenuItem>Manage user access</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">Remove from product</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  )
}
