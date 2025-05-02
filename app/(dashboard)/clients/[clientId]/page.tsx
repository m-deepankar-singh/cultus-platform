import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getClientById } from "@/app/actions/clientActions"
import { ClientDetail } from "@/components/clients/client-detail"
import { Badge } from "@/components/ui/badge"
import { AssignedProducts } from "@/components/clients/assigned-products"
import { ManageStudents } from "@/components/clients/manage-students"

interface ClientDetailPageProps {
  params: {
    clientId: string
  }
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  // Await params before destructuring
  const { clientId } = await params
  const client = await getClientById(clientId)

  if (!client) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <a href="/clients">
              <ArrowLeft className="h-4 w-4" />
            </a>
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