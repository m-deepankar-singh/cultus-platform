import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { ProgressQuerySchema } from '@/lib/schemas/progress';

/**
 * GET /api/client-staff/progress
 * Fetches progress data for students associated with the authenticated Client Staff's client,
 * or for a specific client if requested by an Admin.
 * Allows filtering by studentId, productId, moduleId.
 */
export async function GET(request: Request) {
  try {
    // 1. Authentication & Authorization
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, client_id') // Select client_id as well
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
       // Profile not found, perhaps deleted after login?
       return NextResponse.json({ error: 'Forbidden: Profile not found' }, { status: 403 });
    }

    // Check if the user has the required role
    const allowedRoles: ('Client Staff' | 'Admin')[] = ['Client Staff', 'Admin'];
    if (!allowedRoles.includes(profile.role as any)) { // Cast needed if role isn't strictly typed
        console.warn(`User ${user.id} with role ${profile.role} attempted to access client staff endpoint.`);
        return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const staffRole = profile.role as 'Client Staff' | 'Admin'; // Safe to cast now
    const staffClientId = profile.client_id; // Might be null for Admin

    // If user is Client Staff, they MUST have a client_id
    if (staffRole === 'Client Staff' && !staffClientId) {
        console.error(`Client Staff user ${user.id} is missing client_id.`);
        return NextResponse.json({ error: 'Forbidden: Staff configuration error' }, { status: 403 });
    }

    // 2. Parse and Validate Query Parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validationResult = ProgressQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid query parameters', details: validationResult.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const { studentId: filterStudentId, productId: filterProductId, moduleId: filterModuleId, clientId: queryClientId } = validationResult.data;

    // 3. Determine Client Scope
    let targetClientId: string;
    if (staffRole === 'Admin') {
      if (!queryClientId) {
        // Admin MUST provide clientId
        return NextResponse.json({ error: 'Bad Request: Admin must provide clientId query parameter' }, { status: 400 });
      }
      targetClientId = queryClientId;
      // TODO: (Optional) Verify the targetClientId exists in the 'clients' table?
    } else { // staffRole === 'Client Staff'
      targetClientId = staffClientId as string; // Already verified staffClientId exists for Client Staff
    }

    // 4. Fetch Target Student IDs
    let targetStudentIds: string[] = [];

    if (filterStudentId) {
      // A specific student is requested, verify they belong to the target client
      const { data: studentProfile, error: studentProfileError } = await supabase
        .from('profiles')
        .select('id, client_id')
        .eq('id', filterStudentId)
        .eq('role', 'Student') // Ensure it's actually a student
        .maybeSingle(); // Use maybeSingle as the student might not exist

      if (studentProfileError) {
        console.error(`Error fetching profile for specific student ${filterStudentId}:`, studentProfileError);
        return NextResponse.json({ error: 'Internal Server Error checking student profile' }, { status: 500 });
      }

      // Check if student exists AND belongs to the correct client
      if (!studentProfile || studentProfile.client_id !== targetClientId) {
        // Do not reveal if the student exists but belongs to another client
        return NextResponse.json(
          { error: `Not Found: Student ${filterStudentId} not found within client ${targetClientId}` },
          { status: 404 }
        );
      }
      // If valid, target only this student
      targetStudentIds = [studentProfile.id];

    } else {
      // No specific student requested, fetch all active students for the target client
      const { data: clientStudents, error: clientStudentsError } = await supabase
        .from('profiles')
        .select('id')
        .eq('client_id', targetClientId)
        .eq('role', 'Student')
        .eq('is_active', true); // Optional: only fetch active students

      if (clientStudentsError) {
        console.error(`Error fetching students for client ${targetClientId}:`, clientStudentsError);
        return NextResponse.json({ error: 'Internal Server Error fetching client students' }, { status: 500 });
      }

      if (!clientStudents || clientStudents.length === 0) {
        // No students found for this client (or matching filters)
        return NextResponse.json([], { status: 200 }); // Return empty array
      }
      targetStudentIds = clientStudents.map(s => s.id);
    }

    // Ensure we have student IDs to query for before proceeding
    if (targetStudentIds.length === 0) {
       console.log(`No target student IDs found for client ${targetClientId} with current filters.`);
       return NextResponse.json([], { status: 200 }); // Return empty array
    }

    // 5. Determine Relevant Products/Modules based on filters
    let relevantProductsQuery = supabase
      .from('client_product_assignments')
      .select(`
        products ( 
          id, title, slug,
          modules ( id, title, type, order, product_id )
        )
      `)
      .eq('client_id', targetClientId);

    // Apply product filter if provided
    if (filterProductId) {
      relevantProductsQuery = relevantProductsQuery.eq('product_id', filterProductId);
    }

    const { data: productAssignments, error: productAssignmentsError } = await relevantProductsQuery;

    if (productAssignmentsError) {
      console.error(`Error fetching product/module assignments for client ${targetClientId}:`, productAssignmentsError);
      return NextResponse.json({ error: 'Internal Server Error fetching assignments' }, { status: 500 });
    }

    // Extract and flatten product and module data
    let allModules: any[] = [];
    let productsMap = new Map<string, {id: string; title: string; slug: string | null}>();

    productAssignments?.forEach(assignment => {
      const product = assignment.products; // Might be array [{...}] or object {...}
      // Handle potential array wrapping for the product relation
      const productData = Array.isArray(product) ? product[0] : product;

      if (productData && !productsMap.has(productData.id)) {
         productsMap.set(productData.id, { id: productData.id, title: productData.title, slug: productData.slug });
         // Handle potential array wrapping for the modules relation within the product
         if (productData.modules) {
             const modulesData = Array.isArray(productData.modules) ? productData.modules : [productData.modules];
             // Apply module filter if provided, otherwise take all non-null modules
             const filteredModules = filterModuleId
               ? modulesData.filter(m => m && m.id === filterModuleId)
               : modulesData.filter(m => m); // Filter out potential nulls/undefined

             allModules = allModules.concat(filteredModules);
         }
      }
    });

    if (allModules.length === 0) {
        console.log(`No relevant modules found for client ${targetClientId} with filters:`, { filterProductId, filterModuleId });
        return NextResponse.json([], { status: 200 }); // No modules match criteria
    }

    const relevantModuleIds = allModules.map(m => m.id);
    const relevantProductIds = Array.from(productsMap.keys()); // Use keys from the map

    // Identify assessment module IDs for filtering attempts
    const assessmentModuleIds = allModules.filter(m => m.type === 'Assessment').map(m => m.id);

    // 6. Fetch Data Concurrently
    const [
      { data: studentProfiles, error: studentProfilesError },
      { data: moduleProgressData, error: moduleProgressError },
      { data: assessmentAttemptsData, error: assessmentAttemptsError }
    ] = await Promise.all([
      // Query 1: Fetch Student Profiles
      supabase
        .from('profiles')
        .select('id, full_name, email') // Add other fields if needed later
        .in('id', targetStudentIds),

      // Query 2: Fetch Module Progress
      supabase
        .from('student_module_progress')
        .select('student_id, module_id, status, progress_percentage, score, updated_at')
        .in('student_id', targetStudentIds)
        .in('module_id', relevantModuleIds),

      // Query 3: Fetch Assessment Attempts (only for assessment modules)
      assessmentModuleIds.length > 0
        ? supabase
            .from('student_assessment_attempts')
            .select('id, student_id, assessment_id, score, started_at, completed_at') // assessment_id is the module_id
            .in('student_id', targetStudentIds)
            .in('assessment_id', assessmentModuleIds)
            .order('started_at', { ascending: false }) // Get latest attempts first maybe?
        : Promise.resolve({ data: [], error: null }) // No assessment modules, resolve immediately
    ]);

    // Check for errors in concurrent fetches
    if (studentProfilesError || moduleProgressError || assessmentAttemptsError) {
      console.error('Error fetching progress data:', { studentProfilesError, moduleProgressError, assessmentAttemptsError });
      // Consider more granular error reporting if needed
      return NextResponse.json({ error: 'Internal Server Error fetching progress details' }, { status: 500 });
    }

    // Handle cases where data might be unexpectedly null/empty if needed
    const safeStudentProfiles = studentProfiles || [];
    const safeModuleProgress = moduleProgressData || [];
    const safeAssessmentAttempts = assessmentAttemptsData || [];

    // 7. Structure Data for Response

    // Create lookup maps for efficient access
    const studentProfileMap = new Map(safeStudentProfiles.map(p => [p.id, { name: p.full_name, email: p.email }]));
    const moduleMap = new Map(allModules.map(m => [m.id, m]));

    // Map progress: studentId -> moduleId -> progressRecord
    const studentModuleProgressMap = new Map<string, Map<string, any>>();
    safeModuleProgress.forEach(prog => {
      if (!studentModuleProgressMap.has(prog.student_id)) {
        studentModuleProgressMap.set(prog.student_id, new Map());
      }
      studentModuleProgressMap.get(prog.student_id)!.set(prog.module_id, prog);
    });

    // Map attempts: studentId -> assessmentId -> attempt[]
    const studentAssessmentAttemptsMap = new Map<string, Map<string, any[]>>();
    safeAssessmentAttempts.forEach(att => {
      if (!studentAssessmentAttemptsMap.has(att.student_id)) {
        studentAssessmentAttemptsMap.set(att.student_id, new Map());
      }
      const studentAttempts = studentAssessmentAttemptsMap.get(att.student_id)!;
      if (!studentAttempts.has(att.assessment_id)) {
        studentAttempts.set(att.assessment_id, []);
      }
      studentAttempts.get(att.assessment_id)!.push({
        id: att.id,
        score: att.score,
        started_at: att.started_at,
        completed_at: att.completed_at,
      });
    });

    // Build the final response structure
    const responseData = safeStudentProfiles.map(student => {
      const studentProgress = studentModuleProgressMap.get(student.id) || new Map();
      const studentAttempts = studentAssessmentAttemptsMap.get(student.id) || new Map();

      const productsData = Array.from(productsMap.values()).map(productInfo => {
          const productModules = allModules
            .filter(m => m.product_id === productInfo.id)
            .sort((a, b) => a.order - b.order) // Ensure modules are ordered
            .map(moduleInfo => {
              const progress = studentProgress.get(moduleInfo.id);
              const attempts = moduleInfo.type === 'Assessment' ? studentAttempts.get(moduleInfo.id) : undefined;

              const moduleProgress: any = { // Define interface later if needed
                module_id: moduleInfo.id,
                module_title: moduleInfo.title,
                module_type: moduleInfo.type,
                order: moduleInfo.order,
                status: progress?.status || 'NotStarted',
                progress_percentage: progress?.progress_percentage ?? null,
                score: progress?.score ?? null,
                last_updated: progress?.updated_at ?? null,
              };
              if (attempts) {
                moduleProgress.attempts = attempts;
              }
              return moduleProgress;
            });

          return {
            product_id: productInfo.id,
            product_title: productInfo.title,
            product_slug: productInfo.slug,
            modules: productModules,
          };
        })
        // Filter out products that ended up with no relevant modules after filtering
        .filter(p => p.modules.length > 0);

      return {
        student_id: student.id,
        student_name: studentProfileMap.get(student.id)?.name || 'N/A',
        student_email: studentProfileMap.get(student.id)?.email || 'N/A',
        products: productsData,
      };
    })
    // Filter out students who ended up with no relevant products/modules after filtering
    .filter(s => s.products.length > 0);

    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error('Unexpected Error in GET /api/client-staff/progress:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
