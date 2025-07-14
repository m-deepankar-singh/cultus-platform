"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useToast } from "@/components/ui/use-toast"
import { Package, CheckIcon, AlertTriangle } from "lucide-react"
import { isJobReadinessProduct } from "@/lib/utils/product-utils"

interface Product {
  id: string
  name: string
  description: string | null
  type?: string
}

interface PaginatedResponse {
  data: Product[];
  metadata: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

interface AssignProductModalProps {
  open: boolean
  setOpen: (open: boolean) => void
  clientId: string
  clientName: string
  onSuccess?: () => void
  existingProductIds: string[]
}

export function AssignProductModal({
  open,
  setOpen,
  clientId,
  clientName,
  onSuccess,
  existingProductIds,
}: AssignProductModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [hasExistingJobReadiness, setHasExistingJobReadiness] = useState(false)
  const { toast } = useToast()

  // Check if client already has job readiness products
  const checkExistingJobReadiness = async () => {
    try {
      const response = await fetch(`/api/staff/clients/${clientId}/products`)
      if (response.ok) {
        const existingProducts: Product[] = await response.json()
        const hasJobReadiness = existingProducts.some(product => isJobReadinessProduct(product))
        setHasExistingJobReadiness(hasJobReadiness)
      }
    } catch (error) {
      console.error("Failed to check existing products:", error)
    }
  }

  // Fetch all available products
  const fetchProducts = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/products?pageSize=100")
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }
      
      const result: PaginatedResponse = await response.json()
      
      // Make sure result.data exists and is an array
      if (!result.data || !Array.isArray(result.data)) {
        console.error("Invalid API response format:", result)
        throw new Error("Invalid response format from server")
      }
      
      // Filter out products already assigned to this client
      const availableProducts = result.data.filter(
        (product: Product) => !existingProductIds.includes(product.id)
      )
      
      setProducts(availableProducts)
      setFilteredProducts(availableProducts)
    } catch (error) {
      console.error("Failed to fetch products:", error)
      toast({
        title: "Error",
        description: "Failed to load products. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Assign the selected product to the client
  const assignProduct = async () => {
    if (!selectedProductId) {
      toast({
        title: "Error",
        description: "Please select a product to assign.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/staff/clients/${clientId}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ product_id: selectedProductId }),
      })

      if (!response.ok) {
        // Try to get more detailed error information
        const errorData = await response.json().catch(() => ({}))
        
        if (response.status === 403) {
          // Handle specific permission errors
          const errorMessage = errorData.error || "You don't have permission to assign products to this client."
          throw new Error(errorMessage)
        } else if (response.status === 409) {
          // Handle job readiness conflicts with detailed error message
          const errorMessage = errorData.error || "Product assignment conflict occurred."
          
          // Show special toast for job readiness conflicts
          if (errorMessage.toLowerCase().includes('job readiness')) {
            toast({
              title: "Job Readiness Product Conflict",
              description: errorMessage + (errorData.existing_job_readiness_product 
                ? ` (Current: ${errorData.existing_job_readiness_product.name})`
                : ''),
              variant: "destructive",
            })
            return
          }
          
          throw new Error(errorMessage)
        } else {
          throw new Error(`Error: ${response.status}${errorData.error ? ` - ${errorData.error}` : ''}`)
        }
      }

      const selectedProduct = products.find(p => p.id === selectedProductId)
      
      toast({
        title: "Product assigned",
        description: `${selectedProduct?.name} has been assigned to ${clientName}.`,
      })

      // Reset and close the modal
      setSelectedProductId(null)
      setOpen(false)
      
      // Refresh the parent component
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error("Failed to assign product:", error)
      toast({
        title: "Error",
        description: error instanceof Error 
          ? error.message 
          : "Failed to assign product. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Filter products based on search input
  const handleSearch = (value: string) => {
    if (!value) {
      setFilteredProducts(products)
      return
    }
    
    const filtered = products.filter(product => 
      product.name.toLowerCase().includes(value.toLowerCase()) || 
      (product.description && product.description.toLowerCase().includes(value.toLowerCase()))
    )
    
    setFilteredProducts(filtered)
  }

  // Fetch products and check existing job readiness when modal opens
  useEffect(() => {
    if (open) {
      checkExistingJobReadiness()
      fetchProducts()
    }
  }, [open, existingProductIds, clientId])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Product to {clientName}</DialogTitle>
          <DialogDescription>
            Select a product to assign to this client. Students from this client will be able to access the assigned products.
          </DialogDescription>
        </DialogHeader>

        {hasExistingJobReadiness && (
          <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/30 rounded-md">
            <div className="flex items-center gap-2 text-orange-800 dark:text-orange-300">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Job Readiness Limit Reached</span>
            </div>
            <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
              This client already has a job readiness product assigned. Only one job readiness product can be assigned per client.
            </p>
          </div>
        )}
        
        <div className="py-4">
          <Command className="rounded-lg border shadow-md">
            <CommandInput 
              placeholder="Search for products..." 
              onValueChange={handleSearch}
            />
            <CommandList>
              <CommandEmpty>No products found.</CommandEmpty>
              <CommandGroup>
                {isLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-gray-800"></div>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {products.length === 0 
                      ? "No products available to assign."
                      : "No matching products found."}
                  </div>
                ) : (
                  filteredProducts.map((product) => {
                    const isJobReadiness = isJobReadinessProduct(product)
                    const isDisabled = isJobReadiness && hasExistingJobReadiness
                    
                    return (
                      <CommandItem
                        key={product.id}
                        onSelect={() => !isDisabled && setSelectedProductId(product.id)}
                        className={`flex items-center gap-2 px-4 py-3 ${
                          isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        disabled={isDisabled}
                      >
                        <div className={`mr-2 flex h-8 w-8 items-center justify-center rounded-full ${
                          selectedProductId === product.id 
                            ? "bg-primary text-primary-foreground" 
                            : isDisabled
                            ? "bg-destructive/10 dark:bg-destructive/20 text-destructive"
                            : "bg-primary/10 text-primary"
                        }`}>
                          {selectedProductId === product.id ? (
                            <CheckIcon className="h-4 w-4" />
                          ) : isDisabled ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            <Package className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex flex-col flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{product.name}</span>
                            {isJobReadiness && (
                              <span className="text-xs bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 px-1.5 py-0.5 rounded-full">
                                Job Readiness
                              </span>
                            )}
                          </div>
                          {product.description && (
                            <span className="text-xs text-muted-foreground">
                              {product.description}
                            </span>
                          )}
                          {isDisabled && (
                            <span className="text-xs text-destructive mt-1">
                              Client already has a job readiness product assigned
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    )
                  })
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={assignProduct}
            disabled={!selectedProductId || isLoading}
          >
            {isLoading ? "Assigning..." : "Assign Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 