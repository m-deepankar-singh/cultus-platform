import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { calculatePaginationRange, createPaginatedResponse } from "@/lib/pagination";
import { authenticateApiRequest } from '@/lib/auth/api-auth';

// Module schema for validation - updated to match actual database schema
const ModuleSchema = z.object({
  name: z.string().min(3, { message: "Module name must be at least 3 characters long" }),
  type: z.enum(["Course", "Assessment"], { message: "Module type must be 'Course' or 'Assessment'" }),
  product_id: z.string().uuid().optional(),
  sequence: z.number().int().default(0),
  configuration: z.record(z.any()).default({}),
  // description field is not in the actual database schema, so we'll remove it
});

/**
 * GET /api/admin/modules
 * 
 * Retrieves all modules across all products with pagination support.
 * Requires admin authentication.
 */
export async function GET(request: NextRequest) {
  try {
    // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const moduleType = searchParams.get('type');
    
    // Calculate range for pagination
    const { from, to } = calculatePaginationRange(page, pageSize);
    
    // First, get total count with filters
    let countQuery = supabase
      .from("modules")
      .select('id', { count: 'exact', head: true });
    
    // Apply filters
    if (productId) {
      countQuery = countQuery.eq("product_id", productId);
    }
    
    if (search) {
      countQuery = countQuery.ilike('name', `%${search}%`);
    }
    
    if (moduleType) {
      countQuery = countQuery.eq('type', moduleType);
    }
    
    const { count, error: countError } = await countQuery;
    
    if (countError) {
      console.error("Error counting modules:", countError);
      return NextResponse.json(
        { error: "Server Error", message: "Error counting modules" },
        { status: 500 }
      );
    }
    
    // Build main data query
    let dataQuery = supabase
      .from("modules")
      .select("*, products(id, name)");
    
    // Apply the same filters
    if (productId) {
      dataQuery = dataQuery.eq("product_id", productId);
    }
    
    if (search) {
      dataQuery = dataQuery.ilike('name', `%${search}%`);
    }
    
    if (moduleType) {
      dataQuery = dataQuery.eq('type', moduleType);
    }
    
    // Execute query with pagination
    const { data: modules, error: modulesError } = await dataQuery
      .order("created_at", { ascending: false })
      .range(from, to);

    // Handle database error
    if (modulesError) {
      console.error("Error fetching modules:", modulesError);
      return NextResponse.json(
        { error: "Server Error", message: "Error fetching modules" },
        { status: 500 }
      );
    }

    // Format modules to have a consistent "products" array (needed for the ModulesTable component)
    const formattedModules = modules?.map((module: any) => {
      // Transform products relation into an array
      if (module.products) {
        return {
          ...module,
          products: module.product_id ? [module.products] : [],
        };
      }
      return {
        ...module,
        products: [],
      };
    });

    // Return paginated response
    const paginatedResponse = createPaginatedResponse(
      formattedModules || [],
      count || 0,
      page,
      pageSize
    );

    return NextResponse.json(paginatedResponse);
  } catch (error) {
    console.error("Unexpected error in GET modules:", error);
    return NextResponse.json(
      { error: "Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/modules
 * 
 * Creates a new module.
 * Requires admin authentication.
 */
export async function POST(request: Request) {
  try {
    // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    // Parse request body
    const body = await request.json();

    // Validate request body against schema
    const validation = ModuleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: "Bad Request", 
          message: "Invalid module data",
          details: validation.error.format() 
        },
        { status: 400 }
      );
    }

    const moduleData = validation.data;

    // If product_id is provided, verify it exists
    if (moduleData.product_id) {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id")
        .eq("id", moduleData.product_id)
        .single();

      if (productError || !product) {
        return NextResponse.json(
          { error: "Bad Request", message: "Product not found" },
          { status: 400 }
        );
      }
    }

    // Create the module
    const { data: newModule, error: createError } = await supabase
      .from("modules")
      .insert(moduleData)
      .select()
      .single();

    if (createError) {
      console.error("Error creating module:", createError);
      return NextResponse.json(
        { error: "Server Error", message: "Error creating module" },
        { status: 500 }
      );
    }

    return NextResponse.json(newModule, { status: 201 });

  } catch (error) {
    console.error("Unexpected error in POST modules:", error);
    return NextResponse.json(
      { error: "Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 