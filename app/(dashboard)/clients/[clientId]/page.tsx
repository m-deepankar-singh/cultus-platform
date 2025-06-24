"use client"

import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useClient } from "@/hooks/api/use-clients"
import { ClientDetail } from "@/components/clients/client-detail"
import { Badge } from "@/components/ui/badge"
import { AssignedProducts } from "@/components/clients/assigned-products"
import { ManageStudents } from "@/components/clients/manage-students"
import Link from "next/link"
import { useParams } from "next/navigation"

export default function ClientDetailPage() {
  const params = useParams()
  const clientId = params.clientId as string
  
  const { data: client, isLoading, error } = useClient(clientId)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/clients">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
        </div>
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
                <div className="h-4 w-48 bg-muted animate-pulse rounded"></div>
                <div className="h-4 w-36 bg-muted animate-pulse rounded"></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-4 w-40 bg-muted animate-pulse rounded"></div>
                <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/clients">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Client Not Found</h1>
        </div>
        
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              The client you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button asChild className="mt-4">
              <Link href="/clients">Back to Clients</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/clients">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          <Badge variant={client.is_active ? "info" : "secondary"}>
            {client.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Client Info Card */}
        <ClientDetail client={client} />
        
        {/* Assigned Products Card */}
        <AssignedProducts clientId={clientId} clientName={client.name} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Students Management */}
        <ManageStudents clientId={clientId} clientName={client.name} />
      </div>
    </div>
  )
} 