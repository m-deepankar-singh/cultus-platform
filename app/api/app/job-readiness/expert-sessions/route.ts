import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/app/job-readiness/expert-sessions
 * Get expert sessions for the Job Readiness product
 * These are placeholder implementations for future functionality
 * Expert sessions unlock Star 3 and the Projects module
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const url = new URL(req.url);
    const productId = url.searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get student profile for the current user
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        job_readiness_star_level,
        job_readiness_tier
      `)
      .eq('id', user.id)
      .single();

    if (studentError || !student) {
      console.error('Error fetching student:', studentError);
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Check if the student has unlocked expert sessions
    // Expert sessions are unlocked after star level TWO (completed courses)
    const starLevel = student.job_readiness_star_level || 'ONE';
    const hasUnlockedExpertSessions = ['THREE', 'FOUR', 'FIVE'].includes(starLevel);

    if (!hasUnlockedExpertSessions) {
      return NextResponse.json({ 
        error: 'Expert sessions are locked until you complete courses (Star 2)',
        current_star_level: starLevel,
        required_star_level: 'TWO',
        is_unlocked: false
      }, { status: 403 });
    }

    // Placeholder response with dummy expert sessions
    return NextResponse.json({
      message: "This is a placeholder for expert sessions. Future implementation will include real session data.",
      expert_sessions: [
        {
          id: "session1",
          name: "Introduction to Job Interviews",
          description: "Learn the basics of job interviewing from industry experts",
          status: "AVAILABLE",
          is_unlocked: true
        },
        {
          id: "session2",
          name: "Resume Building Workshop",
          description: "Craft a compelling resume with guidance from HR professionals",
          status: "AVAILABLE",
          is_unlocked: true
        },
        {
          id: "session3",
          name: "Industry-Specific Career Paths",
          description: "Discover career opportunities in your chosen field",
          status: "AVAILABLE",
          is_unlocked: true
        }
      ],
      current_star_level: starLevel,
      current_tier: student.job_readiness_tier,
      would_earn_star_3: true
    });
  } catch (error) {
    console.error('Unexpected error in job-readiness expert-sessions GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/app/job-readiness/expert-sessions
 * Track completion of an expert session
 * Completing all required expert sessions unlocks Star 3
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    
    // Extract parameters
    const { session_id, product_id } = body;
    
    if (!session_id || !product_id) {
      return NextResponse.json({ 
        error: 'Session ID and Product ID are required' 
      }, { status: 400 });
    }
    
    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Placeholder response for marking session as completed
    // In a future implementation, this would actually store the completion status
    
    // Placeholder for updating the student's star level to THREE if all sessions completed
    // This would check if all required sessions are completed
    
    return NextResponse.json({
      message: "Expert session completion tracking - Placeholder for future implementation",
      session_id,
      status: "COMPLETED",
      all_sessions_completed: true,
      star_level_updated: true,
      new_star_level: "THREE"
    });
  } catch (error) {
    console.error('Unexpected error in job-readiness expert-sessions POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 