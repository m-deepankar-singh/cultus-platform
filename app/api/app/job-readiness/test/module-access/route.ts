import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkModuleAccess, JOB_READINESS_MODULE_ORDER, JobReadinessModuleType } from '@/lib/api/job-readiness/check-module-access';

/**
 * GET /api/app/job-readiness/test/module-access
 * Test endpoint for Postman to check a user's module access status
 * This is helpful for verifying that the module access logic works correctly
 * 
 * Query parameters:
 * - moduleType: The type of module to check access for
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const url = new URL(req.url);
    const moduleType = url.searchParams.get('moduleType') as JobReadinessModuleType;

    // Validate module type
    if (!moduleType || !JOB_READINESS_MODULE_ORDER.includes(moduleType)) {
      return NextResponse.json({ 
        error: `Invalid module type. Must be one of: ${JOB_READINESS_MODULE_ORDER.join(', ')}` 
      }, { status: 400 });
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
        full_name,
        email,
        job_readiness_star_level,
        job_readiness_tier,
        job_readiness_background_type,
        job_readiness_last_updated
      `)
      .eq('id', user.id)
      .single();

    if (studentError || !student) {
      console.error('Error fetching student:', studentError);
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Check module access
    const accessStatus = await checkModuleAccess(user.id, moduleType);

    // Return comprehensive information for testing
    return NextResponse.json({
      student: {
        id: student.id,
        name: student.full_name,
        email: student.email,
        job_readiness_star_level: student.job_readiness_star_level,
        job_readiness_tier: student.job_readiness_tier,
        job_readiness_background_type: student.job_readiness_background_type,
        job_readiness_last_updated: student.job_readiness_last_updated
      },
      moduleAccess: {
        module_type: moduleType,
        ...accessStatus
      },
      moduleOrder: JOB_READINESS_MODULE_ORDER,
      testNote: "This endpoint is for Postman testing only. It should not be used in production."
    });
  } catch (error) {
    console.error('Unexpected error in job-readiness test module-access GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 