import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { calculatePaginationRange, createPaginatedResponse } from "@/lib/pagination";

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
    const formattedModules = modules?.map(module => {
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

    // Strictly verify user is an Admin - Staff cannot create modules
    if (profile.role !== "Admin") {
      console.warn(`Unauthorized module creation attempt by ${user.id} with role ${profile.role}`);
      return NextResponse.json(
        { error: "Forbidden", message: "Only administrators can create modules" },
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

    // Get the description from the request but don't include it in the database insert
    const { description, ...restOfBody } = body;
    
    // If no product_id is provided, use a default "unassigned" product
    if (!restOfBody.product_id) {
      // This should be a valid UUID for an "unassigned" or "repository" product
      // For now, we'll use a placeholder - you should replace this with a real UUID
      restOfBody.product_id = "3f9a1ea0-5942-4ef1-bdb6-183d5add4b52";
    }
    
    // Add sequence if not provided
    if (restOfBody.sequence === undefined) {
      restOfBody.sequence = 0;
    }
    
    // Store description in configuration if it exists
    if (description) {
      if (!restOfBody.configuration) {
        restOfBody.configuration = {};
      }
      restOfBody.configuration.description = description;
    }

    // Validate module data with schema
    const validation = ModuleSchema.safeParse(restOfBody);
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

    // Set the created_by field to the current user
    const moduleData = {
      ...validation.data,
      created_by: user.id
    };
    
    // Insert the new module
    const { data: newModule, error: insertError } = await supabase
      .from("modules")
      .insert(moduleData)
      .select()
      .single();

    if (insertError) {
      console.error("Error creating module:", insertError);
      return NextResponse.json(
        { error: "Server Error", message: "Error creating module", details: insertError },
        { status: 500 }
      );
    }

    // Return the created module
    return NextResponse.json(newModule, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST module:", error);
    return NextResponse.json(
      { error: "Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 