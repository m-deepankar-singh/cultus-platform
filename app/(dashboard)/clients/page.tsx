import type { Metadata } from "next"
import { ClientsTable } from "@/components/clients/clients-table"
import { ClientsHeader } from "@/components/clients/clients-header"

export const metadata: Metadata = {
  title: "Clients - Upskilling Platform",
  description: "Manage clients in the upskilling platform",
}

export default function ClientsPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
      <ClientsHeader />
      <ClientsTable />
    </div>
  )
}
