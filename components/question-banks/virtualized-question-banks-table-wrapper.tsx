import { Card } from "@/components/ui/card"
import { VirtualizedQuestionBanksTable } from "./virtualized-question-banks-table"
import { QuestionBankHeader } from "./question-bank-header"

// Server Component to manage the virtualized question banks table
export async function VirtualizedQuestionBanksTableWrapper() {
  // No initial data fetching needed - the virtualized table will handle everything via TanStack Query
  return (
    <div className="space-y-6">
      <QuestionBankHeader />
      <VirtualizedQuestionBanksTable />
    </div>
  )
}

// Placeholder component for loading state
export function VirtualizedQuestionBanksTableSkeleton() {
  return (
    <Card className="rounded-lg border border-border bg-card dark:bg-card/80">
      <div className="p-6 space-y-4">
        <div>
          <div className="h-8 w-32 bg-muted animate-pulse rounded"></div>
          <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2"></div>
        </div>
        <div className="h-10 w-full bg-muted animate-pulse rounded"></div>
      </div>
      <div className="grid grid-cols-6 gap-6 px-6 py-4 border-b border-border">
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="h-4">
            <div className="h-3 w-16 bg-muted animate-pulse rounded"></div>
          </div>
        ))}
      </div>
      {Array(10).fill(0).map((_, i) => (
        <div key={i} className="grid grid-cols-6 gap-6 px-6 py-4 border-b border-border">
          {Array(6).fill(0).map((_, j) => (
            <div key={j}>
              <div className="h-4 w-full bg-muted animate-pulse rounded"></div>
            </div>
          ))}
        </div>
      ))}
    </Card>
  )
} 