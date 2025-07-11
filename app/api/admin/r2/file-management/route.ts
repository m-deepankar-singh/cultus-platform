import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authenticateApiRequestSecure } from '@/lib/auth/api-auth'

export async function GET(request: NextRequest) {
  try {
    // Use standardized authentication check
    const authResult = await authenticateApiRequestSecure(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const userId = searchParams.get('userId')

    switch (action) {
      case 'stats':
        // Get file upload statistics
        const { data: stats, error: statsError } = await supabase
          .rpc('get_file_upload_stats', { user_uuid: userId || null })

        if (statsError) {
          throw statsError
        }

        return NextResponse.json({ 
          success: true, 
          data: stats 
        })

      case 'cleanup-orphaned':
        // Cleanup orphaned file records
        const { data: cleanupResult, error: cleanupError } = await supabase
          .rpc('cleanup_orphaned_file_records')

        if (cleanupError) {
          throw cleanupError
        }

        return NextResponse.json({ 
          success: true, 
          data: cleanupResult 
        })

      case 'list-uploads':
        // List recent file uploads
        const limit = parseInt(searchParams.get('limit') || '50')
        const uploadType = searchParams.get('uploadType')

        let query = supabase
          .from('file_uploads')
          .select(`
            *,
            profiles!file_uploads_uploaded_by_fkey(email, full_name)
          `)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (uploadType) {
          query = query.eq('upload_type', uploadType)
        }

        if (userId) {
          query = query.eq('uploaded_by', userId)
        }

        const { data: uploads, error: uploadsError } = await query

        if (uploadsError) {
          throw uploadsError
        }

        return NextResponse.json({ 
          success: true, 
          data: uploads 
        })

      default:
        return NextResponse.json(
          { error: "Invalid action parameter" },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('File management API error:', error)
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Use standardized authentication check
    const authResult = await authenticateApiRequestSecure(['admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;

    const { action } = await request.json()

    switch (action) {
      case 'migrate-existing-urls':
        // Migrate existing URLs to file_uploads table
        const { data: migrationResult, error: migrationError } = await supabase
          .rpc('migrate_existing_urls_to_file_uploads')

        if (migrationError) {
          throw migrationError
        }

        return NextResponse.json({ 
          success: true, 
          data: migrationResult 
        })

      case 'cleanup-old-records':
        // Cleanup old file records (default 30 days)
        const daysOld = 30
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - daysOld)

        const { data: oldRecords, error: oldRecordsError } = await supabase
          .from('file_uploads')
          .delete()
          .lt('created_at', cutoffDate.toISOString())
          .select('id')

        if (oldRecordsError) {
          throw oldRecordsError
        }

        return NextResponse.json({ 
          success: true, 
          deletedCount: oldRecords?.length || 0 
        })

      default:
        return NextResponse.json(
          { error: "Invalid action parameter" },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('File management API error:', error)
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    )
  }
} 