import type { Metadata } from "next"
import { Suspense } from "react"
import { LearnersTable, LearnersTableSkeleton } from "@/components/learners/learners-table"
import { LearnersHeader } from "@/components/learners/learners-header"

export const metadata: Metadata = {
  title: "Learners - Upskilling Platform",
  description: "Manage learners in the upskilling platform",
}

export default function LearnersPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
      <LearnersHeader />
      <Suspense fallback={<LearnersTableSkeleton />}>
        <LearnersTable />
      </Suspense>
    </div>
  )
} 