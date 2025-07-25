import type { Metadata } from "next"
import { VirtualizedUsersTableWrapper } from "@/components/users/virtualized-users-table-wrapper"
import { UsersHeader } from "@/components/users/users-header"

export const metadata: Metadata = {
  title: "Users - Upskilling Platform",
  description: "Manage users in the upskilling platform",
}

export default function UsersPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8 bg-background">
      <UsersHeader />
      <VirtualizedUsersTableWrapper />
    </div>
  )
}
