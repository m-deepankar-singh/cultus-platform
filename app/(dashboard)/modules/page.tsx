import type { Metadata } from "next"
import { ModulesTable } from "@/components/modules/modules-table"
import { ModulesHeader } from "@/components/modules/modules-header"

export const metadata: Metadata = {
  title: "Modules - Upskilling Platform",
  description: "Manage modules in the upskilling platform",
}

export default function ModulesPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
      <ModulesHeader />
      <ModulesTable />
    </div>
  )
}
