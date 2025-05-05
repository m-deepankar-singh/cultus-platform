import type { Metadata } from "next"
import { UsersTable } from "@/components/users/users-table"
import { UsersHeader } from "@/components/users/users-header"

export const metadata: Metadata = {
  title: "Users - Upskilling Platform",
  description: "Manage users in the upskilling platform",
}

// Placeholder: In a real app, fetch clients from your API/database
async function getClients() {
  // Simulate fetching clients
  return [
    { id: "client-1", name: "Acme Corp" },
    { id: "client-2", name: "Test University" },
    { id: "client-3", name: "Global Industries" },
  ];
}

export default async function UsersPage() {
  const clients = await getClients();

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8 bg-background">
      <UsersHeader clients={clients} />
      <UsersTable clients={clients} />
    </div>
  )
}
