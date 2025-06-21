import { NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

/**
 * GET /api/app/progress
 * Fetches the overall progress overview for the authenticated student across all their enrolled products/courses.
 */
export async function GET() {
  try {
    // 1. 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['student']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    // Check if student account is active (from JWT claims)
    if (!claims.profile_is_active) {
      return NextResponse.json(
        { error: 'Forbidden: Student account is inactive' },
        { status: 403 }
      );
    }

    // Get client_id from JWT claims instead of database lookup
    const clientId = claims.client_id;
    if (!clientId) {
      console.error(`Student ${user.id} has no assigned client_id in JWT claims.`);
      return NextResponse.json(
        { error: 'Forbidden: Student not linked to a client' },
        { status: 403 }
      );
    }

    const studentId = user.id;

    // 2. Fetch Assigned Products
    const { data: assignedProducts, error: assignmentError } = await supabase
      .from('client_product_assignments')
      .select(`
        product_id,
        products ( id, name, description )
      `)
      .eq('client_id', clientId);

    if (assignmentError) {
      console.error(`GET /progress - Error fetching product assignments for client ${clientId}:`, assignmentError);
      return NextResponse.json({ error: 'Internal Server Error fetching assignments' }, { status: 500 });
    }

    if (!assignedProducts || assignedProducts.length === 0) {
      // No products assigned to this student's client
      return NextResponse.json([], { status: 200 }); // Return empty array
    }

    // 2.1 Extract unique product details, handling potential array wrapping from Supabase
    const products = assignedProducts
      .map((assignment: any) => {
        // Supabase might return the related record as an array [{...}] or an object {...}
        // Check if it's a non-empty array and grab the first element
        if (Array.isArray(assignment.products) && assignment.products.length > 0) {
          return assignment.products[0];
        }
        // Check if it's a direct object (less common for relations but handle just in case)
        if (assignment.products && typeof assignment.products === 'object' && !Array.isArray(assignment.products)) {
             return assignment.products;
        }
        return null; // No valid product object found for this assignment
      })
      .filter((product: any) => product !== null) as // Filter out assignments that didn't yield a product
        // Assert the type of the items remaining in the array
        { id: string; name: string; description: string | null }[];

    const productIds = products.map((p: any) => p.id);

    if (productIds.length === 0) {
      // Should not happen if assignedProducts had non-null products, but good to check
       console.warn(`GET /progress - Client ${clientId} has assignments but no valid products found.`);
       return NextResponse.json([], { status: 200 });
    }

    // 3. Fetch Modules for these Products through module_product_assignments
    const { data: moduleAssignments, error: modulesError } = await supabase
      .from('module_product_assignments')
      .select(`
        product_id,
        modules (
          id,
          name,
          type,
          sequence,
          lessons (
            id,
            title,
            description,
            video_url,
            sequence,
            has_quiz,
            quiz_data,
            quiz_questions
          ),
          assessment_module_questions (
            sequence,
            assessment_questions (
              id,
              question_text,
              options,
              correct_answer,
              question_type,
              difficulty,
              topic
            )
          )
        )
      `)
      .in('product_id', productIds);

    if (modulesError) {
      console.error(`GET /progress - Error fetching module assignments for products ${productIds}:`, modulesError);
      return NextResponse.json({ error: 'Internal Server Error fetching modules' }, { status: 500 });
    }

    // Transform module assignments into modules with product_id
    const modules = moduleAssignments?.flatMap((assignment: any) => {
      if (assignment.modules) {
        return {
          ...assignment.modules,
          product_id: assignment.product_id
        };
      }
      return [];
    }).filter(Boolean).sort((a: any, b: any) => a.sequence - b.sequence) || [];

    if (!modules || modules.length === 0) {
      // Products exist, but have no modules yet. Return products basic info.
      // Or decide if this case needs different handling (e.g., return products with empty modules array)
      console.warn(`GET /progress - Products ${productIds} found, but no modules associated.`);
       // For now, return just the product info - might need adjustment based on UI needs
       const productDataOnly = products.map(p => ({ ...p, modules: [] }));
       return NextResponse.json(productDataOnly, { status: 200 });
    }

    const moduleIds = modules.map((m: any) => m.id);

    // 4. Fetch Student's Module Progress for these Modules
    const { data: moduleProgressData, error: moduleProgressError } = await supabase
      .from('student_module_progress') // Fetch consolidated module progress
      .select('module_id, status, progress_percentage, completed_at, last_updated') // Select 'last_updated' instead of 'updated_at'
      .eq('student_id', studentId)
      .in('module_id', moduleIds); // Filter by modules belonging to assigned products

    if (moduleProgressError) {
      console.error(`GET /progress - Error fetching module progress for student ${studentId}:`, moduleProgressError);
      // Continue processing? Or return error? Decide based on requirements.
      // For now, log error and continue, progress might be partially available.
    }

    // 5. Fetch Student's Assessment Attempts for relevant Modules
    const assessmentModuleIds = modules.filter((m: any) => m.type === 'Assessment').map((m: any) => m.id);
    let assessmentAttempts: any[] = []; // Initialize as empty array
    if (assessmentModuleIds.length > 0) {
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('assessment_progress') // Use correct table 'assessment_progress'
        .select('module_id, score, passed, submitted_at') // Select 'module_id' and other relevant columns
        .eq('student_id', studentId)
        .in('module_id', assessmentModuleIds); // Filter by 'module_id'

      if (attemptsError) {
        console.error(`GET /progress - Error fetching assessment attempts for student ${studentId}:`, attemptsError);
        // Log error and continue, assessment details might be missing
      } else {
        assessmentAttempts = attemptsData || [];
      }
    }

    // 6. Prepare Data Structures for Combining
    const moduleProgressMap = new Map(
      moduleProgressData?.map((p: any) => [p.module_id, p]) || []
    );
    // Map latest assessment attempt by assessment_module_id
    const assessmentAttemptsMap = new Map();
    assessmentAttempts.forEach((attempt: any) => {
      // Only store the latest attempt if multiple exist
      const existing = assessmentAttemptsMap.get(attempt.module_id); // Use module_id as key
      if (!existing || new Date(attempt.submitted_at) > new Date(existing.submitted_at)) {
        assessmentAttemptsMap.set(attempt.module_id, attempt); // Use module_id as key
      }
    });

    // Map modules by product_id
    const modulesByProduct = modules.reduce((acc: any, module: any) => {
      const productId = module.product_id; // Use variable for clarity
      if (!acc[productId]) {
        acc[productId] = [];
      }
      acc[productId].push(module);
      return acc;
    }, {} as Record<string, typeof modules>);

    // 7. Combine Data into Final Structure
    const combinedData = products.map((product: any) => {
      const productModules = modulesByProduct[product.id] || [];

      const modulesWithProgress = productModules.map((module: any) => {
        const progress: any = moduleProgressMap.get(module.id);
        const assessmentAttempt = module.type === 'Assessment' ? assessmentAttemptsMap.get(module.id) : null;

        return {
          id: module.id,
          name: module.name, // Use 'name' from module data
          type: module.type,
          sequence: module.sequence, // Use 'sequence' from module data
          status: progress?.status || 'NotStarted',
          progress_percentage: progress?.progress_percentage || 0,
          completed_at: progress?.completed_at || null,
          // Include lessons for course modules
          lessons: module.lessons || [],
          // Include assessment questions for assessment modules
          questions: module.assessment_module_questions 
            ? module.assessment_module_questions
                .sort((a: any, b: any) => a.sequence - b.sequence)
                .map((amq: any) => ({
                  ...amq.assessment_questions,
                  sequence: amq.sequence
                }))
            : [],
          // Add assessment specific details if an attempt exists
          ...(assessmentAttempt && {
            assessment_score: assessmentAttempt.score,
            assessment_passed: assessmentAttempt.passed,
            assessment_submitted_at: assessmentAttempt.submitted_at,
          }),
        };
      });

      return {
        ...product, // id, name, description (updated)
        modules: modulesWithProgress, // Add the processed modules array
      };
    });

    // 8. Return Combined Data
    return NextResponse.json(combinedData, { status: 200 });

  } catch (error) {
    console.error('Unexpected Error in GET /api/app/progress:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
