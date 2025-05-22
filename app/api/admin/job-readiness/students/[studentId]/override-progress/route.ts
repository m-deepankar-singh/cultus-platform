import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * PATCH /api/admin/job-readiness/students/[studentId]/override-progress
 * Admin endpoint to manually update a student's job readiness progress
 * Allows updating star level and tier, bypassing normal progression rules
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { studentId: string } }
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
    
    // Verify admin role
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
      
    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      return NextResponse.json({ error: 'Failed to verify authorization' }, { status: 500 });
    }
    
    const isAdmin = userRoles && userRoles.some(ur => ur.role.toLowerCase() === 'admin');
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    
    // Get the student ID from the route parameters
    const { studentId } = params;
    
    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }
    
    // Get request body
    const body = await req.json();
    const { job_readiness_star_level, job_readiness_tier, override_reason } = body;
    
    if (!job_readiness_star_level && !job_readiness_tier) {
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
    if (job_readiness_star_level) {
      const validStarLevels = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'];
      if (!validStarLevels.includes(job_readiness_star_level)) {
        return NextResponse.json({ 
          error: `Invalid star level. Must be one of: ${validStarLevels.join(', ')}` 
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
    
    // Set the override reason as a database session variable so the trigger can access it
    try {
      const { data: configResult, error: configError } = await supabase.rpc('set_config', { 
        parameter: 'app.override_reason', 
        value: override_reason,
        is_local: true
      });
      
      if (configError) {
        console.error('Error setting configuration parameter:', configError);
        // Continue execution, as this is not blocking - the trigger will handle missing reason gracefully
      }
    } catch (configErr) {
      console.error('Unexpected error setting config:', configErr);
      // Continue execution, as this is not blocking
    }
    
    // Update student progress with the admin override flag
    // This flag tells the database trigger that this update is from an admin
    // and should bypass normal sequential progression checks
    const updateData: any = {
      job_readiness_admin_override: true,
      job_readiness_last_updated: new Date().toISOString()
    };
    
    if (job_readiness_star_level) {
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
        first_name, 
        last_name, 
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
    
    // Get the latest override record for additional context
    const { data: latestOverride, error: overrideError } = await supabase
      .from('job_readiness_admin_overrides')
      .select('*')
      .eq('student_id', studentId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    // For Postman testing - return clear information about the action taken
    return NextResponse.json({
      message: 'Student progress updated successfully',
      student: updatedStudent,
      override_details: latestOverride || null,
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