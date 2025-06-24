import type { Metadata } from "next"
import { Suspense } from "react"
import { VirtualizedLearnersTableWrapper, VirtualizedLearnersTableSkeleton } from "@/components/learners/virtualized-learners-table-wrapper"
import { LearnersHeader } from "@/components/learners/learners-header"

export const metadata: Metadata = {
  title: "Learners - Upskilling Platform",
  description: "Manage learners in the upskilling platform",
}

// This makes the page dynamic to ensure loading state shows on each navigation
export const dynamic = 'force-dynamic'

export default function LearnersPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
      <LearnersHeader />
      <Suspense key="virtualized-learners-table" fallback={<VirtualizedLearnersTableSkeleton />}>
        <VirtualizedLearnersTableWrapper />
      </Suspense>
    </div>
  )
} 