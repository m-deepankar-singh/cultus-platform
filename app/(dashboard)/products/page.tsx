import type { Metadata } from "next"
import { ProductsTable } from "@/components/products/products-table"
import { ProductsHeader } from "@/components/products/products-header"

export const metadata: Metadata = {
  title: "Products - Upskilling Platform",
  description: "Manage products in the upskilling platform",
}

export default function ProductsPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
      <ProductsHeader />
      <ProductsTable />
    </div>
  )
}
