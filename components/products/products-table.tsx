"use client"

import { useState } from "react"
import Link from "next/link"
import { BookOpen, FileText, MoreHorizontal, PlusCircle, Search, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ProductForm } from "@/components/products/product-form"

interface Product {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

interface ProductsTableProps {
  products: Product[]
}

export function ProductsTable({ products }: ProductsTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [showProductForm, setShowProductForm] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined)

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const handleCreateProduct = () => {
    setSelectedProduct(undefined)
    setShowProductForm(true)
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product)
    setShowProductForm(true)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  return (
    <Card>
      <div className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <Button onClick={handleCreateProduct}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 flex flex-col gap-4 rounded-md border p-4 sm:flex-row">
            {/* Add filters if needed */}
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <Link href={`/products/${product.id}`} className="font-medium hover:underline">
                        {product.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {product.description || "No description"}
                  </TableCell>
                  <TableCell>{formatDate(product.created_at)}</TableCell>
                  <TableCell>{formatDate(product.updated_at)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>
                          <Link href={`/products/${product.id}`} className="flex w-full">
                            View details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                          Edit product
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">Delete product</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProductForm
        open={showProductForm}
        onOpenChange={setShowProductForm}
        product={selectedProduct}
      />
    </Card>
  )
}
