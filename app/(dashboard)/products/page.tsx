import type { Metadata } from "next"
import { ProductsTable } from "@/components/products/products-table"
import { ProductsHeader } from "@/components/products/products-header"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Products - Upskilling Platform",
  description: "Manage products in the upskilling platform",
}

async function getProducts() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name")
  
  if (error) {
    console.error("Error fetching products:", error)
    return []
  }
  
  return data || []
}

export default async function ProductsPage() {
  const products = await getProducts()
  
  return (
    <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
      <ProductsHeader />
      <ProductsTable products={products} />
    </div>
  )
}
