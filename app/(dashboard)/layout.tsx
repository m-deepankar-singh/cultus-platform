import type React from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <DashboardHeader />
      <div className="flex flex-1 overflow-hidden">
        <div className="sticky top-0 h-screen">
          <DashboardSidebar />
        </div>
        <main className="flex-1 overflow-y-auto scroll-smooth pb-16">{children}</main>
      </div>
    </div>
  )
}
