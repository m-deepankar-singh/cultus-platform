import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { authenticateApiRequestSecure } from "@/lib/auth/api-auth";

// Schema for updating Job Readiness courses
const UpdateJobReadinessCourseSchema = z.object({
  name: z.string().min(3, { message: "Course name must be at least 3 characters long" }).optional(),
  sequence: z.number().int().optional(),
  configuration: z.object({
    description: z.string().optional(),
    estimated_duration_hours: z.number().positive().optional(),
    difficulty_level: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),
    prerequisites: z.array(z.string()).optional(),
    learning_objectives: z.array(z.string()).optional(),
    required_tier: z.enum(['BRONZE', 'SILVER', 'GOLD']).optional(),
    unlocks_at_star_level: z.enum(['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE']).optional(),
  }).optional(),
});

const CourseIdSchema = z.string().uuid({ message: 'Invalid Course ID format' });

/**
 * GET /api/admin/job-readiness/courses/[courseId]
 * 
 * Retrieves a specific Job Readiness course module by ID.
 * Requires admin authentication.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    // Validate courseId
    const { courseId } = await context.params;
    const courseIdValidation = CourseIdSchema.safeParse(courseId);
    if (!courseIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid Course ID format', details: courseIdValidation.error.flatten().formErrors },
        { status: 400 }
      );
    }
    const validCourseId = courseIdValidation.data;

    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequestSecure(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;

    // Fetch the Job Readiness course
    const { data: course, error: courseError } = await supabase
      .from("modules")
      .select(`
        *,
        products!inner(
          id, 
          name, 
          type,
          job_readiness_products(*)
        ),
        lessons(
          id,
          title,
          description,
          video_url,
          sequence,
          has_quiz,
          quiz_questions
        )
      `)
      .eq('id', validCourseId)
      .eq('type', 'Course')
      .eq('products.type', 'JOB_READINESS')
      .single();

    if (courseError) {
      console.error("Error fetching job readiness course:", courseError);
      if (courseError.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Not Found", message: "Job Readiness course not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Server Error", message: "Error fetching course" },
        { status: 500 }
      );
    }

    // Format the course with Job Readiness specific data
    const product = course.products;
    const jobReadinessConfig = product?.job_readiness_products?.[0] || null;
    const courseConfig = course.configuration || {};
    
    const formattedCourse = {
      ...course,
      products: product ? [product] : [],
      lessons: course.lessons || [],
      lessons_count: course.lessons?.length || 0,
      job_readiness_config: jobReadinessConfig,
      required_tier: courseConfig.required_tier || 'BRONZE',
      unlocks_at_star_level: courseConfig.unlocks_at_star_level || null,
      difficulty_level: courseConfig.difficulty_level || 'Beginner',
      estimated_duration_hours: courseConfig.estimated_duration_hours || null,
    };

    return NextResponse.json(formattedCourse);
  } catch (error) {
    console.error("Unexpected error in GET job readiness course:", error);
    return NextResponse.json(
      { error: "Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/job-readiness/courses/[courseId]
 * 
 * Updates a specific Job Readiness course module.
 * Requires admin authentication.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    // Validate courseId
    const { courseId } = await context.params;
    const courseIdValidation = CourseIdSchema.safeParse(courseId);
    if (!courseIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid Course ID format', details: courseIdValidation.error.flatten().formErrors },
        { status: 400 }
      );
    }
    const validCourseId = courseIdValidation.data;

    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequestSecure(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Bad Request", message: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const validation = UpdateJobReadinessCourseSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: "Bad Request", 
          message: "Invalid course data",
          details: validation.error.format() 
        },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Check if the course exists and is a Job Readiness course
    const { data: existingCourse, error: existingError } = await supabase
      .from("modules")
      .select(`
        id,
        product_id,
        configuration,
        products!inner(type)
      `)
      .eq('id', validCourseId)
      .eq('type', 'Course')
      .eq('products.type', 'JOB_READINESS')
      .single();

    if (existingError) {
      console.error("Error checking existing course:", existingError);
      if (existingError.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Not Found", message: "Job Readiness course not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Server Error", message: "Error checking course" },
        { status: 500 }
      );
    }

    // Prepare update object
    const moduleUpdate: any = {};
    
    if (updateData.name !== undefined) {
      moduleUpdate.name = updateData.name;
    }
    
    if (updateData.sequence !== undefined) {
      moduleUpdate.sequence = updateData.sequence;
    }

    if (updateData.configuration !== undefined) {
      // Merge with existing configuration
      const existingConfig = existingCourse.configuration || {};
      moduleUpdate.configuration = {
        ...existingConfig,
        ...updateData.configuration
      };
    }

    // Only update if there are changes
    if (Object.keys(moduleUpdate).length === 0) {
      return NextResponse.json(
        { error: "Bad Request", message: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Update the course
    const { data: updatedCourse, error: updateError } = await supabase
      .from("modules")
      .update(moduleUpdate)
      .eq("id", validCourseId)
      .select(`
        *,
        products(
          id,
          name,
          type,
          job_readiness_products(*)
        ),
        lessons(
          id,
          title,
          sequence
        )
      `)
      .single();

    if (updateError) {
      console.error("Error updating job readiness course:", updateError);
      return NextResponse.json(
        { error: "Server Error", message: "Error updating course", details: updateError },
        { status: 500 }
      );
    }

    // Format the response
    const product = updatedCourse.products;
    const jobReadinessConfig = product?.job_readiness_products?.[0] || null;
    const courseConfig = updatedCourse.configuration || {};
    
    const formattedCourse = {
      ...updatedCourse,
      lessons_count: updatedCourse.lessons?.length || 0,
      job_readiness_config: jobReadinessConfig,
      required_tier: courseConfig.required_tier || 'BRONZE',
      unlocks_at_star_level: courseConfig.unlocks_at_star_level || null,
      difficulty_level: courseConfig.difficulty_level || 'Beginner',
      estimated_duration_hours: courseConfig.estimated_duration_hours || null,
    };

    return NextResponse.json(formattedCourse);
  } catch (error) {
    console.error("Unexpected error in PATCH job readiness course:", error);
    return NextResponse.json(
      { error: "Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/job-readiness/courses/[courseId]
 * 
 * Deletes a specific Job Readiness course module.
 * Requires admin authentication.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    // Validate courseId
    const { courseId } = await context.params;
    const courseIdValidation = CourseIdSchema.safeParse(courseId);
    if (!courseIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid Course ID format', details: courseIdValidation.error.flatten().formErrors },
        { status: 400 }
      );
    }
    const validCourseId = courseIdValidation.data;

    // Create Supabase server client
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Fetch user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching user profile:", profileError);
      return NextResponse.json(
        { error: "Server Error", message: "Error fetching user profile" },
        { status: 500 }
      );
    }

    // Verify user is an Admin
    if (profile.role !== "Admin") {
      return NextResponse.json(
        { error: "Forbidden", message: "Admin role required" },
        { status: 403 }
      );
    }

    // Check if the course exists and is a Job Readiness course
    const { data: existingCourse, error: existingError } = await supabase
      .from("modules")
      .select(`
        id,
        name,
        products!inner(type)
      `)
      .eq('id', validCourseId)
      .eq('type', 'Course')
      .eq('products.type', 'JOB_READINESS')
      .single();

    if (existingError) {
      console.error("Error checking existing course:", existingError);
      if (existingError.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Not Found", message: "Job Readiness course not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Server Error", message: "Error checking course" },
        { status: 500 }
      );
    }

    // Check if course has student progress
    const { count: progressCount, error: progressError } = await supabase
      .from("student_module_progress")
      .select('id', { count: 'exact', head: true })
      .eq('module_id', validCourseId);

    if (progressError) {
      console.error("Error checking student progress:", progressError);
      return NextResponse.json(
        { error: "Server Error", message: "Error checking course usage" },
        { status: 500 }
      );
    }

    if (progressCount && progressCount > 0) {
      return NextResponse.json(
        { 
          error: "Conflict", 
          message: "Cannot delete course with existing student progress. Consider archiving instead." 
        },
        { status: 409 }
      );
    }

    // Delete the course (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from("modules")
      .delete()
      .eq("id", validCourseId);

    if (deleteError) {
      console.error("Error deleting job readiness course:", deleteError);
      return NextResponse.json(
        { error: "Server Error", message: "Error deleting course", details: deleteError },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Job Readiness course "${existingCourse.name}" deleted successfully` 
    });
  } catch (error) {
    console.error("Unexpected error in DELETE job readiness course:", error);
    return NextResponse.json(
      { error: "Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 
 