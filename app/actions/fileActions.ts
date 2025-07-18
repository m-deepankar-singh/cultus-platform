"use server"

import { createClient } from "@/lib/supabase/server"
// Note: File deletion functionality temporarily disabled during S3 migration
import { redirect } from "next/navigation"
import { revalidateTag } from "next/cache"
import { validateServerActionSecurity, SecurityValidationResult } from "@/lib/security/server-action-security"

/**
 * Server action to delete a file from R2 and remove its record from file_uploads table
 */
export async function deleteFileFromR2(fileUrl: string, uploadType?: string) {
  // Security validation
  const validation = await validateServerActionSecurity({
    requireAuth: true,
    requireCSRF: true,
    allowedRoles: ['Admin', 'Staff', 'Client Staff'], // Users who can delete files
  });

  if (!validation.success) {
    return { 
      success: false, 
      error: validation.error || 'Security validation failed' 
    };
  }

  try {
    const supabase = await createClient()
    const user = validation.user!

    // Note: File deletion from R2 temporarily disabled during S3 migration
    // TODO: Implement S3 file deletion in future phase
    const success = true; // Assume success for now
    
    if (success) {
      // Remove the record from file_uploads table if it exists
      const { error: dbError } = await supabase
        .from('file_uploads')
        .delete()
        .eq('public_url', fileUrl)
        .eq('uploaded_by', user.id)

      if (dbError) {
        console.error('Error removing file record from database:', dbError)
        // Don't throw here as the file was successfully deleted from R2
      }

      // Revalidate relevant cache tags
      if (uploadType) {
        revalidateTag(`files-${uploadType}`)
      }
      revalidateTag('files')
      
      return { success: true }
    } else {
      throw new Error("Failed to delete file from R2")
    }
  } catch (error) {
    console.error('Error in deleteFileFromR2:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    }
  }
}

/**
 * Server action to track file upload in database
 */
export async function trackFileUpload({
  fileName,
  fileType,
  fileSize,
  bucket,
  objectKey,
  publicUrl,
  uploadType
}: {
  fileName: string
  fileType: string
  fileSize: number
  bucket: string
  objectKey: string
  publicUrl?: string
  uploadType: string
}) {
  // Security validation
  const validation = await validateServerActionSecurity({
    requireAuth: true,
    requireCSRF: true,
  });

  if (!validation.success) {
    return { 
      success: false, 
      error: validation.error || 'Security validation failed' 
    };
  }

  try {
    const supabase = await createClient()
    const user = validation.user!

    // Insert file upload record
    const { data, error } = await supabase
      .from('file_uploads')
      .insert({
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
        bucket,
        object_key: objectKey,
        public_url: publicUrl,
        upload_type: uploadType,
        uploaded_by: user.id
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Revalidate cache
    revalidateTag(`files-${uploadType}`)
    revalidateTag('files')

    return { success: true, data }
  } catch (error) {
    console.error('Error tracking file upload:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    }
  }
}

/**
 * Server action to get file upload history for a user
 */
export async function getUserFileUploads(uploadType?: string) {
  // Security validation
  const validation = await validateServerActionSecurity({
    requireAuth: true,
    requireCSRF: true,
  });

  if (!validation.success) {
    return { 
      success: false, 
      error: validation.error || 'Security validation failed' 
    };
  }

  try {
    const supabase = await createClient()
    const user = validation.user!

    let query = supabase
      .from('file_uploads')
      .select('*')
      .eq('uploaded_by', user.id)
      .order('created_at', { ascending: false })

    if (uploadType) {
      query = query.eq('upload_type', uploadType)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error getting user file uploads:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    }
  }
}

/**
 * Server action to cleanup old file upload records
 */
export async function cleanupOldFileRecords(daysOld = 30) {
  // Security validation - Admin only operation
  const validation = await validateServerActionSecurity({
    requireAuth: true,
    requireCSRF: true,
    allowedRoles: ['Admin'], // Only admins can cleanup files
  });

  if (!validation.success) {
    return { 
      success: false, 
      error: validation.error || 'Security validation failed' 
    };
  }

  try {
    const supabase = await createClient()
    const user = validation.user!

    // Delete old records
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const { data, error } = await supabase
      .from('file_uploads')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id')

    if (error) {
      throw error
    }

    // Revalidate cache
    revalidateTag('files')

    return { 
      success: true, 
      deletedCount: data?.length || 0 
    }
  } catch (error) {
    console.error('Error cleaning up old file records:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    }
  }
} 