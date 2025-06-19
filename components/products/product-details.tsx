"use client"

import { useState } from "react"
import { Building2, Layers, Settings, Image as ImageIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import NextImage from "next/image" // Renamed to avoid conflict with Lucide icon
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClientsList } from "@/components/products/clients-list"
import { ProductSettings } from "@/components/products/product-settings"
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
  const [activeTab, setActiveTab] = useState("modules")

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

      {/* Right Column for Tabs */}
      <div className="md:col-span-2">
    <Card>
      <CardHeader className="border-b p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="modules" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span>Modules</span>
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>Clients</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="p-0">
            {/* The Tabs component for content should not re-declare defaultValue, it uses the parent's value */}
            <Tabs value={activeTab}> 
          <TabsContent value="modules" className="m-0">
            <div className="p-6">
                  <h2 className="text-xl font-bold mb-1">Modules</h2>
                  <p className="text-muted-foreground mb-4">Manage modules associated with this product.</p>
              <ModuleManager productId={product.id} />
            </div>
          </TabsContent>
          <TabsContent value="clients" className="m-0">
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-1">Assigned Clients</h2>
                  <p className="text-muted-foreground mb-4">Manage client access to this product.</p>
                  <ClientsList productId={product.id} />
            </div>
          </TabsContent>
          <TabsContent value="settings" className="m-0">
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-1">Product Settings</h2>
                  <p className="text-muted-foreground mb-4">Configure general product settings.</p>
                  {/* Pass only productId as originally intended, unless ProductSettings is refactored */}
                  <ProductSettings productId={product.id} /> 
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
      </div>
    </div>
  )
}
