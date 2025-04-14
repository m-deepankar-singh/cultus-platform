"use client"

import { BookOpen, FileText, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface Product {
  id: string
  name: string
  type: "Course" | "Assessment"
  enrollments: number
  completions: number
  completionRate: number
  avgScore: number
  trend: "up" | "down" | "neutral"
}

const products: Product[] = [
  {
    id: "1",
    name: "Introduction to Data Science",
    type: "Course",
    enrollments: 1250,
    completions: 980,
    completionRate: 78,
    avgScore: 85,
    trend: "up",
  },
  {
    id: "2",
    name: "JavaScript Certification",
    type: "Assessment",
    enrollments: 950,
    completions: 820,
    completionRate: 86,
    avgScore: 72,
    trend: "up",
  },
  {
    id: "3",
    name: "Web Development Fundamentals",
    type: "Course",
    enrollments: 1100,
    completions: 750,
    completionRate: 68,
    avgScore: 79,
    trend: "neutral",
  },
  {
    id: "4",
    name: "UX Design Principles",
    type: "Course",
    enrollments: 850,
    completions: 720,
    completionRate: 85,
    avgScore: 88,
    trend: "up",
  },
  {
    id: "5",
    name: "Cloud Computing Certification",
    type: "Assessment",
    enrollments: 780,
    completions: 620,
    completionRate: 79,
    avgScore: 76,
    trend: "down",
  },
]

export function ProductPerformance() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Enrollments</TableHead>
            <TableHead>Completions</TableHead>
            <TableHead>Completion Rate</TableHead>
            <TableHead>Avg. Score</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
                    {product.type === "Course" ? (
                      <BookOpen className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="font-medium">{product.name}</div>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    product.type === "Course"
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-purple-200 bg-purple-50 text-purple-700"
                  }
                >
                  {product.type}
                </Badge>
              </TableCell>
              <TableCell>{product.enrollments}</TableCell>
              <TableCell>{product.completions}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress value={product.completionRate} className="h-2 w-[60px]" />
                  <span>{product.completionRate}%</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span>{product.avgScore}%</span>
                  {product.trend === "up" ? (
                    <Badge variant="default" className="bg-green-500">
                      ↑
                    </Badge>
                  ) : product.trend === "down" ? (
                    <Badge variant="default" className="bg-red-500">
                      ↓
                    </Badge>
                  ) : (
                    <Badge variant="secondary">-</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View details</DropdownMenuItem>
                    <DropdownMenuItem>Export data</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
