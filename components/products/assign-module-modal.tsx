"use client"

import { useState, useEffect } from "react"
import { Check, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { DataPagination } from "@/components/ui/data-pagination"

interface Module {
  id: string
  name: string
  type: "Course" | "Assessment"
  created_at: string
  updated_at: string
  product_id: string | null
  configuration: Record<string, unknown>
  products?: { name: string } | null
}

interface PaginatedResponse {
  data: Module[];
  metadata: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

interface AssignModuleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string
  onAssigned: () => void
}

export function AssignModuleModal({ open, onOpenChange, productId, onAssigned }: AssignModuleModalProps) {
  const { toast } = useToast()
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [selectedModules, setSelectedModules] = useState<string[]>([])
  const [assigning, setAssigning] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [pageSize] = useState(20)

  // Fetch modules on open, page change, or search change
  useEffect(() => {
    if (open) {
      fetchModules()
    }
  }, [open, currentPage, debouncedSearchQuery])
  
  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      setCurrentPage(1) // Reset to first page when search changes
    }, 500)
    
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("")
      setDebouncedSearchQuery("")
      setSelectedModules([])
      setCurrentPage(1)
    }
  }, [open])

  const fetchModules = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
      })
      
      if (debouncedSearchQuery) {
        params.append('search', debouncedSearchQuery)
      }
      
      const response = await fetch(`/api/admin/modules?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch modules: ${response.status}`)
      }
      
      const paginatedData: PaginatedResponse = await response.json()
      
      setModules(paginatedData.data)
      setTotalCount(paginatedData.metadata.totalCount)
      setTotalPages(paginatedData.metadata.totalPages)
    } catch (err) {
      console.error("Error fetching modules:", err)
      setError("Failed to load modules. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleAssignModules = async () => {
    if (selectedModules.length === 0) return
    
    setAssigning(true)
    
    try {
      // For each selected module, update its product_id
      const results = await Promise.all(
        selectedModules.map(moduleId => 
          fetch(`/api/admin/modules/${moduleId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ product_id: productId })
          })
        )
      )
      
      // Check if any failed
      const failed = results.filter(r => !r.ok).length
      
      if (failed > 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: `Failed to assign ${failed} module(s). Please try again.`
        })
      } else {
        toast({
          title: "Modules assigned",
          description: `Successfully assigned ${selectedModules.length} module(s) to this product.`
        })
        onOpenChange(false)
        onAssigned()
      }
    } catch (err) {
      console.error("Error assigning modules:", err)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to assign modules. Please try again."
      })
    } finally {
      setAssigning(false)
    }
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Filter modules to exclude ones already assigned to this product
  // No need to filter by search, the API already does that
  const filteredModules = modules.filter(module => module.product_id !== productId)

  const toggleModuleSelection = (moduleId: string) => {
    setSelectedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId) 
        : [...prev, moduleId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Assign Modules</DialogTitle>
          <DialogDescription>
            Select existing modules to assign to this product. You can assign both course and assessment modules.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search modules..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500">{error}</p>
              <Button onClick={fetchModules} variant="outline" size="sm" className="mt-2">
                Try Again
              </Button>
            </div>
          ) : filteredModules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {debouncedSearchQuery
                ? "No matching modules found"
                : "No available modules to assign"}
            </div>
          ) : (
            <>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {filteredModules.map((module) => (
                    <div
                      key={module.id}
                      className={`flex items-center space-x-3 rounded-md border p-3 cursor-pointer transition-colors ${
                        selectedModules.includes(module.id) ? "bg-primary/5 border-primary/30" : "hover:bg-muted"
                      }`}
                      onClick={() => toggleModuleSelection(module.id)}
                    >
                      <div className={`flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full border ${
                        selectedModules.includes(module.id) ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
                      }`}>
                        {selectedModules.includes(module.id) && <Check className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{module.name}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {module.products?.name ? `Currently in: ${module.products.name}` : "Not assigned"}
                        </div>
                      </div>
                      <Badge>{module.type}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {/* Pagination controls */}
              {totalPages > 1 && (
                <div>
                  <DataPagination 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalCount}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="mt-2">
          <div className="text-sm text-muted-foreground">
            Selected: <span className="font-medium">{selectedModules.length}</span> module(s)
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={assigning}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAssignModules} 
            disabled={selectedModules.length === 0 || assigning}
          >
            {assigning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              "Assign Modules"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 