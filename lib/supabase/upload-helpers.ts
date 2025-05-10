"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * Uploads a file to a specified Supabase storage bucket
 * @param file The file to upload
 * @param bucketName The name of the bucket to upload to
 * @param path Optional path within the bucket (e.g., 'client-logos/client-123')
 * @returns The public URL of the uploaded file
 */
export async function uploadFileToBucket(
  file: File,
  bucketName: string,
  path?: string
): Promise<string> {
  const supabase = await createClient()
  
  // Generate a unique filename
  const fileExtension = file.name.split('.').pop() || ''
  const fileName = `${crypto.randomUUID()}.${fileExtension}`
  
  // Create the full path
  const filePath = path ? `${path}/${fileName}` : fileName
  
  // Convert File object to ArrayBuffer for upload
  const arrayBuffer = await file.arrayBuffer()
  
  // Upload the file
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, arrayBuffer, {
      cacheControl: '3600',
      upsert: false,
    })
  
  if (error) {
    console.error('Storage upload error:', error)
    throw new Error(`Failed to upload file: ${error.message}`)
  }
  
  if (!data || !data.path) {
    throw new Error('Failed to upload file: No path returned')
  }
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path)
  
  if (!urlData || !urlData.publicUrl) {
    throw new Error('Failed to get public URL for uploaded file')
  }

  console.log('Successfully uploaded file, public URL:', urlData.publicUrl)
  
  return urlData.publicUrl
}

/**
 * Uploads a client logo to the client_logo bucket
 * @param file The logo file to upload
 * @param clientId The ID of the client
 * @returns The public URL of the uploaded logo
 */
export async function uploadClientLogo(file: File, clientId?: string): Promise<string> {
  // If clientId is provided, use it as a folder path for organization
  const path = clientId ? clientId : undefined
  const publicUrl = await uploadFileToBucket(file, 'client_logo', path)
  console.log('Client logo uploaded, URL:', publicUrl)
  return publicUrl
}

/**
 * Uploads a product image to the product_images bucket
 * @param file The image file to upload
 * @param productId Optional ID of the product for path organization
 * @returns The public URL of the uploaded image
 */
export async function uploadProductImage(file: File, productId?: string): Promise<string> {
  try {
    const path = productId ? `products/${productId}` : 'products';
    console.log(`Uploading product image to path: ${path}`);
    const publicUrl = await uploadFileToBucket(file, 'product_images', path);
    console.log('Product image uploaded successfully, full URL:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Error in uploadProductImage:', error);
    throw error;
  }
}

/**
 * Removes a file from Supabase storage given its public URL
 * @param publicUrl The public URL of the file to remove
 * @returns True if successful, false otherwise
 */
export async function removeFileByUrl(publicUrl: string): Promise<boolean> {
  const supabase = await createClient()
  
  // Extract the bucket and path from the URL
  try {
    const url = new URL(publicUrl)
    const pathParts = url.pathname.split('/')
    
    // Format should be like /storage/v1/object/public/bucket-name/path
    const bucketIndex = pathParts.indexOf('public') + 1
    
    if (bucketIndex <= 0 || bucketIndex >= pathParts.length) {
      throw new Error('Invalid URL format')
    }
    
    const bucketName = pathParts[bucketIndex]
    const path = pathParts.slice(bucketIndex + 1).join('/')
    
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([path])
    
    if (error) {
      console.error('Storage remove error:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error removing file:', error)
    return false
  }
} 