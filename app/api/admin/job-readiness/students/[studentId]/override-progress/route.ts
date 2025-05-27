import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * PATCH /api/admin/job-readiness/students/[studentId]/override-progress
 * Admin endpoint to manually update a student's job readiness progress
 * Allows updating star level and tier, bypassing normal progression rules
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Verify admin authentication
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

    // Modified to be case insensitive - check for "admin" or "Admin"
    if (profileError || !profile?.role || !(profile.role.toLowerCase() === 'admin')) {
      console.log('User role check failed:', { user_id: user.id, role: profile?.role });
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    // Get the student ID from the route parameters (await params for Next.js 15)
    const { studentId } = await params;
    
    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }
    
    // Get request body
    const body = await req.json();
    const { job_readiness_star_level, job_readiness_tier, override_reason } = body;
    
    if (job_readiness_star_level === undefined && !job_readiness_tier) {
      return NextResponse.json({ 
        error: 'At least one of job_readiness_star_level or job_readiness_tier must be provided' 
      }, { status: 400 });
    }
    
    if (!override_reason) {
      return NextResponse.json({ 
        error: 'override_reason is required to document the purpose of this manual change' 
      }, { status: 400 });
    }
    
    // Validate star level if provided
    if (job_readiness_star_level !== undefined && job_readiness_star_level !== null) {
      const validStarLevels = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'];
      if (!validStarLevels.includes(job_readiness_star_level)) {
        return NextResponse.json({ 
          error: `Invalid star level. Must be one of: ${validStarLevels.join(', ')} or null` 
        }, { status: 400 });
      }
    }
    
    // Validate tier if provided
    if (job_readiness_tier) {
      const validTiers = ['BRONZE', 'SILVER', 'GOLD'];
      if (!validTiers.includes(job_readiness_tier)) {
        return NextResponse.json({ 
          error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` 
        }, { status: 400 });
      }
    }
    
    // Update student progress
    // Note: We're directly updating the student record without special flags
    // since the database schema doesn't have admin override tracking columns
    const updateData: any = {
      job_readiness_last_updated: new Date().toISOString()
    };
    
    if (job_readiness_star_level !== undefined) {
      updateData.job_readiness_star_level = job_readiness_star_level;
    }
    
    if (job_readiness_tier) {
      updateData.job_readiness_tier = job_readiness_tier;
    }
    
    const { data: updatedStudent, error: updateError } = await supabase
      .from('students')
      .update(updateData)
      .eq('id', studentId)
      .select(`
        id, 
        full_name, 
        email,
        job_readiness_star_level,
        job_readiness_tier,
        job_readiness_last_updated
      `)
      .single();
      
    if (updateError) {
      console.error('Error updating student progress:', updateError);
      return NextResponse.json({ error: 'Failed to update student progress' }, { status: 500 });
    }
    
    if (!updatedStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Log the override action for audit purposes
    console.log('Admin progress override completed:', {
      admin_user_id: user.id,
      student_id: studentId,
      previous_values: {
        star_level: updatedStudent.job_readiness_star_level,
        tier: updatedStudent.job_readiness_tier
      },
      new_values: {
        job_readiness_star_level: job_readiness_star_level || updatedStudent.job_readiness_star_level,
        job_readiness_tier: job_readiness_tier || updatedStudent.job_readiness_tier
      },
      override_reason: override_reason,
      timestamp: new Date().toISOString()
    });

    // Return clear information about the action taken
    return NextResponse.json({
      message: 'Student progress updated successfully',
      student: updatedStudent,
      note: 'The student\'s progress has been updated. Any client app should refresh their current state after this operation. Changes will be reflected in subsequent API calls.',
      updated_values: {
        job_readiness_star_level: job_readiness_star_level || updatedStudent.job_readiness_star_level,
        job_readiness_tier: job_readiness_tier || updatedStudent.job_readiness_tier,
        override_reason: override_reason
      }
    });
  } catch (error) {
    console.error('Unexpected error in student progress override:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 