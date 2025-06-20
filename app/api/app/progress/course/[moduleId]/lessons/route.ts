import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateApiRequest } from '@/lib/auth/api-auth';

// Define a schema for UUID validation (reuse or define locally)
const UuidSchema = z.string().uuid({ message: 'Invalid Module ID format' });

/**
 * GET handler for fetching a student's progress on all lessons within a specific module.
 * - Validates moduleId.
 * - Authenticates and authorizes the student.
 * - Verifies student enrollment in the module's product.
 * - Fetches all lessons for the module.
 * - Fetches existing progress records for those lessons.
 * - Combines lesson data with progress, providing defaults for unstarted lessons.
 * - Returns the combined list.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  try {
    // 1. Validate Route Parameter (moduleId)
    const resolvedParams = await params;
    const moduleIdValidation = UuidSchema.safeParse(resolvedParams.moduleId);
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid Module ID format', details: moduleIdValidation.error.flatten().formErrors },
        { status: 400 },
      );
    }
    const moduleId = moduleIdValidation.data;

    // 2. 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
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
      return NextResponse.json(
        { error: 'Forbidden: Student not linked to a client' },
        { status: 403 }
      );
    }

    const studentId = user.id;

    // 3. Verify Enrollment (check if client is assigned to the module's product)
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select(`
        id,
        module_product_assignments!inner(product_id)
      `)
      .eq('id', moduleId)
      .maybeSingle();

    if (moduleError) {
      console.error('GET Lessons Progress - Error fetching module:', moduleError);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
    if (!moduleData || !moduleData.module_product_assignments?.length) {
      // Module itself not found, so can't fetch lessons for it
      return NextResponse.json({ error: 'Not Found: Module does not exist or not assigned to any product' }, { status: 404 });
    }
    const productId = moduleData.module_product_assignments[0].product_id;

    const { count, error: assignmentError } = await supabase
      .from('client_product_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('product_id', productId);

    if (assignmentError) {
      console.error('GET Lessons Progress - Error checking assignment:', assignmentError);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
    if (count === null || count === 0) {
      // Even if the module exists, if the student isn't enrolled in the product, deny access
      return NextResponse.json({ error: 'Forbidden: Not enrolled in product containing this module' }, { status: 403 });
    }

    // 4. Fetch Lessons for the Module
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons') // Assuming 'lessons' table has 'id', 'module_id', 'title', etc.
      .select('id, title, type, order') // Select fields needed for the response
      .eq('module_id', moduleId)
      .order('order', { ascending: true }); // Order lessons if needed

    if (lessonsError) {
      console.error('GET Lessons Progress - Error fetching lessons:', lessonsError);
      return NextResponse.json({ error: 'Internal Server Error fetching lessons' }, { status: 500 });
    }

    if (!lessons || lessons.length === 0) {
      // If a module exists but has no lessons, return an empty list
      return NextResponse.json([], { status: 200 });
    }

    const lessonIds = lessons.map((lesson: any) => lesson.id);

    // 5. Fetch Student's Progress for these Lessons
    const { data: progressRecords, error: progressError } = await supabase
      .from('student_lesson_progress')
      .select('lesson_id, status, progress_percentage, completed_at, updated_at') // Select relevant progress fields
      .eq('student_id', studentId)
      .in('lesson_id', lessonIds);

    if (progressError) {
      console.error('GET Lessons Progress - Error fetching progress records:', progressError);
      return NextResponse.json({ error: 'Internal Server Error fetching progress' }, { status: 500 });
    }

    // Convert progress records to a map for easy lookup
    const progressMap = new Map(progressRecords?.map((p: any) => [p.lesson_id, p]) || []);

    // 6. Combine Lessons and Progress
    const combinedLessonProgress = lessons.map((lesson: any) => {
      const progress: any = progressMap.get(lesson.id);

      if (progress) {
        // Merge lesson details with existing progress
        return {
          ...lesson, // Includes id, title, type, order
          status: progress.status,
          progress_percentage: progress.progress_percentage,
          completed_at: progress.completed_at,
          updated_at: progress.updated_at,
        };
      } else {
        // Merge lesson details with default 'NotStarted' progress
        return {
          ...lesson,
          status: 'NotStarted' as const, // Use 'as const' for type safety
          progress_percentage: 0,
          completed_at: null,
          updated_at: null,
        };
      }
    });

    // 7. Return Combined List
    return NextResponse.json(combinedLessonProgress, { status: 200 });

    console.log(`Validated request for student ${studentId} lessons in module ${moduleId}`);

  } catch (error) {
    console.error('Unexpected Error in GET /lessons:', error);
    // Add specific ZodError check if needed
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Bad Request: Validation failed', details: error.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}