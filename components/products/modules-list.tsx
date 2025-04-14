"use client"

import { useState } from "react"
import { BookOpen, ChevronDown, ChevronUp, FileText, GripVertical, MoreHorizontal, PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

interface ModulesListProps {
  productId: string
}

interface Module {
  id: string
  title: string
  type: "Content" | "Quiz"
  duration: string
  status: "Published" | "Draft"
  hasChildren?: boolean
  children?: Module[]
  isExpanded?: boolean
}

export function ModulesList({ productId }: ModulesListProps) {
  // In a real app, this data would come from an API
  const [modules, setModules] = useState<Module[]>([
    {
      id: "1",
      title: "Introduction to Data Science",
      type: "Content",
      duration: "15 min",
      status: "Published",
      hasChildren: true,
      isExpanded: true,
      children: [
        {
          id: "1-1",
          title: "What is Data Science?",
          type: "Content",
          duration: "5 min",
          status: "Published",
        },
        {
          id: "1-2",
          title: "Data Science Tools",
          type: "Content",
          duration: "10 min",
          status: "Published",
        },
      ],
    },
    {
      id: "2",
      title: "Data Collection and Cleaning",
      type: "Content",
      duration: "30 min",
      status: "Published",
      hasChildren: true,
      isExpanded: false,
      children: [
        {
          id: "2-1",
          title: "Data Collection Methods",
          type: "Content",
          duration: "15 min",
          status: "Published",
        },
        {
          id: "2-2",
          title: "Data Cleaning Techniques",
          type: "Content",
          duration: "15 min",
          status: "Published",
        },
      ],
    },
    {
      id: "3",
      title: "Data Analysis Fundamentals",
      type: "Content",
      duration: "45 min",
      status: "Draft",
      hasChildren: false,
    },
    {
      id: "4",
      title: "Module 1 Quiz",
      type: "Quiz",
      duration: "20 min",
      status: "Published",
      hasChildren: false,
    },
  ])

  const toggleExpand = (moduleId: string) => {
    setModules(
      modules.map((module) => (module.id === moduleId ? { ...module, isExpanded: !module.isExpanded } : module)),
    )
  }

  return (
    <div className="divide-y">
      {modules.map((module) => (
        <div key={module.id}>
          <div className="flex items-center gap-2 p-4 hover:bg-muted/50">
            <Button variant="ghost" size="icon" className="cursor-move">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="sr-only">Drag to reorder</span>
            </Button>

            {module.hasChildren && (
              <Button variant="ghost" size="icon" onClick={() => toggleExpand(module.id)}>
                {module.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                <span className="sr-only">{module.isExpanded ? "Collapse" : "Expand"}</span>
              </Button>
            )}

            <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
              {module.type === "Content" ? (
                <BookOpen className="h-5 w-5 text-muted-foreground" />
              ) : (
                <FileText className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1">
              <div className="font-medium">{module.title}</div>
              <div className="text-sm text-muted-foreground">{module.duration}</div>
            </div>

            <Badge
              variant={module.status === "Published" ? "default" : "outline"}
              className={
                module.status === "Published" ? "bg-green-500" : "border-orange-200 bg-orange-50 text-orange-700"
              }
            >
              {module.status}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Edit module</DropdownMenuItem>
                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                {module.hasChildren && (
                  <DropdownMenuItem>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span>Add sub-module</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {module.status === "Published" ? (
                  <DropdownMenuItem>Unpublish</DropdownMenuItem>
                ) : (
                  <DropdownMenuItem>Publish</DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-red-600">Delete module</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {module.hasChildren && module.isExpanded && module.children && (
            <div className="ml-12 border-l pl-4">
              {module.children.map((child) => (
                <div key={child.id} className="flex items-center gap-2 p-4 hover:bg-muted/50">
                  <Button variant="ghost" size="icon" className="cursor-move">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="sr-only">Drag to reorder</span>
                  </Button>

                  <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
                    {child.type === "Content" ? (
                      <BookOpen className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="font-medium">{child.title}</div>
                    <div className="text-sm text-muted-foreground">{child.duration}</div>
                  </div>

                  <Badge
                    variant={child.status === "Published" ? "default" : "outline"}
                    className={
                      child.status === "Published" ? "bg-green-500" : "border-orange-200 bg-orange-50 text-orange-700"
                    }
                  >
                    {child.status}
                  </Badge>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit module</DropdownMenuItem>
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {child.status === "Published" ? (
                        <DropdownMenuItem>Unpublish</DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem>Publish</DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-red-600">Delete module</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
