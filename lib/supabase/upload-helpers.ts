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

/**
 * Uploads an expert session video to the expert_session_videos bucket
 * @param file The video file to upload
 * @param productId The ID of the product for organization
 * @returns Object with upload path and public URL
 */
export async function uploadExpertSessionVideo(file: File, productId: string): Promise<{path: string, publicUrl: string}> {
  try {
    const supabase = await createClient();
    
    // Validate file type
    if (!file.type.startsWith('video/')) {
      throw new Error('File must be a video');
    }

    // Check file size (limit to 500MB for expert session videos)
    const maxSizeInMB = 500;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      throw new Error(`File size must be less than ${maxSizeInMB}MB`);
    }

    // Generate unique file path
    const fileExtension = file.name.split('.').pop() || 'mp4';
    const uniqueFileName = `${crypto.randomUUID()}.${fileExtension}`;
    const filePath = `products/${productId}/expert-sessions/${uniqueFileName}`;
    
    console.log(`Uploading expert session video to path: ${filePath}`);
    
    // Upload video to public bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('expert-session-videos-public')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Video upload error:', uploadError);
      throw new Error(`Failed to upload video: ${uploadError.message}`);
    }

    if (!uploadData || !uploadData.path) {
      throw new Error('Failed to upload video: No path returned');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('expert-session-videos-public')
      .getPublicUrl(uploadData.path);

    if (!urlData || !urlData.publicUrl) {
      throw new Error('Failed to get public URL for uploaded video');
    }

    console.log('Expert session video uploaded successfully');
    
    return {
      path: uploadData.path,
      publicUrl: urlData.publicUrl
    };
  } catch (error) {
    console.error('Error in uploadExpertSessionVideo:', error);
    throw error;
  }
}

/**
 * Gets video duration from a video file (client-side implementation)
 * Note: This is a placeholder - in a real implementation, you might need to use
 * a video processing library or extract metadata
 * @param file The video file
 * @returns Promise<number> Duration in seconds
 */
export async function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(Math.floor(video.duration));
    };
    
    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = URL.createObjectURL(file);
  });
} 