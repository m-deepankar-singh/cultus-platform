"use client"

import { useState } from "react"
import { Building2, Layers, Settings } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClientsList } from "@/components/products/clients-list"
import { ProductSettings } from "@/components/products/product-settings"
import { ModuleManager } from "@/components/modules/module-manager"

interface Product {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

interface ProductDetailsProps {
  product: Product
}

export function ProductDetails({ product }: ProductDetailsProps) {
  const [activeTab, setActiveTab] = useState("modules")

  return (
    <Card>
      <CardHeader className="border-b p-4">
        <Tabs defaultValue="modules" onValueChange={setActiveTab}>
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
        <Tabs defaultValue="modules">
          <TabsContent value="modules" className="m-0">
            <div className="p-6">
              <ModuleManager productId={product.id} />
            </div>
          </TabsContent>
          <TabsContent value="clients" className="m-0">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h2 className="text-xl font-bold">Clients</h2>
                <p className="text-muted-foreground">Manage client access to this product</p>
              </div>
            </div>
            <ClientsList productId={product.id} />
          </TabsContent>
          <TabsContent value="settings" className="m-0">
            <div className="border-b p-4">
              <h2 className="text-xl font-bold">Settings</h2>
              <p className="text-muted-foreground">Configure product settings</p>
            </div>
            <ProductSettings productId={product.id} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
