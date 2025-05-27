import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/app/job-readiness/products
 * Get assigned Job Readiness products and progress for the current student
 * Includes module lock/unlock status based on student's current star level and progress
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

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
        client_id,
        job_readiness_star_level,
        job_readiness_tier,
        job_readiness_background_type,
        job_readiness_promotion_eligible
      `)
      .eq('id', user.id)
      .single();

    if (studentError || !student) {
      console.error('Error fetching student:', studentError);
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Get Job Readiness products assigned to the student's client
    // First get the product assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from('client_product_assignments')
      .select('product_id')
      .eq('client_id', student.client_id);

    if (assignmentsError) {
      console.error('Error fetching client product assignments:', assignmentsError);
      return NextResponse.json({ error: 'Failed to fetch client product assignments' }, { status: 500 });
    }

    if (!assignments || assignments.length === 0) {
      console.log('No product assignments found for client:', student.client_id);
      return NextResponse.json({
        student: {
          id: student.id,
          name: student.full_name,
          email: student.email,
          job_readiness_star_level: student.job_readiness_star_level,
          job_readiness_tier: student.job_readiness_tier,
          job_readiness_background_type: student.job_readiness_background_type,
          job_readiness_promotion_eligible: student.job_readiness_promotion_eligible
        },
        products: []
      });
    }

    // Get the actual products with job readiness configurations
    const productIds = assignments.map(a => a.product_id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        type,
        job_readiness_products (*)
      `)
      .in('id', productIds)
      .eq('type', 'JOB_READINESS');

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    // Enforce business rule: only one Job Readiness product per client
    if (products && products.length > 1) {
      console.warn(`Client ${student.client_id} has ${products.length} Job Readiness products. Expected only 1.`);
    }

    const clientProducts = products?.map(product => ({
      product_id: product.id,
      products: product
    })) || [];

    // Define the type for the product data  
    type ProductData = {
      id: string;
      name: string;
      description: string;
      type: string;
      job_readiness_products: any[];
    };

    // Get modules for each product with progress
    const productsWithModules = await Promise.all(
      clientProducts.map(async (assignment) => {
        // Access the products field
        const productData = assignment.products as ProductData;

        const { data: modules, error: modulesError } = await supabase
          .from('modules')
          .select(`
            id,
            name,
            type,
            configuration,
            product_id,
            student_module_progress (
              student_id,
              module_id,
              status,
              progress_percentage,
              progress_details,
              completed_at,
              last_updated
            )
          `)
          .eq('product_id', assignment.product_id)
          .eq('student_module_progress.student_id', student.id)
          .order('sequence', { ascending: true });

        if (modulesError) {
          console.error('Error fetching modules:', modulesError);
          return {
            ...assignment,
            modules: [],
          };
        }

        // Determine which modules are locked/unlocked based on star level
        const modulesWithAccess = modules?.map((module) => {
          let isUnlocked = false;
          const starLevel = student.job_readiness_star_level || 'ONE';
          
          // Logic for determining if a module is unlocked based on star level
          switch (module.type) {
            case 'assessment':
              // Assessment is always unlocked by default
              isUnlocked = true;
              break;
            case 'course':
              // Courses unlock after star level ONE (after completing assessments)
              isUnlocked = ['TWO', 'THREE', 'FOUR', 'FIVE'].includes(starLevel);
              break;
            case 'expert_session':
              // Expert sessions unlock at star level TWO (after completing courses)
              isUnlocked = ['TWO', 'THREE', 'FOUR', 'FIVE'].includes(starLevel);
              break;
            case 'project':
              // Projects unlock after star level THREE (after completing expert sessions)
              isUnlocked = ['FOUR', 'FIVE'].includes(starLevel);
              break;
            case 'interview':
              // Interviews unlock after star level FOUR (after completing projects)
              isUnlocked = ['FIVE'].includes(starLevel);
              break;
            default:
              isUnlocked = false;
          }

          return {
            ...module,
            is_unlocked: isUnlocked,
            progress: module.student_module_progress?.[0] || null
          };
        });

        return {
          ...assignment,
          modules: modulesWithAccess || [],
        };
      })
    );

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.full_name,
        email: student.email,
        job_readiness_star_level: student.job_readiness_star_level,
        job_readiness_tier: student.job_readiness_tier,
        job_readiness_background_type: student.job_readiness_background_type,
        job_readiness_promotion_eligible: student.job_readiness_promotion_eligible
      },
      products: productsWithModules.map((assignment) => {
        // Access the products field
        const productData = assignment.products as ProductData;
        
        return {
          id: productData.id,
          name: productData.name,
          description: productData.description,
          configuration: productData.job_readiness_products?.[0],
          modules: assignment.modules
        };
      })
    });
  } catch (error) {
    console.error('Unexpected error in job-readiness products GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 