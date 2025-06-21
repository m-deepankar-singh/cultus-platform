import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { calculatePaginationRange, createPaginatedResponse } from "@/lib/pagination";
import { authenticateApiRequest } from "@/lib/auth/api-auth";

// Job Readiness Course schema for validation
const JobReadinessCourseSchema = z.object({
  name: z.string().min(3, { message: "Course name must be at least 3 characters long" }),
  product_id: z.string().uuid({ message: "Valid product ID is required" }),
  sequence: z.number().int().default(0),
  configuration: z.object({
    description: z.string().optional(),
    estimated_duration_hours: z.number().positive().optional(),
    difficulty_level: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Beginner'),
    prerequisites: z.array(z.string()).default([]),
    learning_objectives: z.array(z.string()).default([]),
    // Job readiness specific configuration
    required_tier: z.enum(['BRONZE', 'SILVER', 'GOLD']).default('BRONZE'),
    unlocks_at_star_level: z.enum(['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE']).optional(),
  }).default({}),
});

/**
 * GET /api/admin/job-readiness/courses
 * 
 * Retrieves all Job Readiness course modules with pagination support.
 * Requires admin authentication.
 */
export async function GET(request: NextRequest) {
  try {
    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequest(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, supabase } = authResult;

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

    const jobReadinessProductIds = jobReadinessProducts?.map((p: { id: string }) => p.id) || [];

    if (jobReadinessProductIds.length === 0) {
      // No Job Readiness products exist, return empty result
      const paginatedResponse = createPaginatedResponse([], 0, page, pageSize);
      return NextResponse.json(paginatedResponse);
    }

    // Get total count with filters (only Job Readiness course modules)
    let countQuery = supabase
      .from("modules")
      .select('id', { count: 'exact', head: true })
      .eq('type', 'Course')
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
      console.error("Error counting job readiness courses:", countError);
      return NextResponse.json(
        { error: "Server Error", message: "Error counting courses" },
        { status: 500 }
      );
    }
    
    // Build main data query for Job Readiness courses
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
        lessons(
          id,
          title,
          sequence
        )
      `)
      .eq('type', 'Course')
      .eq('products.type', 'JOB_READINESS');
    
    // Apply the same filters
    if (productId) {
      dataQuery = dataQuery.eq("product_id", productId);
    }
    
    if (search) {
      dataQuery = dataQuery.ilike('name', `%${search}%`);
    }
    
    // Execute query with pagination
    const { data: courses, error: coursesError } = await dataQuery
      .order("created_at", { ascending: false })
      .range(from, to);

    // Handle database error
    if (coursesError) {
      console.error("Error fetching job readiness courses:", coursesError);
      return NextResponse.json(
        { error: "Server Error", message: "Error fetching courses" },
        { status: 500 }
      );
    }

    // Format courses to have consistent structure with additional Job Readiness data  
    const formattedCourses = courses?.map((course: any) => {
      const product = course.products;
      const jobReadinessConfig = product?.job_readiness_products?.[0] || null;
      const courseConfig = course.configuration || {};
      
      return {
        ...course,
        products: product ? [product] : [],
        lessons_count: course.lessons?.length || 0,
        job_readiness_config: jobReadinessConfig,
        required_tier: courseConfig.required_tier || 'BRONZE',
        unlocks_at_star_level: courseConfig.unlocks_at_star_level || null,
        difficulty_level: courseConfig.difficulty_level || 'Beginner',
        estimated_duration_hours: courseConfig.estimated_duration_hours || null,
      };
    });

    // Return paginated response
    const paginatedResponse = createPaginatedResponse(
      formattedCourses || [],
      count || 0,
      page,
      pageSize
    );

    return NextResponse.json(paginatedResponse);
  } catch (error) {
    console.error("Unexpected error in GET job readiness courses:", error);
    return NextResponse.json(
      { error: "Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/job-readiness/courses
 * 
 * Creates a new Job Readiness course module.
 * Requires admin authentication.
 */
export async function POST(request: Request) {
  try {
    // Use standardized authentication check
    const authResult = await authenticateApiRequest(['Admin']);
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

    // Validate course data with schema
    const validation = JobReadinessCourseSchema.safeParse(body);
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

    const courseData = validation.data;

    // Verify the product is a Job Readiness product
    const { data: productData, error: productError } = await supabase
      .from("products")
      .select("id, name, type")
      .eq("id", courseData.product_id)
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
      name: courseData.name,
      type: "Course" as const,
      product_id: courseData.product_id,
      sequence: courseData.sequence,
      configuration: courseData.configuration,
      created_by: user.id
    };
    
    // Insert the new course module
    const { data: newCourse, error: insertError } = await supabase
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
      console.error("Error creating job readiness course:", insertError);
      return NextResponse.json(
        { error: "Server Error", message: "Error creating course", details: insertError },
        { status: 500 }
      );
    }

    // Format the response to include Job Readiness specific data
    const formattedCourse = {
      ...newCourse,
      lessons_count: 0, // New course starts with 0 lessons
      job_readiness_config: newCourse.products?.job_readiness_products?.[0] || null,
      required_tier: newCourse.configuration?.required_tier || 'BRONZE',
      unlocks_at_star_level: newCourse.configuration?.unlocks_at_star_level || null,
      difficulty_level: newCourse.configuration?.difficulty_level || 'Beginner',
    };

    // Return the created course
    return NextResponse.json(formattedCourse, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST job readiness course:", error);
    return NextResponse.json(
      { error: "Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 
 