import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/job-readiness/expert-sessions
 * List all expert sessions with upload/management interface
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const url = new URL(req.url);
    const productId = url.searchParams.get('productId');

    // Verify admin role
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role - use case insensitive comparison
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.role || !(profile.role.toLowerCase() === 'admin')) {
      console.log('User role check failed:', { user_id: user.id, role: profile?.role });
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Build query to get expert sessions with product details
    let query = supabase
      .from('job_readiness_expert_sessions')
      .select(`
        id,
        product_id,
        title,
        description,
        video_url,
        video_duration,
        is_active,
        created_at,
        updated_at,
        products!inner (
          id,
          name,
          type
        )
      `)
      .eq('products.type', 'JOB_READINESS')
      .order('created_at', { ascending: false });

    // Filter by product if specified
    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data: expertSessions, error } = await query;

    if (error) {
      console.error('Error fetching expert sessions:', error);
      return NextResponse.json({ error: 'Failed to fetch expert sessions' }, { status: 500 });
    }

    // Get completion statistics for each session
    const sessionsWithStats = await Promise.all(
      (expertSessions || []).map(async (session) => {
        const { data: progressStats, error: statsError } = await supabase
          .from('job_readiness_expert_session_progress')
          .select('student_id, is_completed, watch_time_seconds')
          .eq('expert_session_id', session.id);

        let completionStats = {
          total_viewers: 0,
          completion_rate: 0,
          average_watch_time: 0
        };

        if (!statsError && progressStats) {
          const totalViewers = progressStats.length;
          const completedViewers = progressStats.filter(p => p.is_completed).length;
          const totalWatchTime = progressStats.reduce((sum, p) => sum + p.watch_time_seconds, 0);

          completionStats = {
            total_viewers: totalViewers,
            completion_rate: totalViewers > 0 ? Math.round((completedViewers / totalViewers) * 100) : 0,
            average_watch_time: totalViewers > 0 ? Math.round(totalWatchTime / totalViewers) : 0
          };
        }

        return {
          ...session,
          completion_stats: completionStats
        };
      })
    );

    return NextResponse.json({ sessions: sessionsWithStats });
  } catch (error) {
    console.error('Unexpected error in expert-sessions GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/job-readiness/expert-sessions
 * Upload new expert session video with title and description
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify admin role
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.role || !(profile.role.toLowerCase() === 'admin')) {
      console.log('User role check failed:', { user_id: user.id, role: profile?.role });
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const productId = formData.get('product_id') as string;
    const videoFile = formData.get('video_file') as File;

    // Validate required fields
    if (!title || !productId || !videoFile) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, product_id, and video_file are required' 
      }, { status: 400 });
    }

    // Validate video file
    if (!videoFile.type.startsWith('video/')) {
      return NextResponse.json({ error: 'File must be a video' }, { status: 400 });
    }

    // Check file size (limit to 500MB)
    const maxSizeInMB = 500;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (videoFile.size > maxSizeInBytes) {
      return NextResponse.json({ 
        error: `File size must be less than ${maxSizeInMB}MB` 
      }, { status: 400 });
    }

    // Verify product exists and is of type JOB_READINESS
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, type')
      .eq('id', productId)
      .eq('type', 'JOB_READINESS')
      .single();

    if (productError || !product) {
      return NextResponse.json({ 
        error: 'Invalid product ID or product is not a Job Readiness product' 
      }, { status: 400 });
    }

    // Extract video duration client-side before upload (client must provide this)
    const videoDurationParam = formData.get('video_duration') as string;
    let videoDuration = 3600; // Default 1 hour
    
    if (videoDurationParam) {
      const parsedDuration = parseInt(videoDurationParam);
      if (!isNaN(parsedDuration) && parsedDuration > 0) {
        videoDuration = parsedDuration;
      }
    } else {
      // Rough estimate based on file size if not provided
      videoDuration = Math.max(Math.floor(videoFile.size / 1000000) * 60, 300); // ~60 seconds per MB, minimum 5 minutes
    }

    // Use the upload helper function
    const { uploadExpertSessionVideo } = await import('@/lib/supabase/upload-helpers');
    
    let uploadResult;
    try {
      uploadResult = await uploadExpertSessionVideo(videoFile, productId);
    } catch (uploadError: any) {
      console.error('Video upload failed:', uploadError);
      return NextResponse.json({ 
        error: `Failed to upload video: ${uploadError.message}` 
      }, { status: 500 });
    }

    // Create expert session record in database
    const { data: expertSession, error: dbError } = await supabase
      .from('job_readiness_expert_sessions')
      .insert({
        product_id: productId,
        title,
        description: description || null,
        video_url: uploadResult.publicUrl,
        video_duration: videoDuration,
        is_active: true
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error creating expert session:', dbError);
      
      // Clean up uploaded file if database insertion fails
      await supabase.storage
        .from('expert-session-videos-public')
        .remove([uploadResult.path]);

      return NextResponse.json({ 
        error: 'Failed to create expert session record' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Expert session created successfully',
      session: expertSession 
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in expert-sessions POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT/PATCH /api/admin/job-readiness/expert-sessions
 * Update expert session details (title, description, activate/deactivate)
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    // Verify admin role
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.role || !(profile.role.toLowerCase() === 'admin')) {
      console.log('User role check failed:', { user_id: user.id, role: profile?.role });
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Validate request body
    const { id, title, description, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Expert session ID is required' }, { status: 400 });
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        error: 'At least one field (title, description, is_active) must be provided' 
      }, { status: 400 });
    }

    // Update expert session
    const { data: updatedSession, error } = await supabase
      .from('job_readiness_expert_sessions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating expert session:', error);
      return NextResponse.json({ 
        error: 'Failed to update expert session' 
      }, { status: 500 });
    }

    if (!updatedSession) {
      return NextResponse.json({ 
        error: 'Expert session not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Expert session updated successfully',
      session: updatedSession 
    });

  } catch (error) {
    console.error('Unexpected error in expert-sessions PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/job-readiness/expert-sessions
 * Remove expert session (soft delete by setting is_active = false)
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Expert session ID is required' }, { status: 400 });
    }

    // Verify admin role
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.role || !(profile.role.toLowerCase() === 'admin')) {
      console.log('User role check failed:', { user_id: user.id, role: profile?.role });
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Perform soft delete by setting is_active = false
    const { data: deletedSession, error } = await supabase
      .from('job_readiness_expert_sessions')
      .update({ is_active: false })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error deleting expert session:', error);
      return NextResponse.json({ 
        error: 'Failed to delete expert session' 
      }, { status: 500 });
    }

    if (!deletedSession) {
      return NextResponse.json({ 
        error: 'Expert session not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Expert session deleted successfully',
      session: deletedSession 
    });

  } catch (error) {
    console.error('Unexpected error in expert-sessions DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 