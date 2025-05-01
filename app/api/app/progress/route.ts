import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/app/progress
 * Fetches the overall progress overview for the authenticated student across all their enrolled products/courses.
 */
export async function GET(request: Request) {
  try {
    // 1. Authentication & Authorization
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch student record from 'students' table
    const { data: studentRecord, error: studentFetchError } = await supabase
      .from('students')
      .select('client_id, is_active')
      .eq('id', user.id)
      .single();

    if (studentFetchError) {
      console.error('Student Fetch Error:', studentFetchError);
      if (studentFetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Forbidden: Student record not found' },
          { status: 403 },
        );
      }
      return NextResponse.json(
        { error: 'Internal Server Error: Could not fetch student record' },
        { status: 500 },
      );
    }

    // Check if student is active
    if (!studentRecord.is_active) {
        return NextResponse.json(
            { error: 'Forbidden: Student account is inactive' },
            { status: 403 },
        );
    }

    // Check if student is linked to a client
    if (!studentRecord.client_id) {
      console.error(`Student ${user.id} has no assigned client_id in students table.`);
      return NextResponse.json({ error: 'Forbidden: Student not linked to a client' }, { status: 403 });
    }

    const studentId = user.id;
    const clientId = studentRecord.client_id; // Use client_id from student record

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
      .map(assignment => {
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
      .filter(product => product !== null) as // Filter out assignments that didn't yield a product
        // Assert the type of the items remaining in the array
        { id: string; name: string; description: string | null }[];

    const productIds = products.map(p => p.id);

    if (productIds.length === 0) {
      // Should not happen if assignedProducts had non-null products, but good to check
       console.warn(`GET /progress - Client ${clientId} has assignments but no valid products found.`);
       return NextResponse.json([], { status: 200 });
    }

    // 3. Fetch Modules for these Products
    const { data: modules, error: modulesError } = await supabase
      .from('modules')
      .select('id, product_id, name, type, sequence') // Select 'name' and 'sequence' instead of 'title' and 'order'
      .in('product_id', productIds)
      .order('sequence', { ascending: true }); // Order by 'sequence'

    if (modulesError) {
      console.error(`GET /progress - Error fetching modules for products ${productIds}:`, modulesError);
      return NextResponse.json({ error: 'Internal Server Error fetching modules' }, { status: 500 });
    }

    if (!modules || modules.length === 0) {
      // Products exist, but have no modules yet. Return products basic info.
      // Or decide if this case needs different handling (e.g., return products with empty modules array)
      console.warn(`GET /progress - Products ${productIds} found, but no modules associated.`);
       // For now, return just the product info - might need adjustment based on UI needs
       const productDataOnly = products.map(p => ({ ...p, modules: [] }));
       return NextResponse.json(productDataOnly, { status: 200 });
    }

    const moduleIds = modules.map(m => m.id);

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
    const assessmentModuleIds = modules.filter(m => m.type === 'Assessment').map(m => m.id);
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
      moduleProgressData?.map(p => [p.module_id, p]) || []
    );
    // Map latest assessment attempt by assessment_module_id
    const assessmentAttemptsMap = new Map();
    assessmentAttempts.forEach(attempt => {
      // Only store the latest attempt if multiple exist
      const existing = assessmentAttemptsMap.get(attempt.module_id); // Use module_id as key
      if (!existing || new Date(attempt.submitted_at) > new Date(existing.submitted_at)) {
        assessmentAttemptsMap.set(attempt.module_id, attempt); // Use module_id as key
      }
    });

    // Map modules by product_id
    const modulesByProduct = modules.reduce((acc, module) => {
      const productId = module.product_id; // Use variable for clarity
      if (!acc[productId]) {
        acc[productId] = [];
      }
      acc[productId].push(module);
      return acc;
    }, {} as Record<string, typeof modules>);

    // 7. Combine Data into Final Structure
    const combinedData = products.map(product => {
      const productModules = modulesByProduct[product.id] || [];

      const modulesWithProgress = productModules.map(module => {
        const progress = moduleProgressMap.get(module.id);
        const assessmentAttempt = module.type === 'Assessment' ? assessmentAttemptsMap.get(module.id) : null;

        return {
          id: module.id,
          name: module.name, // Use 'name' from module data
          type: module.type,
          sequence: module.sequence, // Use 'sequence' from module data
          status: progress?.status || 'NotStarted',
          progress_percentage: progress?.progress_percentage || 0,
          completed_at: progress?.completed_at || null,
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
