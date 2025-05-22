import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const ProductIdQuerySchema = z.object({
  productId: z.string().uuid(),
});

interface Module {
  id: string;
  name: string;
  type: string;
  configuration?: Record<string, any> | null;
}

interface JobReadinessProduct {
  id: string;
  name: string;
  product_id: string;
}

/**
 * GET /api/app/job-readiness/courses
 *
 * Lists available "Course" type modules for the student within the specified Job Readiness product.
 * Requires student authentication.
 * Filters by `productId` query parameter.
 * Also considers module lock/unlock status based on student's progress.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');

    const queryValidation = ProductIdQuerySchema.safeParse({ productId });
    if (!queryValidation.success) {
      return NextResponse.json(
        { error: 'Invalid or missing productId', details: queryValidation.error.format() },
        { status: 400 }
      );
    }

    const validProductId = queryValidation.data.productId;
    console.log('Looking up job readiness product with ID:', validProductId);

    // First verify this is a job readiness product - use maybeSingle instead of single
    const { data: jrProduct, error: jrProductError } = await supabase
      .from('job_readiness_products')
      .select('id, product_id')
      .eq('product_id', validProductId)
      .maybeSingle();

    console.log('Job readiness product query result:', jrProduct);
    console.log('Job readiness product query error:', jrProductError);

    // Product may exist but not be a job readiness product
    if (jrProductError && jrProductError.code !== 'PGRST116') {
      console.error('Error fetching job readiness product by product_id:', jrProductError);
      return NextResponse.json({ error: 'Failed to fetch job readiness product details' }, { status: 500 });
    }

    let jrProductId = jrProduct?.id;

    if (!jrProductId) {
      console.log(`No job readiness product found for product_id: ${validProductId}`);
      
      // Verify the product exists at all
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, type')
        .eq('id', validProductId)
        .maybeSingle();
      
      console.log('Regular product query result:', product);
      console.log('Regular product query error:', productError);
        
      if (productError || !product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      
      if (product.type !== 'JOB_READINESS') {
        return NextResponse.json(
          { error: 'The specified product is not a Job Readiness product' }, 
          { status: 400 }
        );
      }
      
      // Use our security definer function to ensure the job readiness product exists
      const { data: ensureResult, error: ensureError } = await supabase
        .rpc('ensure_job_readiness_product', { p_product_id: validProductId });
        
      console.log('Ensure job readiness product result:', ensureResult);
      console.log('Ensure job readiness product error:', ensureError);
        
      if (ensureError || !ensureResult) {
        console.error('Failed to ensure job readiness product exists:', ensureError);
        return NextResponse.json(
          { error: 'Job Readiness product configuration is missing and could not be created automatically' }, 
          { status: 404 }
        );
      }
      
      jrProductId = ensureResult;
      console.log('Successfully created/found job readiness product configuration with ID:', jrProductId);
    }

    // 2. Fetch all Course modules that belong to this product
    const { data: modules, error: modulesError } = await supabase
      .from('modules')
      .select('id, name, type, configuration')
      .eq('product_id', validProductId)
      .eq('type', 'Course');

    if (modulesError) {
      console.error('Error fetching modules for product:', modulesError);
      return NextResponse.json({ error: 'Failed to fetch course modules' }, { status: 500 });
    }

    console.log('Found course modules:', modules);

    // Filter and format the course modules
    const courseModules = (modules || []).map(module => {
      const moduleConfig = module.configuration as any || {};
      
      return {
        id: module.id,
        name: module.name,
        description: moduleConfig?.description || null,
      };
    });

    // TODO: Implement module lock/unlock status check based on student's current star level and progress
    // For now, returning all course modules. This needs to be integrated with `checkModuleAccess` utility.

    console.log('Returning course modules:', courseModules);
    return NextResponse.json(courseModules);

  } catch (error) {
    console.error('Error fetching job readiness courses:', error);
    const err = error as Error;
    return NextResponse.json({ error: 'Failed to fetch job readiness courses', details: err.message }, { status: 500 });
  }
} 