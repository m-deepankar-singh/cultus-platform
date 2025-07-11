"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Users, TrendingUp, Star, Award } from "lucide-react"
import { JrProgressTable } from "@/components/job-readiness/admin/jr-progress-table"
import { JrProgressOverrideForm } from "@/components/job-readiness/admin/jr-progress-override-form"
import {
  JrStudentProgress,
  JrProgressFilters,
  OverrideProgressRequest,
  getJrStudentProgress,
  overrideStudentProgress,
  exportProgressData,
  JrProgressApiError,
} from "@/lib/api/job-readiness/progress"
import { getJrProducts } from "@/lib/api/job-readiness/products"
import { getClients } from "@/lib/api/clients"

export default function JobReadinessProgressPage() {
  const [progress, setProgress] = React.useState<JrStudentProgress[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isOverrideFormOpen, setIsOverrideFormOpen] = React.useState(false)
  const [selectedStudent, setSelectedStudent] = React.useState<JrStudentProgress | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  
  // Filter state
  const [filters, setFilters] = React.useState<JrProgressFilters>({
    page: 1,
    pageSize: 50,
  })

  // Filter options
  const [products, setProducts] = React.useState<{ id: string; name: string }[]>([])
  const [clients, setClients] = React.useState<{ id: string; name: string }[]>([])

  // Load products for filter dropdown
  const loadProducts = React.useCallback(async () => {
    try {
      const data = await getJrProducts()
      setProducts(data.map(p => ({ id: p.id, name: p.name })))
    } catch (error) {
      console.error("Failed to load products:", error)
    }
  }, [])

  // Load clients for filter dropdown
  const loadClients = React.useCallback(async () => {
    try {
      const data = await getClients()
      setClients(data.map(c => ({ id: c.id, name: c.name })))
    } catch (error) {
      console.error("Failed to load clients:", error)
    }
  }, [])

  // Load student progress
  const loadProgress = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getJrStudentProgress(filters)
      setProgress(data.students || [])
    } catch (error) {
      console.error("Failed to load student progress:", error)
      toast.error(
        error instanceof JrProgressApiError
          ? error.message
          : "Failed to load student progress"
      )
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  React.useEffect(() => {
    loadProducts()
    loadClients()
  }, [loadProducts, loadClients])

  React.useEffect(() => {
    loadProgress()
  }, [loadProgress])

  // Handle progress override
  const handleOverrideProgress = (studentProgress: JrStudentProgress) => {
    setSelectedStudent(studentProgress)
    setIsOverrideFormOpen(true)
  }

  // Handle override form submission
  const handleOverrideSubmit = async (overrideData: OverrideProgressRequest) => {
    if (!selectedStudent) return

    try {
      setIsSubmitting(true)
      await overrideStudentProgress(selectedStudent.student_id, overrideData)
      toast.success("Student progress overridden successfully")
      
      // Reload the data
      await loadProgress()
      
      // Close the form
      setIsOverrideFormOpen(false)
      setSelectedStudent(null)
    } catch (error) {
      console.error("Failed to override progress:", error)
      toast.error(
        error instanceof JrProgressApiError
          ? error.message
          : "Failed to override student progress"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle export
  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      const blob = await exportProgressData({
        productId: filters.productId,
        clientId: filters.clientId,
        format,
      })

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `jr-progress-export.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success(`Progress data exported as ${format.toUpperCase()}`)
    } catch (error) {
      console.error("Failed to export progress:", error)
      toast.error(
        error instanceof JrProgressApiError
          ? error.message
          : "Failed to export progress data"
      )
    }
  }

  // Handle form dialog close
  const handleFormClose = (open: boolean) => {
    setIsOverrideFormOpen(open)
    if (!open) {
      setSelectedStudent(null)
    }
  }

  // Calculate statistics
  const stats = React.useMemo(() => {
    const totalStudents = progress.length
    const uniqueProducts = new Set(progress.map(p => p.product_id)).size
    const uniqueClients = new Set(progress.filter(p => filters.clientId).map(p => filters.clientId)).size || 1
    
    // Distribution by star level
    const starLevelCounts = progress.reduce((acc, p) => {
      if (p.job_readiness_star_level) {
        acc[p.job_readiness_star_level] = (acc[p.job_readiness_star_level] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    // Average completion if module progress is available
    const completionRates = progress
      .filter(p => p.module_progress?.completion_percentage !== undefined)
      .map(p => p.module_progress!.completion_percentage)
    
    const avgCompletion = completionRates.length > 0
      ? Math.round(completionRates.reduce((sum, rate) => sum + rate, 0) / completionRates.length)
      : 0

    return {
      totalStudents,
      uniqueProducts,
      uniqueClients,
      starLevelCounts,
      avgCompletion,
    }
  }, [progress, filters.clientId])

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8" />
            Student Progress
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage student progression through Job Readiness programs.
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Across {stats.uniqueProducts} products
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Completion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgCompletion}%</div>
            <p className="text-xs text-muted-foreground">
              Module completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Level 5 Students</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.starLevelCounts["FIVE"] || 0}</div>
            <p className="text-xs text-muted-foreground">
              Highest achievement level
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gold Tier</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {progress.filter(p => p.job_readiness_tier === "GOLD").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Advanced tier students
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Student Progress Overview</CardTitle>
          <CardDescription>
            View student progression through Job Readiness programs. Filter by product or client, 
            export data for reporting, and manually override progress when needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {progress.length === 0 && !isLoading ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No student progress found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Students will appear here once they begin Job Readiness programs.
              </p>
              {filters.productId || filters.clientId || filters.search ? (
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters to see more results.
                </p>
              ) : null}
            </div>
          ) : (
            <JrProgressTable
              progress={progress}
              isLoading={isLoading}
              onOverrideProgress={handleOverrideProgress}
              onExport={handleExport}
              onRefresh={loadProgress}
              filters={filters}
              onFiltersChange={setFilters}
              products={products}
              clients={clients}
            />
          )}
        </CardContent>
      </Card>

      {/* Progress Override Form Dialog */}
      <JrProgressOverrideForm
        open={isOverrideFormOpen}
        onOpenChange={handleFormClose}
        studentProgress={selectedStudent}
        onSubmit={handleOverrideSubmit}
        isLoading={isSubmitting}
      />
    </div>
  )
} 