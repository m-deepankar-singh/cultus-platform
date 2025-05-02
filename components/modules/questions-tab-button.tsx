"use client"

import { Button } from "@/components/ui/button"
import { CircleCheck } from "lucide-react"
import Link from "next/link"

export function QuestionsTabButton() {
  const handleClick = () => {
    const tabElement = document.querySelector('[data-value="questions"]');
    if (tabElement instanceof HTMLElement) {
      tabElement.click();
    }
  }
  
  return (
    <Button asChild variant="outline">
      <Link href="#questions" onClick={handleClick}>
        <CircleCheck className="mr-2 h-4 w-4" />
        Manage Assessment Questions
      </Link>
    </Button>
  )
} 