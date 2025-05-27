"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GraduationCap, Plus, Filter, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  JrPromotionExamConfigTable,
  JrPromotionExamConfigForm,
  JrPromotionExamAttemptsTable,
  JrPromotionExamStats,
  JrPromotionExamStatusBreakdown,
} from "@/components/job-readiness/admin"
import type { JrPromotionExamConfig } from "@/components/job-readiness/admin/jr-promotion-exam-config-table"
import type { JrPromotionExamAttempt } from "@/components/job-readiness/admin/jr-promotion-exam-attempts-table"

interface Product {
  id: string
  name: string
}

export default function JobReadinessPromotionExamsPage() {
  const { toast } = useToast()
  
  // State for exam configurations
  const [examConfigs, setExamConfigs] = React.useState<JrPromotionExamConfig[]>([])
  const [isLoadingConfigs, setIsLoadingConfigs] = React.useState(true)
  
  // State for exam attempts
  const [examAttempts, setExamAttempts] = React.useState<JrPromotionExamAttempt[]>([])
  const [isLoadingAttempts, setIsLoadingAttempts] = React.useState(true)
  
  // State for products
  const [products, setProducts] = React.useState<Product[]>([])
  
  // Form state
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [editingConfig, setEditingConfig] = React.useState<JrPromotionExamConfig | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Fetch exam configurations
  const fetchExamConfigs = React.useCallback(async () => {
    try {
      setIsLoadingConfigs(true)
      const response = await fetch('/api/admin/job-readiness/promotion-exams')
      
      if (!response.ok) {
        throw new Error('Failed to fetch exam configurations')
      }
      
      const data = await response.json()
      setExamConfigs(data.examConfigs || [])
    } catch (error) {
      console.error('Error fetching exam configurations:', error)
      toast({
        title: "Error",
        description: "Failed to fetch exam configurations. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingConfigs(false)
    }
  }, [toast])

  // Fetch exam attempts
  const fetchExamAttempts = React.useCallback(async () => {
    try {
      setIsLoadingAttempts(true)
      const response = await fetch('/api/admin/job-readiness/promotion-exam-attempts')
      
      if (!response.ok) {
        throw new Error('Failed to fetch exam attempts')
      }
      
      const data = await response.json()
      setExamAttempts(data.attempts || [])
    } catch (error) {
      console.error('Error fetching exam attempts:', error)
      toast({
        title: "Error",
        description: "Failed to fetch exam attempts. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingAttempts(false)
    }
  }, [toast])

  // Fetch products
  const fetchProducts = React.useCallback(async () => {
    try {
      const response = await fetch('/api/admin/job-readiness/products')
      
      if (!response.ok) {
        throw new Error('Failed to fetch products')
      }
      
      const data = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error('Error fetching products:', error)
      toast({
        title: "Error",
        description: "Failed to fetch products. Please try again.",
        variant: "destructive",
      })
    }
  }, [toast])

  // Load data on mount
  React.useEffect(() => {
    fetchExamConfigs()
    fetchExamAttempts()
    fetchProducts()
  }, [fetchExamConfigs, fetchExamAttempts, fetchProducts])

  // Handle form submission
  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true)
      
      const url = '/api/admin/job-readiness/promotion-exams'
      const method = editingConfig ? 'PATCH' : 'POST'
      const body = editingConfig ? { ...data, id: editingConfig.id } : data

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save configuration')
      }

      toast({
        title: "Success",
        description: `Exam configuration ${editingConfig ? 'updated' : 'created'} successfully.`,
      })

      // Refresh the data
      await fetchExamConfigs()
      setEditingConfig(null)
    } catch (error) {
      console.error('Error saving configuration:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save configuration. Please try again.",
        variant: "destructive",
      })
      throw error // Re-throw to prevent form from closing
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle edit
  const handleEdit = (config: JrPromotionExamConfig) => {
    setEditingConfig(config)
    setIsFormOpen(true)
  }

  // Handle delete
  const handleDelete = async (config: JrPromotionExamConfig) => {
    try {
      const response = await fetch(`/api/admin/job-readiness/promotion-exams?id=${config.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete configuration')
      }

      toast({
        title: "Success",
        description: "Exam configuration deleted successfully.",
      })

      // Refresh the data
      await fetchExamConfigs()
    } catch (error) {
      console.error('Error deleting configuration:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete configuration. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle view attempt details
  const handleViewAttemptDetails = (attempt: JrPromotionExamAttempt) => {
    // TODO: Implement attempt details modal/page
    console.log('View attempt details:', attempt)
    toast({
      title: "Feature Coming Soon",
      description: "Detailed attempt view will be available soon.",
    })
  }

  // Handle create new config
  const handleCreateNew = () => {
    setEditingConfig(null)
    setIsFormOpen(true)
  }

  // Calculate stats for header display
  const totalAttempts = examAttempts.length

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-8 w-8" />
            Promotion Exams
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure promotion exam settings and monitor student attempts.
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create Exam Config
        </Button>
      </div>

      {/* Statistics */}
      {totalAttempts > 0 && (
        <JrPromotionExamStats attempts={examAttempts} />
      )}

      <div className="grid gap-6">
        {/* Exam Configurations */}
        <Card>
          <CardHeader>
            <CardTitle>Exam Configurations</CardTitle>
            <CardDescription>
              Configure promotion exam settings for each Job Readiness product.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {examConfigs.length === 0 && !isLoadingConfigs ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No exam configurations found</h3>
                  <p className="text-muted-foreground mb-4">
                    Set up promotion exam configurations for your Job Readiness products.
                  </p>
                  <Button onClick={handleCreateNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Config
                  </Button>
                </div>
              </div>
            ) : (
              <JrPromotionExamConfigTable
                examConfigs={examConfigs}
                isLoading={isLoadingConfigs}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRefresh={fetchExamConfigs}
              />
            )}
          </CardContent>
        </Card>

        {/* Student Exam Attempts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Student Exam Attempts</CardTitle>
                <CardDescription>
                  Monitor and review student promotion exam attempts.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <JrPromotionExamStatusBreakdown attempts={examAttempts} />
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {examAttempts.length === 0 && !isLoadingAttempts ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No exam attempts found</h3>
                  <p className="text-muted-foreground mb-4">
                    Student promotion exam attempts will appear here once exams are configured and taken.
                  </p>
                </div>
              </div>
            ) : (
              <JrPromotionExamAttemptsTable
                attempts={examAttempts}
                isLoading={isLoadingAttempts}
                onViewDetails={handleViewAttemptDetails}
                onRefresh={fetchExamAttempts}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      <JrPromotionExamConfigForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        config={editingConfig}
        products={products}
        onSubmit={handleFormSubmit}
        isLoading={isSubmitting}
      />
    </div>
  )
} 