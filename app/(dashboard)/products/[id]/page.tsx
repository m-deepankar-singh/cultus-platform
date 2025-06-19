import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ProductDetails } from "@/components/products/product-details"
import { ProductHeader } from "@/components/products/product-header"
import { createClient } from "@/lib/supabase/server"

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const paramsObj = await params
  const product = await getProduct(paramsObj.id)
  
  if (!product) {
    return {
      title: "Product Not Found - Upskilling Platform",
      description: "The requested product could not be found"
    }
  }
  
  return {
    title: `${product.name} - Upskilling Platform`,
    description: product.description || "View and edit product details"
  }
}

async function getProduct(id: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single()
  
  if (error || !data) {
    console.error("Error fetching product:", error)
    return null
  }
  
  return data
}

export default async function ProductDetailsPage({ params }: Props) {
  const paramsObj = await params
  const product = await getProduct(paramsObj.id)
  
  if (!product) {
    notFound()
  }
  
  return (
    <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
      <ProductHeader product={product} />
      <ProductDetails product={product} />
    </div>
  )
}
