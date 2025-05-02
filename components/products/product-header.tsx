"use client"

import { useState } from "react"
import { ArrowLeft, BookOpen, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ProductForm } from "./product-form"

interface Product {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

interface ProductHeaderProps {
  product: Product
}

export function ProductHeader({ product }: ProductHeaderProps) {
  const router = useRouter()
  const [showEditForm, setShowEditForm] = useState(false)
  
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href="/products">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
            <p className="text-muted-foreground">
              {product.description || "No description provided"}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setShowEditForm(true)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </div>
      
      <ProductForm
        open={showEditForm}
        onOpenChange={setShowEditForm}
        product={product}
      />
    </div>
  )
}
