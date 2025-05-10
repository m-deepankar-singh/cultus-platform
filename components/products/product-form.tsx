"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { ProductSchema, ProductFormData } from "@/lib/schemas/product"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { FileUpload } from "@/components/ui/file-upload"
import { uploadProductImage } from "@/lib/supabase/upload-helpers"

interface ProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: ProductFormData & { id: string }
}

export function ProductForm({ open, onOpenChange, product }: ProductFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isImageUploading, setIsImageUploading] = useState(false)
  const isEditing = !!product

  const form = useForm<ProductFormData>({
    resolver: zodResolver(ProductSchema),
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      image_url: product?.image_url || null,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: product?.name || "",
        description: product?.description || "",
        image_url: product?.image_url || null,
      });
    } else {
      form.reset({ name: "", description: "", image_url: null });
    }
  }, [product, open, form]);

  async function onSubmit(data: ProductFormData) {
    if (isImageUploading) {
      toast({
        variant: "destructive",
        title: "Image upload in progress",
        description: "Please wait for the image to finish uploading before submitting the form.",
      })
      return;
    }

    setIsSubmitting(true)
    try {
      const url = isEditing 
        ? `/api/admin/products/${product.id}` 
        : "/api/admin/products"
      
      const method = isEditing ? "PATCH" : "POST"
      
      // Important: Get the image_url directly from the form state
      const imageUrl = form.getValues("image_url");
      
      const payload: ProductFormData = {
        name: data.name,
        description: data.description,
        image_url: imageUrl // Use the value from form state directly
      };
      
      console.log('Submitting product form with payload:', {
        name: payload.name,
        description: payload.description,
        image_url: payload.image_url ? payload.image_url.substring(0, 30) + "..." : "null"
      });
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData);
        throw new Error(errorData.error || errorData.message || "Something went wrong")
      }

      toast({
        title: isEditing ? "Product updated" : "Product created",
        description: isEditing 
          ? "The product has been updated successfully." 
          : "The new product has been created successfully.",
      })
      
      router.refresh()
      onOpenChange(false)
      form.reset({ name: "", description: "", image_url: null });
    } catch (error) {
      console.error("Error submitting product form:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error 
          ? error.message 
          : "An error occurred. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImageUpload = async (file: File): Promise<string> => {
    try {
      setIsImageUploading(true);
      console.log(`Uploading image file: ${file.name} (${Math.round(file.size/1024)}KB)`);
      const uploadedUrl = await uploadProductImage(file, product?.id);
      console.log(`Image upload successful, full URL: ${uploadedUrl}`);
      
      // Update the form with the URL returned from the upload function
      form.setValue("image_url", uploadedUrl, { shouldValidate: true, shouldDirty: true });
      return uploadedUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    } finally {
      setIsImageUploading(false);
    }
  };

  const handleImageRemove = () => {
    console.log("Removing image, setting image_url to null");
    form.setValue("image_url", null, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (isImageUploading) {
        toast({
          variant: "destructive",
          title: "Image upload in progress",
          description: "Please wait for the image to finish uploading before closing.",
        });
        return;
      }
      onOpenChange(isOpen);
      if (!isOpen) {
        form.reset({ name: "", description: "", image_url: null });
      }
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit product" : "Create new product"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the product details below." 
              : "Add a new product to your catalog."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter product name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      placeholder="Enter product description"
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Image {isImageUploading && "(Uploading...)"}</FormLabel>
                  <FormControl>
                    <FileUpload
                      currentImageUrl={field.value}
                      onFileUpload={handleImageUpload}
                      onRemove={handleImageRemove}
                      accept="image/*"
                      maxSizeMB={5}
                      disabled={isImageUploading}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Recommended aspect ratio: 16:9. Max file size: 5MB.
                    {isImageUploading && " Please wait for upload to complete before submitting."}
                  </p>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (isImageUploading) {
                    toast({
                      variant: "destructive",
                      title: "Upload in progress",
                      description: "Please wait for the image upload to complete.",
                    });
                    return;
                  }
                  onOpenChange(false);
                  form.reset({ name: "", description: "", image_url: null });
                }}
                disabled={isSubmitting || isImageUploading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isImageUploading}>
                {isSubmitting ? (
                  <span>Saving...</span>
                ) : isImageUploading ? (
                  <span>Uploading image...</span>
                ) : isEditing ? (
                  "Update product"
                ) : (
                  "Create product"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 