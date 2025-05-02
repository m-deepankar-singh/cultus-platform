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
import { Package, CheckIcon } from "lucide-react"

interface Product {
  id: string
  name: string
  description: string | null
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
  const { toast } = useToast()

  // Fetch all available products
  const fetchProducts = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/products")
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Filter out products already assigned to this client
      const availableProducts = data.filter(
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
        throw new Error(`Error: ${response.status}`)
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
        description: "Failed to assign product. Please try again.",
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

  // Fetch products when modal opens
  useEffect(() => {
    if (open) {
      fetchProducts()
    }
  }, [open, existingProductIds])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Product to {clientName}</DialogTitle>
          <DialogDescription>
            Select a product to assign to this client. Students from this client will be able to access the assigned products.
          </DialogDescription>
        </DialogHeader>

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
                  filteredProducts.map((product) => (
                    <CommandItem
                      key={product.id}
                      onSelect={() => setSelectedProductId(product.id)}
                      className="flex items-center gap-2 px-4 py-3"
                    >
                      <div className={`mr-2 flex h-8 w-8 items-center justify-center rounded-full ${
                        selectedProductId === product.id 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-primary/10 text-primary"
                      }`}>
                        {selectedProductId === product.id ? (
                          <CheckIcon className="h-4 w-4" />
                        ) : (
                          <Package className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">{product.name}</span>
                        {product.description && (
                          <span className="text-xs text-muted-foreground">
                            {product.description}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))
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