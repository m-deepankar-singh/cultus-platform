import type { Metadata } from "next"
import { ProductDetails } from "@/components/products/product-details"
import { ProductHeader } from "@/components/products/product-header"

export const metadata: Metadata = {
  title: "Product Details - Upskilling Platform",
  description: "View and edit product details",
}

export default function ProductDetailsPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
      <ProductHeader id={params.id} />
      <ProductDetails id={params.id} />
    </div>
  )
}
