import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/job-readiness/promotion-exams
 * Get all promotion exam configurations
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

    // Get promotion exam configurations with product details
    const { data: examConfigs, error } = await supabase
      .from('job_readiness_promotion_exam_config')
      .select(`
        *,
        products:product_id (
          id,
          name
        )
      `);

    if (error) {
      console.error('Error fetching promotion exam configs:', error);
      return NextResponse.json({ error: 'Failed to fetch promotion exam configurations' }, { status: 500 });
    }

    return NextResponse.json({ examConfigs });
  } catch (error) {
    console.error('Unexpected error in promotion-exams GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/job-readiness/promotion-exams
 * Create a new promotion exam configuration
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
      product_id, 
      is_enabled, 
      question_count, 
      pass_threshold, 
      time_limit_minutes,
      system_prompt
    } = body;

    if (!product_id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Check if configuration already exists for this product
    const { data: existingConfig, error: checkError } = await supabase
      .from('job_readiness_promotion_exam_config')
      .select('id')
      .eq('product_id', product_id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing config:', checkError);
      return NextResponse.json({ error: 'Failed to check existing configurations' }, { status: 500 });
    }

    if (existingConfig) {
      return NextResponse.json({ 
        error: 'A promotion exam configuration already exists for this product. Use PATCH to update it.' 
      }, { status: 400 });
    }

    // Create the promotion exam configuration
    const { data: examConfig, error } = await supabase
      .from('job_readiness_promotion_exam_config')
      .insert({
        product_id,
        is_enabled: is_enabled ?? true,
        question_count: question_count ?? 25,
        pass_threshold: pass_threshold ?? 70,
        time_limit_minutes: time_limit_minutes ?? 60,
        system_prompt
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating promotion exam config:', error);
      return NextResponse.json({ error: 'Failed to create promotion exam configuration' }, { status: 500 });
    }

    return NextResponse.json({ examConfig }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in promotion-exams POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/job-readiness/promotion-exams
 * Update an existing promotion exam configuration
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
      product_id, 
      is_enabled, 
      question_count, 
      pass_threshold, 
      time_limit_minutes,
      system_prompt
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Configuration ID is required' }, { status: 400 });
    }

    // Create update object with only the fields that are provided
    const updateData: any = {};
    if (product_id !== undefined) updateData.product_id = product_id;
    if (is_enabled !== undefined) updateData.is_enabled = is_enabled;
    if (question_count !== undefined) updateData.question_count = question_count;
    if (pass_threshold !== undefined) updateData.pass_threshold = pass_threshold;
    if (time_limit_minutes !== undefined) updateData.time_limit_minutes = time_limit_minutes;
    if (system_prompt !== undefined) updateData.system_prompt = system_prompt;

    // Update the promotion exam configuration
    const { error } = await supabase
      .from('job_readiness_promotion_exam_config')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating promotion exam config:', error);
      return NextResponse.json({ error: 'Failed to update promotion exam configuration' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in promotion-exams PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/job-readiness/promotion-exams
 * Delete a promotion exam configuration
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Configuration ID is required' }, { status: 400 });
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

    // Delete the promotion exam configuration
    const { error } = await supabase
      .from('job_readiness_promotion_exam_config')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting promotion exam config:', error);
      return NextResponse.json({ error: 'Failed to delete promotion exam configuration' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in promotion-exams DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 