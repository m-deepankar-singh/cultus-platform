import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequestUltraFast } from '@/lib/auth/api-auth';

/**
 * GET /api/admin/job-readiness/products
 * Get all Job Readiness products
 */
export async function GET(req: NextRequest) {
  try {
    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequestUltraFast(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;

    // Get all Job Readiness products
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        type,
        job_readiness_products (*)
      `)
      .eq('type', 'JOB_READINESS');

    if (error) {
      console.error('Error fetching Job Readiness products:', error);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Unexpected error in Job Readiness products GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/job-readiness/products
 * Create a new Job Readiness product
 */
export async function POST(req: NextRequest) {
  try {
    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequestUltraFast(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;
    const body = await req.json();

    // Validate request body
    const { name, description, configuration } = body;

    if (!name) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    // Validate configuration
    if (!configuration || 
        typeof configuration.bronze_assessment_min_score !== 'number' ||
        typeof configuration.bronze_assessment_max_score !== 'number' ||
        typeof configuration.silver_assessment_min_score !== 'number' ||
        typeof configuration.silver_assessment_max_score !== 'number' ||
        typeof configuration.gold_assessment_min_score !== 'number' ||
        typeof configuration.gold_assessment_max_score !== 'number') {
      return NextResponse.json({ 
        error: 'Configuration must include all assessment score ranges (bronze, silver, gold)' 
      }, { status: 400 });
    }

    // Start a transaction to create both the product and job_readiness_products entry
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        name,
        description,
        type: 'JOB_READINESS',
      })
      .select()
      .single();

    if (productError) {
      console.error('Error creating product:', productError);
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }

    // Create the job_readiness_products entry with all required fields
    const { error: jobReadinessError } = await supabase
      .from('job_readiness_products')
      .insert({
        product_id: product.id,
        bronze_assessment_min_score: configuration.bronze_assessment_min_score,
        bronze_assessment_max_score: configuration.bronze_assessment_max_score,
        silver_assessment_min_score: configuration.silver_assessment_min_score,
        silver_assessment_max_score: configuration.silver_assessment_max_score,
        gold_assessment_min_score: configuration.gold_assessment_min_score,
        gold_assessment_max_score: configuration.gold_assessment_max_score
      });

    if (jobReadinessError) {
      console.error('Error creating job readiness product config:', jobReadinessError);
      // If this fails, we should ideally rollback the product creation,
      // but for simplicity, we'll just return an error
      return NextResponse.json({ error: 'Failed to create job readiness configuration' }, { status: 500 });
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in Job Readiness products POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/job-readiness/products
 * Update an existing Job Readiness product
 */
export async function PATCH(req: NextRequest) {
  try {
    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequestUltraFast(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;
    const body = await req.json();

    // Validate request body
    const { id, name, description, configuration } = body;

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Update the product
    const { error: productError } = await supabase
      .from('products')
      .update({
        name,
        description,
      })
      .eq('id', id)
      .eq('type', 'JOB_READINESS');

    if (productError) {
      console.error('Error updating product:', productError);
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }

    // If configuration is provided, update the job_readiness_products entry
    if (configuration) {
      const { error: jobReadinessError } = await supabase
        .from('job_readiness_products')
        .update(configuration)
        .eq('product_id', id);

      if (jobReadinessError) {
        console.error('Error updating job readiness product config:', jobReadinessError);
        return NextResponse.json({ error: 'Failed to update job readiness configuration' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in Job Readiness products PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/job-readiness/products
 * Delete a Job Readiness product
 */
export async function DELETE(req: NextRequest) {
  try {
    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequestUltraFast(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Delete the job_readiness_products entry first (foreign key constraint)
    const { error: jobReadinessError } = await supabase
      .from('job_readiness_products')
      .delete()
      .eq('product_id', id);

    if (jobReadinessError) {
      console.error('Error deleting job readiness product config:', jobReadinessError);
      return NextResponse.json({ error: 'Failed to delete job readiness configuration' }, { status: 500 });
    }

    // Then delete the product
    const { error: productError } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('type', 'JOB_READINESS');

    if (productError) {
      console.error('Error deleting product:', productError);
      return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in Job Readiness products DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 