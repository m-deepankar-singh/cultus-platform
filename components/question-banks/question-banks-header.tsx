"use client"

import { FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSearchParams } from "next/navigation"

export function QuestionBanksHeader() {
  const searchParams = useSearchParams()
  const type = searchParams.get("type") || "course"

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {type === "course" ? "Course" : "Assessment"} Question Banks
        </h1>
        <p className="text-muted-foreground">
          Manage question banks for {type === "course" ? "courses" : "assessments"}.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button>
          <FileQuestion className="mr-2 h-4 w-4" />
          Create Question Bank
        </Button>
      </div>
    </div>
  )
}
