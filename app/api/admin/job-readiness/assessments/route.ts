import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { calculatePaginationRange, createPaginatedResponse } from "@/lib/pagination";

// Job Readiness Assessment schema for validation
const JobReadinessAssessmentSchema = z.object({
  name: z.string().min(3, { message: "Assessment name must be at least 3 characters long" }),
  product_id: z.string().uuid({ message: "Valid product ID is required" }),
  sequence: z.number().int().default(0),
  configuration: z.object({
    instructions: z.string().optional(),
    timeLimitMinutes: z.number().int().positive().optional(),
    passThreshold: z.number().int().min(0).max(100).default(60),
    retakesAllowed: z.boolean().default(true),
    // Job readiness specific configuration
    isTierDeterminingAssessment: z.boolean().default(true),
    assessmentType: z.enum(['initial_tier', 'skill_specific', 'promotion']).default('initial_tier'),
  }).default({}),
});

/**
 * GET /api/admin/job-readiness/assessments
 * 
 * Retrieves all Job Readiness assessment modules with pagination support.
 * Requires admin authentication.
 */
export async function GET(request: NextRequest) {
  try {
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    
    // Calculate range for pagination
    const { from, to } = calculatePaginationRange(page, pageSize);
    
    // First, get Job Readiness product IDs
    const { data: jobReadinessProducts, error: productsError } = await supabase
      .from('products')
      .select('id')
      .eq('type', 'JOB_READINESS');

    if (productsError) {
      console.error("Error fetching Job Readiness products:", productsError);
      return NextResponse.json(
        { error: "Server Error", message: "Error fetching Job Readiness products" },
        { status: 500 }
      );
    }

    const jobReadinessProductIds = jobReadinessProducts?.map(p => p.id) || [];

    if (jobReadinessProductIds.length === 0) {
      // No Job Readiness products exist, return empty result
      const paginatedResponse = createPaginatedResponse([], 0, page, pageSize);
      return NextResponse.json(paginatedResponse);
    }

    // Get total count with filters (only Job Readiness assessment modules)
    let countQuery = supabase
      .from("modules")
      .select('id', { count: 'exact', head: true })
      .eq('type', 'Assessment')
      .in('product_id', jobReadinessProductIds);
    
    // Apply filters
    if (productId) {
      countQuery = countQuery.eq("product_id", productId);
    }
    
    if (search) {
      countQuery = countQuery.ilike('name', `%${search}%`);
    }
    
    const { count, error: countError } = await countQuery;
    
    if (countError) {
      console.error("Error counting job readiness assessments:", countError);
      return NextResponse.json(
        { error: "Server Error", message: "Error counting assessments" },
        { status: 500 }
      );
    }
    
    // Build main data query for Job Readiness assessments
    let dataQuery = supabase
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
          sequence
        )
      `)
      .eq('type', 'Assessment')
      .eq('products.type', 'JOB_READINESS');
    
    // Apply the same filters
    if (productId) {
      dataQuery = dataQuery.eq("product_id", productId);
    }
    
    if (search) {
      dataQuery = dataQuery.ilike('name', `%${search}%`);
    }
    
    // Execute query with pagination
    const { data: assessments, error: assessmentsError } = await dataQuery
      .order("created_at", { ascending: false })
      .range(from, to);

    // Handle database error
    if (assessmentsError) {
      console.error("Error fetching job readiness assessments:", assessmentsError);
      return NextResponse.json(
        { error: "Server Error", message: "Error fetching assessments" },
        { status: 500 }
      );
    }

    // Format assessments to have consistent structure with additional Job Readiness data
    const formattedAssessments = assessments?.map(assessment => {
      const product = assessment.products;
      const jobReadinessConfig = product?.job_readiness_products?.[0] || null;
      
      return {
        ...assessment,
        products: product ? [product] : [],
        question_count: assessment.assessment_module_questions?.length || 0,
        job_readiness_config: jobReadinessConfig,
        is_tier_determining: assessment.configuration?.isTierDeterminingAssessment || true,
        assessment_type: assessment.configuration?.assessmentType || 'initial_tier',
      };
    });

    // Return paginated response
    const paginatedResponse = createPaginatedResponse(
      formattedAssessments || [],
      count || 0,
      page,
      pageSize
    );

    return NextResponse.json(paginatedResponse);
  } catch (error) {
    console.error("Unexpected error in GET job readiness assessments:", error);
    return NextResponse.json(
      { error: "Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/job-readiness/assessments
 * 
 * Creates a new Job Readiness assessment module.
 * Requires admin authentication.
 */
export async function POST(request: Request) {
  try {
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

    // Strictly verify user is an Admin
    if (profile.role !== "Admin") {
      console.warn(`Unauthorized assessment creation attempt by ${user.id} with role ${profile.role}`);
      return NextResponse.json(
        { error: "Forbidden", message: "Only administrators can create Job Readiness assessments" },
        { status: 403 }
      );
    }

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

    // Validate assessment data with schema
    const validation = JobReadinessAssessmentSchema.safeParse(body);
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

    const assessmentData = validation.data;

    // Verify the product is a Job Readiness product
    const { data: productData, error: productError } = await supabase
      .from("products")
      .select("id, name, type")
      .eq("id", assessmentData.product_id)
      .eq("type", "JOB_READINESS")
      .single();

    if (productError || !productData) {
      return NextResponse.json(
        { error: "Bad Request", message: "Invalid Job Readiness product ID" },
        { status: 400 }
      );
    }

    // Set the created_by field to the current user
    const moduleData = {
      name: assessmentData.name,
      type: "Assessment" as const,
      product_id: assessmentData.product_id,
      sequence: assessmentData.sequence,
      configuration: assessmentData.configuration,
      created_by: user.id
    };
    
    // Insert the new assessment module
    const { data: newAssessment, error: insertError } = await supabase
      .from("modules")
      .insert(moduleData)
      .select(`
        *,
        products(
          id,
          name,
          type,
          job_readiness_products(*)
        )
      `)
      .single();

    if (insertError) {
      console.error("Error creating job readiness assessment:", insertError);
      return NextResponse.json(
        { error: "Server Error", message: "Error creating assessment", details: insertError },
        { status: 500 }
      );
    }

    // Format the response to include Job Readiness specific data
    const formattedAssessment = {
      ...newAssessment,
      question_count: 0, // New assessment starts with 0 questions
      job_readiness_config: newAssessment.products?.job_readiness_products?.[0] || null,
      is_tier_determining: newAssessment.configuration?.isTierDeterminingAssessment || true,
      assessment_type: newAssessment.configuration?.assessmentType || 'initial_tier',
    };

    // Return the created assessment
    return NextResponse.json(formattedAssessment, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST job readiness assessment:", error);
    return NextResponse.json(
      { error: "Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 