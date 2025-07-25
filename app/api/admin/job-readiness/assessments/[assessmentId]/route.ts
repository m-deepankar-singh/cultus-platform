import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { authenticateApiRequestUltraFast } from "@/lib/auth/api-auth";

// Schema for updating Job Readiness assessments
const UpdateJobReadinessAssessmentSchema = z.object({
  name: z.string().min(3, { message: "Assessment name must be at least 3 characters long" }).optional(),
  sequence: z.number().int().optional(),
  configuration: z.object({
    instructions: z.string().optional(),
    timeLimitMinutes: z.number().int().positive().optional(),
    passThreshold: z.number().int().min(0).max(100).optional(),
    retakesAllowed: z.boolean().optional(),
    isTierDeterminingAssessment: z.boolean().optional(),
    assessmentType: z.enum(['initial_tier', 'skill_specific', 'promotion']).optional(),
  }).optional(),
});

const AssessmentIdSchema = z.string().uuid({ message: 'Invalid Assessment ID format' });

/**
 * GET /api/admin/job-readiness/assessments/[assessmentId]
 * 
 * Retrieves a specific Job Readiness assessment module by ID.
 * Requires admin authentication.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ assessmentId: string }> }
) {
  try {
    // Validate assessmentId
    const { assessmentId } = await context.params;
    const assessmentIdValidation = AssessmentIdSchema.safeParse(assessmentId);
    if (!assessmentIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid Assessment ID format', details: assessmentIdValidation.error.flatten().formErrors },
        { status: 400 }
      );
    }
    const validAssessmentId = assessmentIdValidation.data;

    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequestUltraFast(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;

    // Fetch the Job Readiness assessment
    const { data: assessment, error: assessmentError } = await supabase
      .from("modules")
      .select(`
        *,
        products!inner(
          id, 
          name, 
          type,
          job_readiness_products(*)
        ),
        assessment_module_questions(
          question_id,
          sequence,
          assessment_questions(
            id,
            question_text,
            question_type,
            options,
            correct_answers
          )
        )
      `)
      .eq('id', validAssessmentId)
      .eq('type', 'Assessment')
      .eq('products.type', 'JOB_READINESS')
      .single();

    if (assessmentError) {
      console.error("Error fetching job readiness assessment:", assessmentError);
      if (assessmentError.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Not Found", message: "Job Readiness assessment not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Server Error", message: "Error fetching assessment" },
        { status: 500 }
      );
    }

    // Format the assessment with Job Readiness specific data
    const product = assessment.products;
    const jobReadinessConfig = product?.job_readiness_products?.[0] || null;
    
    const formattedAssessment = {
      ...assessment,
      products: product ? [product] : [],
      questions: assessment.assessment_module_questions?.map((q: any) => q.assessment_questions).filter(Boolean) || [],
      question_count: assessment.assessment_module_questions?.length || 0,
      job_readiness_config: jobReadinessConfig,
      is_tier_determining: assessment.configuration?.isTierDeterminingAssessment || true,
      assessment_type: assessment.configuration?.assessmentType || 'initial_tier',
    };

    return NextResponse.json(formattedAssessment);
  } catch (error) {
    console.error("Unexpected error in GET job readiness assessment:", error);
    return NextResponse.json(
      { error: "Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/job-readiness/assessments/[assessmentId]
 * 
 * Updates a specific Job Readiness assessment module.
 * Requires admin authentication.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ assessmentId: string }> }
) {
  try {
    // Validate assessmentId
    const { assessmentId } = await context.params;
    const assessmentIdValidation = AssessmentIdSchema.safeParse(assessmentId);
    if (!assessmentIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid Assessment ID format', details: assessmentIdValidation.error.flatten().formErrors },
        { status: 400 }
      );
    }
    const validAssessmentId = assessmentIdValidation.data;

    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequestUltraFast(['Admin']);
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

    const validation = UpdateJobReadinessAssessmentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: "Bad Request", 
          message: "Invalid assessment data",
          details: validation.error.format() 
        },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Check if the assessment exists and is a Job Readiness assessment
    const { data: existingAssessment, error: existingError } = await supabase
      .from("modules")
      .select(`
        id,
        product_id,
        configuration,
        products!inner(type)
      `)
      .eq('id', validAssessmentId)
      .eq('type', 'Assessment')
      .eq('products.type', 'JOB_READINESS')
      .single();

    if (existingError) {
      console.error("Error checking existing assessment:", existingError);
      if (existingError.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Not Found", message: "Job Readiness assessment not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Server Error", message: "Error checking assessment" },
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
      const existingConfig = existingAssessment.configuration || {};
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

    // Update the assessment
    const { data: updatedAssessment, error: updateError } = await supabase
      .from("modules")
      .update(moduleUpdate)
      .eq("id", validAssessmentId)
      .select(`
        *,
        products(
          id,
          name,
          type,
          job_readiness_products(*)
        ),
        assessment_module_questions(
          question_id,
          sequence
        )
      `)
      .single();

    if (updateError) {
      console.error("Error updating job readiness assessment:", updateError);
      return NextResponse.json(
        { error: "Server Error", message: "Error updating assessment", details: updateError },
        { status: 500 }
      );
    }

    // Format the response
    const product = updatedAssessment.products;
    const jobReadinessConfig = product?.job_readiness_products?.[0] || null;
    
    const formattedAssessment = {
      ...updatedAssessment,
      question_count: updatedAssessment.assessment_module_questions?.length || 0,
      job_readiness_config: jobReadinessConfig,
      is_tier_determining: updatedAssessment.configuration?.isTierDeterminingAssessment || true,
      assessment_type: updatedAssessment.configuration?.assessmentType || 'initial_tier',
    };

    return NextResponse.json(formattedAssessment);
  } catch (error) {
    console.error("Unexpected error in PATCH job readiness assessment:", error);
    return NextResponse.json(
      { error: "Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/job-readiness/assessments/[assessmentId]
 * 
 * Deletes a specific Job Readiness assessment module.
 * Requires admin authentication.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ assessmentId: string }> }
) {
  try {
    // Validate assessmentId
    const { assessmentId } = await context.params;
    const assessmentIdValidation = AssessmentIdSchema.safeParse(assessmentId);
    if (!assessmentIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid Assessment ID format', details: assessmentIdValidation.error.flatten().formErrors },
        { status: 400 }
      );
    }
    const validAssessmentId = assessmentIdValidation.data;

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

    // Check if the assessment exists and is a Job Readiness assessment
    const { data: existingAssessment, error: existingError } = await supabase
      .from("modules")
      .select(`
        id,
        name,
        products!inner(type)
      `)
      .eq('id', validAssessmentId)
      .eq('type', 'Assessment')
      .eq('products.type', 'JOB_READINESS')
      .single();

    if (existingError) {
      console.error("Error checking existing assessment:", existingError);
      if (existingError.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Not Found", message: "Job Readiness assessment not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Server Error", message: "Error checking assessment" },
        { status: 500 }
      );
    }

    // Check if assessment has student progress (submissions)
    const { count: progressCount, error: progressError } = await supabase
      .from("student_module_progress")
      .select('id', { count: 'exact', head: true })
      .eq('module_id', validAssessmentId);

    if (progressError) {
      console.error("Error checking student progress:", progressError);
      return NextResponse.json(
        { error: "Server Error", message: "Error checking assessment usage" },
        { status: 500 }
      );
    }

    if (progressCount && progressCount > 0) {
      return NextResponse.json(
        { 
          error: "Conflict", 
          message: "Cannot delete assessment with existing student submissions. Consider archiving instead." 
        },
        { status: 409 }
      );
    }

    // Delete the assessment (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from("modules")
      .delete()
      .eq("id", validAssessmentId);

    if (deleteError) {
      console.error("Error deleting job readiness assessment:", deleteError);
      return NextResponse.json(
        { error: "Server Error", message: "Error deleting assessment", details: deleteError },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Job Readiness assessment "${existingAssessment.name}" deleted successfully` 
    });
  } catch (error) {
    console.error("Unexpected error in DELETE job readiness assessment:", error);
    return NextResponse.json(
      { error: "Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 
 