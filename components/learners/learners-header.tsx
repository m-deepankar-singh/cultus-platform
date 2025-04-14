"use client"

import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"

export function LearnersHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Learners</h1>
        <p className="text-muted-foreground">Manage learners and view their progress.</p>
      </div>
      <div className="flex items-center gap-2">
        {/* Optionally add buttons for adding learners if needed in the future */}
        {/* <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Learner
        </Button> */}
      </div>
    </div>
  )
} 