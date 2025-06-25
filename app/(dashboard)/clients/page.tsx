import type { Metadata } from "next"
import { VirtualizedClientsTableWrapper } from "@/components/clients/virtualized-clients-table-wrapper"

export const metadata: Metadata = {
  title: "Clients - Upskilling Platform",
  description: "Manage clients in the upskilling platform",
}

export default function ClientsPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
      <VirtualizedClientsTableWrapper />
    </div>
  )
}
