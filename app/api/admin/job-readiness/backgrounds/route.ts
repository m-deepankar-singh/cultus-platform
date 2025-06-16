import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

/**
 * GET /api/admin/job-readiness/backgrounds
 * Get all background types and their project mappings
 */
export async function GET(req: NextRequest) {
  try {
    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequest(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;

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
    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequest(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;
    
    // Parse JSON with better error handling
    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      console.error('Invalid JSON in request body:', jsonError);
      return NextResponse.json({ error: 'Invalid JSON format in request body' }, { status: 400 });
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

    // Check if this combination already exists
    const { data: existingBackground, error: checkError } = await supabase
      .from('job_readiness_background_project_types')
      .select('id')
      .eq('background_type', background_type)
      .eq('project_type', project_type)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking for existing background project type:', checkError);
      return NextResponse.json({ error: 'Failed to validate background project type' }, { status: 500 });
    }

    if (existingBackground) {
      return NextResponse.json({ 
        error: `A configuration for ${background_type} background with ${project_type} project type already exists. Please choose a different combination or edit the existing configuration.` 
      }, { status: 409 });
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
      
      // Handle specific constraint violation errors
      if (error.code === '23505') {
        return NextResponse.json({ 
          error: `A configuration for ${background_type} background with ${project_type} project type already exists. Please choose a different combination or edit the existing configuration.` 
        }, { status: 409 });
      }
      
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
    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequest(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;
    
    // Parse JSON with better error handling
    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      console.error('Invalid JSON in request body:', jsonError);
      return NextResponse.json({ error: 'Invalid JSON format in request body' }, { status: 400 });
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
    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequest(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;
    
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Background project type ID is required' }, { status: 400 });
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