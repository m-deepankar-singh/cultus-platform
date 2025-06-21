import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

/**
 * GET /api/admin/job-readiness/backgrounds/[id]
 * Get a specific background by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequest(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;

    // Await params before using
    const { id } = await params;

    // Use the authenticated client - RLS policies will handle proper access control
    const { data: background, error } = await supabase
      .from('job_readiness_background_project_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching background:', error);
      return NextResponse.json({ error: 'Background not found' }, { status: 404 });
    }

    // Transform the data to match the expected Background interface
    const transformedBackground = {
      id: background.id,
      name: background.background_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      description: background.project_description_template,
      skills: ['Programming', 'Problem Solving', 'Technical Skills'], // Default skills
      focus_areas: background.grading_criteria?.map((criteria: any) => criteria.criterion) || []
    };

    return NextResponse.json(transformedBackground);
  } catch (error) {
    console.error('Unexpected error in background GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 