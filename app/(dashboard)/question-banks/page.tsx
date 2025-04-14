import type { Metadata } from "next"
import { QuestionBanksTable } from "@/components/question-banks/question-banks-table"
import { QuestionBanksHeader } from "@/components/question-banks/question-banks-header"

export const metadata: Metadata = {
  title: "Question Banks - Upskilling Platform",
  description: "Manage question banks in the upskilling platform",
}

export default function QuestionBanksPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
      <QuestionBanksHeader />
      <QuestionBanksTable />
    </div>
  )
}
