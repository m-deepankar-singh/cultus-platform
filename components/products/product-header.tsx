"use client"

import { ArrowLeft, BookOpen, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface ProductHeaderProps {
  id: string
}

export function ProductHeader({ id }: ProductHeaderProps) {
  // In a real app, this data would come from an API
  const product = {
    id,
    name: "Introduction to Data Science",
    type: "Course",
    status: "Published",
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href="/products">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
            {product.type === "Course" ? (
              <BookOpen className="h-5 w-5 text-muted-foreground" />
            ) : (
              <FileText className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
            <p className="text-muted-foreground">
              {product.type} • {product.status}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline">Preview</Button>
        <Button>Publish</Button>
      </div>
    </div>
  )
}
