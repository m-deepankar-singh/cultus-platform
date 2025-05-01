import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { ProgressQuerySchema } from '@/lib/schemas/progress';

// Define types for cleaner data handling
type ModuleData = {
  id: string;
  name: string;
  type: string;
  sequence: number;
  product_id: string;
};

type ProductData = {
  id: string;
  name: string;
  description: string | null;
  modules: ModuleData[];
};

type ProductAssignment = {
  products: ProductData | ProductData[] | null; // Supabase might return object or array
};

// Define type for module progress data
type ModuleProgress = {
  student_id: string;
  module_id: string;
  status: string;
  progress_percentage: number | null;
  score: number | null;
  last_updated: string | null;
  completed_at: string | null;
};

// Define type for assessment progress data
type AssessmentProgress = {
  student_id: string;
  module_id: string;
  score: number | null;
  passed: boolean | null;
  submitted_at: string | null;
};

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

    // Check JWT claims for debugging
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('DEBUG - JWT claims:', session?.access_token ? 
      JSON.parse(atob(session.access_token.split('.')[1])) : 'No session token');

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

    console.log('DEBUG - User and target info:', { 
      userId: user.id,
      userRole: profile.role,
      targetClientId,
      filterStudentId,
      filterProductId,
      filterModuleId
    });

    // 4. Fetch Target Student IDs
    let targetStudentIds: string[] = [];

    if (filterStudentId) {
      // A specific student is requested, verify they belong to the target client
      const { data: studentData, error: studentCheckError } = await supabase
        .from('students')
        .select('id, client_id')
        .eq('id', filterStudentId)
        .maybeSingle(); 

      if (studentCheckError) {
        console.error(`Error checking student ${filterStudentId} in client ${targetClientId}:`, studentCheckError);
        return NextResponse.json({ error: 'Internal Server Error checking student' }, { status: 500 });
      }

      // Check if student exists AND belongs to the correct client
      if (!studentData || studentData.client_id !== targetClientId) {
        return NextResponse.json(
          { error: `Not Found: Student ${filterStudentId} not found within client ${targetClientId}` },
          { status: 404 }
        );
      }
      targetStudentIds = [studentData.id];

    } else {
      // No specific student requested, fetch all active students for the target client
      const { data: clientStudents, error: clientStudentsError } = await supabase
        .from('students') // Query students table
        .select('id')
        .eq('client_id', targetClientId);
        // Temporarily removed .eq('is_active', true) to debug 

      if (clientStudentsError) {
        console.error(`Error fetching students for client ${targetClientId}:`, clientStudentsError);
        return NextResponse.json({ error: 'Internal Server Error fetching client students' }, { status: 500 });
      }

      console.log(`DEBUG - Students for client ${targetClientId}:`, clientStudents);

      if (!clientStudents || clientStudents.length === 0) {
        console.log(`DEBUG - No students found for client ${targetClientId}`);
        return NextResponse.json([], { status: 200 }); 
      }
      targetStudentIds = clientStudents.map(s => s.id);
    }

    console.log('DEBUG - Target student IDs:', targetStudentIds);

    if (targetStudentIds.length === 0) {
       return NextResponse.json([], { status: 200 }); 
    }

    // 5. Determine Relevant Products/Modules based on filters (Corrected Selects)
    console.log('DEBUG - Querying client_product_assignments with client_id:', targetClientId);
    
    let relevantProductsQuery = supabase
      .from('client_product_assignments')
      .select(`
        products ( 
          id, name, description,
          modules ( id, name, type, sequence, product_id )
        )
      `)
      .eq('client_id', targetClientId);

    // Apply product filter if provided
    if (filterProductId) {
      relevantProductsQuery = relevantProductsQuery.eq('product_id', filterProductId);
    }

    // Explicitly type the fetched data
    const { data: productAssignments, error: productAssignmentsError } = await relevantProductsQuery
      .returns<ProductAssignment[]>(); // Add .returns<T[]>

    if (productAssignmentsError) {
      console.error(`Error fetching product/module assignments for client ${targetClientId}:`, productAssignmentsError);
      return NextResponse.json({ error: 'Internal Server Error fetching assignments' }, { status: 500 });
    }

    console.log(`DEBUG - Product assignments:`, JSON.stringify(productAssignments, null, 2));

    // Extract and flatten product and module data (Updated structure names)
    let allModules: ModuleData[] = []; // Use defined type
    let productsMap = new Map<string, Omit<ProductData, 'modules'> & { slug?: string | null }>(); // Use defined type, remove modules

    productAssignments?.forEach((assignment: ProductAssignment) => { // Type assignment
      const product = assignment.products; 
      const productData = Array.isArray(product) ? product[0] : product;

      if (productData && !productsMap.has(productData.id)) {
         // Store product without modules in the map
         productsMap.set(productData.id, { id: productData.id, name: productData.name, description: productData.description });
         if (productData.modules) {
             const modulesData: (ModuleData | null)[] = Array.isArray(productData.modules) ? productData.modules : [productData.modules];
             const filteredModules = modulesData
                 .filter((m): m is ModuleData => m !== null) // Type guard to remove nulls
                 .filter(m => filterModuleId ? m.id === filterModuleId : true); // Apply module filter
                 
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

    // 6. Fetch Data Concurrently (Corrected Selects and Table Names)
    const [
      { data: studentProfiles, error: studentProfilesError },
      { data: moduleProgressData, error: moduleProgressError },
      { data: assessmentAttemptsData, error: assessmentAttemptsError }
    ] = await Promise.all([
      supabase
        .from('students')
        .select('id, full_name, email')
        .in('id', targetStudentIds),
      supabase
        .from('student_module_progress')
        .select('student_id, module_id, status, progress_percentage, score, last_updated, completed_at')
        .in('student_id', targetStudentIds)
        .in('module_id', relevantModuleIds)
        .returns<ModuleProgress[]>(), // Add type
      assessmentModuleIds.length > 0
        ? supabase
            .from('assessment_progress') 
            .select('student_id, module_id, score, passed, submitted_at')
            .in('student_id', targetStudentIds)
            .in('module_id', assessmentModuleIds)
            .order('submitted_at', { ascending: false })
            .returns<AssessmentProgress[]>() // Add type
        : Promise.resolve({ data: [] as AssessmentProgress[], error: null }) 
    ]);

    // Check for errors in concurrent fetches
    if (studentProfilesError || moduleProgressError || assessmentAttemptsError) {
      console.error('Error fetching progress data:', { studentProfilesError, moduleProgressError, assessmentAttemptsError });
      // Consider more granular error reporting if needed
      return NextResponse.json({ error: 'Internal Server Error fetching progress details' }, { status: 500 });
    }

    // Ensure data is array even if fetch fails or returns null
    const safeStudentProfiles = studentProfiles || [];
    const safeModuleProgress = moduleProgressData || [];
    const safeAssessmentAttempts = assessmentAttemptsData || [];

    // Debug log for fetched data counts
    console.log(`Fetched data counts for client ${targetClientId}:`, {
      students: safeStudentProfiles.length,
      moduleProgressRecords: safeModuleProgress.length,
      assessmentAttempts: safeAssessmentAttempts.length
    });

    // 7. Structure Data for Response (Adjusted for corrected data)

    // Update map to use student data properly
    const studentProfileMap = new Map(safeStudentProfiles.map(s => [s.id, { name: s.full_name, email: s.email }]));
    
    // Use ModuleData type here
    const moduleMap = new Map(allModules.map((m: ModuleData) => [m.id, m])); 

    // studentId -> moduleId -> progressRecord
    const studentModuleProgressMap = new Map<string, Map<string, ModuleProgress>>();
    safeModuleProgress.forEach((prog: ModuleProgress) => {
      if (!studentModuleProgressMap.has(prog.student_id)) {
        studentModuleProgressMap.set(prog.student_id, new Map());
      }
      studentModuleProgressMap.get(prog.student_id)!.set(prog.module_id, prog);
    });

    // studentId -> moduleId -> latestAttempt
    const studentAssessmentAttemptsMap = new Map<string, Map<string, AssessmentProgress>>();
    safeAssessmentAttempts.forEach((att: AssessmentProgress) => {
      if (!studentAssessmentAttemptsMap.has(att.student_id)) {
        studentAssessmentAttemptsMap.set(att.student_id, new Map());
      }
      const studentAttempts = studentAssessmentAttemptsMap.get(att.student_id)!;
      if (!studentAttempts.has(att.module_id)) {
         studentAttempts.set(att.module_id, att); 
      }
    });

    // Build the final response structure
    const responseData = safeStudentProfiles.map(student => {
        // Debug log for mapping each student
        console.log(`Processing student: ${student.id}, progress records: ${studentModuleProgressMap.get(student.id)?.size || 0}`);

        const studentProgressMap = studentModuleProgressMap.get(student.id) || new Map();
        const studentAttemptsMap = studentAssessmentAttemptsMap.get(student.id) || new Map();

        const productsData = Array.from(productsMap.values()).map(productInfo => {
            // Get modules for this product from allModules list
            const productModules = allModules.filter(m => m.product_id === productInfo.id);
            
            const modulesData = productModules.map((moduleInfo: ModuleData) => { // Type moduleInfo
                const moduleProgress = studentProgressMap.get(moduleInfo.id);
                const assessmentAttempt = moduleInfo.type === 'Assessment' ? studentAttemptsMap.get(moduleInfo.id) : null;

                return {
                    module_id: moduleInfo.id,
                    module_name: moduleInfo.name,
                    module_type: moduleInfo.type,
                    module_sequence: moduleInfo.sequence,
                    status: moduleProgress?.status || 'NotStarted',
                    progress_percentage: moduleProgress?.progress_percentage || 0,
                    score: moduleProgress?.score, 
                    completed_at: moduleProgress?.completed_at,
                    last_updated: moduleProgress?.last_updated,
                    assessment_details: assessmentAttempt ? {
                        score: assessmentAttempt.score,
                        passed: assessmentAttempt.passed,
                        submitted_at: assessmentAttempt.submitted_at
                    } : null
                };
            });

            // Filter out modules if filterModuleId is applied and this product doesn't contain it
            if (filterModuleId && !modulesData.some(m => m.module_id === filterModuleId)) {
                 return null;
            }

            return {
                product_id: productInfo.id,
                product_name: productInfo.name,
                product_description: productInfo.description,
                modules: modulesData.sort((a, b) => a.module_sequence - b.module_sequence)
            };
        }).filter(p => p !== null); // Filter null products

        // Only include students who have relevant progress/modules based on filters
        if (productsData.length === 0) {
            return null;
        }

        return {
            student_id: student.id,
            student_name: student.full_name,
            student_email: student.email,
            products: productsData
        };
    }).filter(s => s !== null); 

    // Final debug log for response
    console.log(`Returning response with ${responseData.length} students`);
    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error('Unexpected Error in GET /api/client-staff/progress:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
