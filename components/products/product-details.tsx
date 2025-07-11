"use client"

import { Image as ImageIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import NextImage from "next/image" // Renamed to avoid conflict with Lucide icon
import { ModuleManager } from "@/components/modules/module-manager"

interface Product {
  id: string
  name: string
  description: string | null
  image_url: string | null // Added image_url
  created_at: string // Assuming these are passed from the page
  updated_at: string // Assuming these are passed from the page
  is_active?: boolean // Assuming this might be part of product data
}

interface ProductDetailsProps {
  product: Product
}

export function ProductDetails({ product }: ProductDetailsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left Column for Image and Basic Info (if desired) */}
      <div className="md:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Product Image</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center p-4">
            {product.image_url ? (
              <div className="relative w-full aspect-video rounded-md overflow-hidden border">
                <NextImage 
                  src={product.image_url}
                  alt={product.name || "Product image"}
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="w-full aspect-video rounded-md border bg-muted flex items-center justify-center">
                <ImageIcon className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>
        {/* You could add other summary details here if needed */}
      </div>

      {/* Right Column for Modules */}
      <div className="md:col-span-2">
        <Card>
          <CardContent className="p-6">
            <ModuleManager productId={product.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
