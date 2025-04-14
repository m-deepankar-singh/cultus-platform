"use client"

import { useState } from "react"
import { BookOpen, Building2, FileText, Layers, PlusCircle, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ModulesList } from "@/components/products/modules-list"
import { ClientsList } from "@/components/products/clients-list"
import { ProductSettings } from "@/components/products/product-settings"

interface ProductDetailsProps {
  id: string
}

export function ProductDetails({ id }: ProductDetailsProps) {
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
        <TabsContent value="modules" className="m-0">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <CardTitle>Modules</CardTitle>
              <CardDescription>Manage the modules in this product</CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Module
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <BookOpen className="mr-2 h-4 w-4" />
                  <span>Content Module</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Quiz Module</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <ModulesList productId={id} />
        </TabsContent>
        <TabsContent value="clients" className="m-0">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <CardTitle>Clients</CardTitle>
              <CardDescription>Manage client access to this product</CardDescription>
            </div>
            <Button>
              <Building2 className="mr-2 h-4 w-4" />
              Assign to Client
            </Button>
          </div>
          <ClientsList productId={id} />
        </TabsContent>
        <TabsContent value="settings" className="m-0">
          <div className="border-b p-4">
            <CardTitle>Settings</CardTitle>
            <CardDescription>Configure product settings</CardDescription>
          </div>
          <ProductSettings productId={id} />
        </TabsContent>
      </CardContent>
    </Card>
  )
}
