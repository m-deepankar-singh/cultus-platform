import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/job-readiness/backgrounds
 * Get all background types and their project mappings
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

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

    // Modified to be case insensitive - check for "admin" or "Admin"
    if (profileError || !profile?.role || !(profile.role.toLowerCase() === 'admin')) {
      console.log('User role check failed:', { user_id: user.id, role: profile?.role });
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get all background types and their project mappings
    const { data: backgrounds, error } = await supabase
      .from('job_readiness_background_project_types')
      .select('*');

    if (error) {
      console.error('Error fetching background project types:', error);
      return NextResponse.json({ error: 'Failed to fetch background project types' }, { status: 500 });
    }

    return NextResponse.json({ backgrounds });
  } catch (error) {
    console.error('Unexpected error in backgrounds GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/job-readiness/backgrounds
 * Create a new background type with project mapping
 */
export async function POST(req: NextRequest) {
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

    // Check if user has admin role
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
    const { 
      background_type, 
      project_type, 
      project_description_template, 
      grading_criteria,
      bronze_system_prompt,
      bronze_input_prompt,
      silver_system_prompt,
      silver_input_prompt,
      gold_system_prompt,
      gold_input_prompt
    } = body;

    if (!background_type || !project_type) {
      return NextResponse.json({ error: 'Background type and project type are required' }, { status: 400 });
    }

    // Create the background project type mapping
    const { data: background, error } = await supabase
      .from('job_readiness_background_project_types')
      .insert({
        background_type,
        project_type,
        project_description_template,
        grading_criteria,
        bronze_system_prompt,
        bronze_input_prompt,
        silver_system_prompt,
        silver_input_prompt,
        gold_system_prompt,
        gold_input_prompt
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating background project type:', error);
      return NextResponse.json({ error: 'Failed to create background project type' }, { status: 500 });
    }

    return NextResponse.json({ background }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in backgrounds POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/job-readiness/backgrounds
 * Update an existing background type with project mapping
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

    // Check if user has admin role
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
    const { 
      id,
      background_type, 
      project_type, 
      project_description_template, 
      grading_criteria,
      bronze_system_prompt,
      bronze_input_prompt,
      silver_system_prompt,
      silver_input_prompt,
      gold_system_prompt,
      gold_input_prompt
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Background project type ID is required' }, { status: 400 });
    }

    // Update the background project type mapping
    const { error } = await supabase
      .from('job_readiness_background_project_types')
      .update({
        background_type,
        project_type,
        project_description_template,
        grading_criteria,
        bronze_system_prompt,
        bronze_input_prompt,
        silver_system_prompt,
        silver_input_prompt,
        gold_system_prompt,
        gold_input_prompt
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating background project type:', error);
      return NextResponse.json({ error: 'Failed to update background project type' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in backgrounds PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/job-readiness/backgrounds
 * Delete a background type with project mapping
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Background project type ID is required' }, { status: 400 });
    }

    // Verify admin role
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.role || !(profile.role.toLowerCase() === 'admin')) {
      console.log('User role check failed:', { user_id: user.id, role: profile?.role });
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Delete the background project type mapping
    const { error } = await supabase
      .from('job_readiness_background_project_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting background project type:', error);
      return NextResponse.json({ error: 'Failed to delete background project type' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in backgrounds DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 