"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Plus, Wand2, Settings, Users, FolderOpen } from "lucide-react"
import { JrBackgroundsTable } from "@/components/job-readiness/admin/jr-backgrounds-table"
import { JrBackgroundForm } from "@/components/job-readiness/admin/jr-background-form"
import {
  JrBackground,
  CreateJrBackgroundRequest,
  UpdateJrBackgroundRequest,
  getJrBackgrounds,
  createJrBackground,
  updateJrBackground,
  deleteJrBackground,
  JrBackgroundsApiError,
} from "@/lib/api/job-readiness/backgrounds"

export default function JobReadinessBackgroundsPage() {
  const [backgrounds, setBackgrounds] = React.useState<JrBackground[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [editingBackground, setEditingBackground] = React.useState<JrBackground | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Load backgrounds on component mount
  const loadBackgrounds = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getJrBackgrounds()
      setBackgrounds(data)
    } catch (error) {
      console.error("Failed to load backgrounds:", error)
      toast.error(
        error instanceof JrBackgroundsApiError
          ? error.message
          : "Failed to load background configurations"
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadBackgrounds()
  }, [loadBackgrounds])

  // Handle creating a new background
  const handleCreate = () => {
    setEditingBackground(null)
    setIsFormOpen(true)
  }

  // Handle editing an existing background
  const handleEdit = (background: JrBackground) => {
    setEditingBackground(background)
    setIsFormOpen(true)
  }

  // Handle form submission (create or update)
  const handleSubmit = async (data: CreateJrBackgroundRequest | UpdateJrBackgroundRequest) => {
    try {
      setIsSubmitting(true)
      
      if ("id" in data) {
        // Update existing background
        await updateJrBackground(data)
        toast.success("Background configuration updated successfully")
      } else {
        // Create new background
        await createJrBackground(data)
        toast.success("Background configuration created successfully")
      }

      // Reload the data
      await loadBackgrounds()
      
      // Close the form
      setIsFormOpen(false)
      setEditingBackground(null)
    } catch (error) {
      console.error("Failed to save background:", error)
      toast.error(
        error instanceof JrBackgroundsApiError
          ? error.message
          : "Failed to save background configuration"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle deleting a background
  const handleDelete = async (background: JrBackground) => {
    try {
      await deleteJrBackground(background.id)
      toast.success("Background configuration deleted successfully")
      
      // Reload the data
      await loadBackgrounds()
    } catch (error) {
      console.error("Failed to delete background:", error)
      toast.error(
        error instanceof JrBackgroundsApiError
          ? error.message
          : "Failed to delete background configuration"
      )
    }
  }

  // Handle form dialog close
  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open)
    if (!open) {
      setEditingBackground(null)
    }
  }

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wand2 className="h-8 w-8" />
            Background Configuration
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure AI project generation settings for different student backgrounds and skill levels.
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Background
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Configurations</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backgrounds.length}</div>
            <p className="text-xs text-muted-foreground">
              Background types configured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Background Types</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(backgrounds.map(bg => bg.background_type)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Unique background types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project Types</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(backgrounds.map(bg => bg.project_type)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Different project types
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Background Configurations</CardTitle>
          <CardDescription>
            Manage AI project generation settings for each student background and tier combination.
            Each configuration defines how projects are generated, graded, and evaluated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backgrounds.length === 0 && !isLoading ? (
            <div className="text-center py-12">
              <Wand2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No background configurations found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first background configuration to define AI project generation settings.
              </p>
              <Button onClick={handleCreate} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Background Configuration
              </Button>
            </div>
          ) : (
            <JrBackgroundsTable
              backgrounds={backgrounds}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRefresh={loadBackgrounds}
            />
          )}
        </CardContent>
      </Card>

      {/* Background Form Dialog */}
      <JrBackgroundForm
        open={isFormOpen}
        onOpenChange={handleFormClose}
        background={editingBackground}
        existingBackgrounds={backgrounds}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />
    </div>
  )
} 