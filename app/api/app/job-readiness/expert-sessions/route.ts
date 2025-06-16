import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

/**
 * GET /api/app/job-readiness/expert-sessions
 * List all available Expert Session videos with student's progress for each
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    // JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['student']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    // Get student data from JWT claims (no database query needed)
    const clientId = claims.client_id;
    if (!clientId) {
      return NextResponse.json({ error: 'Student not properly enrolled' }, { status: 403 });
    }

    // Verify product enrollment via client_product_assignments
    const { count } = await supabase
      .from('client_product_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('product_id', productId);

    if (count === 0) {
      return NextResponse.json({ 
        error: 'Invalid product ID or product is not assigned to your organization' 
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

    // Get all active expert sessions for the product using junction table
    const { data: sessionData, error: sessionsError } = await supabase
      .from('job_readiness_expert_sessions')
      .select(`
        id,
        title,
        description,
        video_url,
        video_duration,
        created_at,
        job_readiness_expert_session_products!inner (
          product_id
        )
      `)
      .eq('job_readiness_expert_session_products.product_id', productId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (sessionsError) {
      console.error('Error fetching expert sessions:', sessionsError);
      return NextResponse.json({ error: 'Failed to fetch expert sessions' }, { status: 500 });
    }

    // Transform the data to remove the junction table structure
    const expertSessions = sessionData?.map((session: any) => ({
      id: session.id,
      title: session.title,
      description: session.description,
      video_url: session.video_url,
      video_duration: session.video_duration,
      created_at: session.created_at
    })) || [];

    // For each session, create fresh signed URLs since the stored URLs may be expired
    const sessionsWithSignedUrls = await Promise.all(
      (expertSessions || []).map(async (session: any) => {
        // Extract path from stored URL to create new signed URL
        const urlParts = session.video_url.split('/expert_session_videos/');
        if (urlParts.length === 2) {
          const filePath = urlParts[1].split('?')[0]; // Remove any query params
          
          const { data: signedData, error: signError } = await supabase.storage
            .from('expert_session_videos')
            .createSignedUrl(filePath, 60 * 60 * 24); // 24 hours

          if (!signError && signedData) {
            return {
              ...session,
              video_url: signedData.signedUrl
            };
          }
        }
        
        // If we can't create a signed URL, return the original (may be expired)
        return session;
      })
    );

    // Get student's progress for all expert sessions
    const sessionIds = sessionsWithSignedUrls?.map(session => session.id) || [];
    const { data: progressData, error: progressError } = await supabase
      .from('job_readiness_expert_session_progress')
      .select(`
        expert_session_id,
        watch_time_seconds,
        completion_percentage,
        is_completed,
        completed_at
      `)
      .eq('student_id', user.id)
      .in('expert_session_id', sessionIds);

    if (progressError) {
      console.error('Error fetching progress data:', progressError);
      return NextResponse.json({ error: 'Failed to fetch progress data' }, { status: 500 });
    }

    // Create a map of progress by session ID
    const progressMap = new Map();
    progressData?.forEach((progress: any) => {
      progressMap.set(progress.expert_session_id, progress);
    });

    // Combine sessions with student progress
    const sessionsWithProgress = sessionsWithSignedUrls?.map((session: any) => {
      const progress = progressMap.get(session.id) || {
        watch_time_seconds: 0,
        completion_percentage: 0,
        is_completed: false,
        completed_at: null
      };

      return {
        id: session.id,
        title: session.title,
        description: session.description,
        video_url: session.video_url,
        video_duration: session.video_duration,
        created_at: session.created_at,
        student_progress: {
          watch_time_seconds: progress.watch_time_seconds,
          completion_percentage: progress.completion_percentage,
          is_completed: progress.is_completed,
          completed_at: progress.completed_at
        }
      };
    }) || [];

    // Count completed sessions
    const completedSessionsCount = sessionsWithProgress.filter(
      session => session.student_progress.is_completed
    ).length;

    // Required sessions for 3rd star (as per requirements)
    const requiredSessions = 5;
    
    return NextResponse.json({
      sessions: sessionsWithProgress,
      overall_progress: {
        completed_sessions_count: completedSessionsCount,
        required_sessions: requiredSessions,
        progress_percentage: Math.round((completedSessionsCount / requiredSessions) * 100),
        third_star_unlocked: completedSessionsCount >= requiredSessions
      }
    });

  } catch (error) {
    console.error('Unexpected error in expert-sessions GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 

// POST endpoint removed - students track progress via the watch-progress endpoint
// Completion is automatically tracked when 95% of video is watched 