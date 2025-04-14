"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface ProductSettingsProps {
  productId: string
}

export function ProductSettings({ productId }: ProductSettingsProps) {
  // In a real app, this data would come from an API
  const product = {
    id: productId,
    name: "Introduction to Data Science",
    description: "A comprehensive introduction to the field of data science, covering fundamental concepts and tools.",
    type: "Course",
    status: "Published",
    isPublic: true,
    requiresCompletion: true,
    allowSkipping: false,
    certificateEnabled: true,
  }

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Product Name</Label>
          <Input id="name" defaultValue={product.name} placeholder="Enter product name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Product Type</Label>
          <Select defaultValue={product.type}>
            <SelectTrigger id="type">
              <SelectValue placeholder="Select product type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Course">Course</SelectItem>
              <SelectItem value="Assessment">Assessment</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          defaultValue={product.description}
          placeholder="Enter product description"
          rows={4}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Access Settings</h3>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="public">Public Product</Label>
            <p className="text-sm text-muted-foreground">Make this product available to all users</p>
          </div>
          <Switch id="public" defaultChecked={product.isPublic} />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Completion Settings</h3>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="requires-completion">Requires Completion</Label>
            <p className="text-sm text-muted-foreground">Users must complete all modules to finish the product</p>
          </div>
          <Switch id="requires-completion" defaultChecked={product.requiresCompletion} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="allow-skipping">Allow Module Skipping</Label>
            <p className="text-sm text-muted-foreground">Users can skip modules and complete them in any order</p>
          </div>
          <Switch id="allow-skipping" defaultChecked={product.allowSkipping} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="certificate">Enable Certificate</Label>
            <p className="text-sm text-muted-foreground">Users receive a certificate upon completion</p>
          </div>
          <Switch id="certificate" defaultChecked={product.certificateEnabled} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>Save Changes</Button>
      </div>
    </div>
  )
}
