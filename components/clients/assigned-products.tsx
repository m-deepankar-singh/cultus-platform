"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Package, Trash2 } from "lucide-react"
import { AssignProductModal } from "@/components/clients/assign-product-modal"
import { useToast } from "@/components/ui/use-toast"
import { isJobReadinessProduct } from "@/lib/utils/product-utils"

interface Product {
  id: string
  name: string
  description: string | null
  type?: string
  created_at: string
  updated_at: string
  created_by: string | null
}

interface AssignedProductsProps {
  clientId: string
  clientName: string
}

export function AssignedProducts({ clientId, clientName }: AssignedProductsProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [showAssignModal, setShowAssignModal] = useState(false)
  const { toast } = useToast()

  // Fetch assigned products
  const fetchAssignedProducts = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/staff/clients/${clientId}/products`)
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }
      
      const data = await response.json()
      setProducts(data)
    } catch (error) {
      console.error("Failed to fetch assigned products:", error)
      toast({
        title: "Error",
        description: "Failed to load assigned products. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Unassign a product
  const handleUnassignProduct = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to unassign "${productName}" from this client?`)) {
      return
    }

    try {
      const response = await fetch(`/api/staff/clients/${clientId}/products/${productId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      toast({
        title: "Product unassigned",
        description: `${productName} has been unassigned from ${clientName}.`,
      })
      
      // Refresh the list
      fetchAssignedProducts()
    } catch (error) {
      console.error("Failed to unassign product:", error)
      toast({
        title: "Error",
        description: "Failed to unassign product. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Load products on component mount
  useEffect(() => {
    fetchAssignedProducts()
  }, [clientId])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Assigned Products</CardTitle>
          <CardDescription>Products assigned to this client</CardDescription>
        </div>
        <Button onClick={() => setShowAssignModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Assign Product
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-gray-800"></div>
          </div>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No products assigned to this client yet.
          </p>
        ) : (
          <div className="space-y-4">
            {products.map((product) => {
              const isJobReadiness = isJobReadinessProduct(product)
              
              return (
                <div 
                  key={product.id} 
                  className="flex items-center justify-between rounded-md border p-4 hover:bg-accent/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
                      isJobReadiness ? "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300" : "bg-primary/10 text-primary"
                    }`}>
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{product.name}</h3>
                        {isJobReadiness && (
                          <span className="text-xs bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 px-1.5 py-0.5 rounded-full">
                            Job Readiness
                          </span>
                        )}
                      </div>
                      {product.description && (
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleUnassignProduct(product.id, product.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <AssignProductModal
        open={showAssignModal}
        setOpen={setShowAssignModal}
        clientId={clientId}
        clientName={clientName}
        onSuccess={fetchAssignedProducts}
        existingProductIds={products.map(p => p.id)}
      />
    </Card>
  )
} 