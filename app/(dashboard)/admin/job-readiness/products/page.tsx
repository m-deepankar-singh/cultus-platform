"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Package } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { JrProductsTable, JrProductForm } from "@/components/job-readiness/admin"
import {
  JrProduct,
  CreateJrProductRequest,
  UpdateJrProductRequest,
  getJrProducts,
  createJrProduct,
  updateJrProduct,
  deleteJrProduct,
} from "@/lib/api/job-readiness/products"

export default function JobReadinessProductsPage() {
  const { toast } = useToast()
  const [products, setProducts] = React.useState<JrProduct[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [editingProduct, setEditingProduct] = React.useState<JrProduct | null>(null)

  // Load products on mount
  React.useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setIsLoading(true)
      const data = await getJrProducts()
      setProducts(data)
    } catch (error) {
      console.error("Failed to load products:", error)
      toast({
        title: "Error",
        description: "Failed to load products. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProduct = () => {
    setEditingProduct(null)
    setIsFormOpen(true)
  }

  const handleEditProduct = (product: JrProduct) => {
    setEditingProduct(product)
    setIsFormOpen(true)
  }

  const handleFormSubmit = async (data: CreateJrProductRequest | UpdateJrProductRequest) => {
    try {
      setIsSubmitting(true)
      
      if ("id" in data) {
        // Update existing product
        await updateJrProduct(data)
        toast({
          title: "Success",
          description: "Product updated successfully.",
        })
      } else {
        // Create new product
        await createJrProduct(data)
        toast({
          title: "Success", 
          description: "Product created successfully.",
        })
      }

      // Reload products and close form
      await loadProducts()
      setIsFormOpen(false)
      setEditingProduct(null)
    } catch (error) {
      console.error("Failed to save product:", error)
      toast({
        title: "Error",
        description: "Failed to save product. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteProduct = async (product: JrProduct) => {
    try {
      await deleteJrProduct(product.id)
      toast({
        title: "Success",
        description: "Product deleted successfully.",
      })
      
      // Reload products
      await loadProducts()
    } catch (error) {
      console.error("Failed to delete product:", error)
      toast({
        title: "Error",
        description: "Failed to delete product. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-8 w-8" />
            Job Readiness Products
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage Job Readiness products and their tier configurations.
          </p>
        </div>
        <Button onClick={handleCreateProduct}>
          <Plus className="h-4 w-4 mr-2" />
          Create Product
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Products Overview</CardTitle>
          <CardDescription>
            Configure tier score ranges and manage Job Readiness product settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 && !isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating your first Job Readiness product.
                </p>
                <Button onClick={handleCreateProduct}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Product
                </Button>
              </div>
            </div>
          ) : (
            <JrProductsTable
              products={products}
              isLoading={isLoading}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
              onRefresh={loadProducts}
            />
          )}
        </CardContent>
      </Card>

      {/* Product Form Dialog */}
      <JrProductForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        product={editingProduct}
        onSubmit={handleFormSubmit}
        isLoading={isSubmitting}
      />
    </div>
  )
} 