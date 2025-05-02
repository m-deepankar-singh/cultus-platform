"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Building2, CalendarIcon, MailIcon, MapPinIcon, PenIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ClientForm } from "@/components/clients/client-form"
import { Client } from "@/app/actions/clientActions"

interface ClientDetailProps {
  client: Client
}

export function ClientDetail({ client }: ClientDetailProps) {
  const [showEditForm, setShowEditForm] = useState(false)
  
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      return format(new Date(dateString), "MMMM d, yyyy")
    } catch (error) {
      return dateString
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Client Information</CardTitle>
            <CardDescription>Details about this client</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setShowEditForm(true)}
          >
            <PenIcon className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center">
            <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-md border bg-muted">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Name</p>
              <p className="text-sm text-muted-foreground">{client.name}</p>
            </div>
          </div>

          <div className="flex items-start">
            <MailIcon className="mr-2 mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">
                {client.contact_email || "Not provided"}
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <MapPinIcon className="mr-2 mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Address</p>
              <p className="text-sm text-muted-foreground">
                {client.address || "Not provided"}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start border-t px-6 py-4">
          <div className="flex items-center text-xs text-muted-foreground">
            <CalendarIcon className="mr-1 h-3 w-3" />
            Created on {formatDate(client.created_at)}
          </div>
          {client.updated_at !== client.created_at && (
            <div className="flex items-center text-xs text-muted-foreground">
              <CalendarIcon className="mr-1 h-3 w-3" />
              Last updated on {formatDate(client.updated_at)}
            </div>
          )}
        </CardFooter>
      </Card>

      <ClientForm
        open={showEditForm}
        setOpen={setShowEditForm}
        client={client}
        onSuccess={() => {
          // Refresh the page to see updated data
          window.location.reload()
        }}
      />
    </>
  )
} 