import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { calculatePaginationRange, createPaginatedResponse } from "@/lib/pagination";
import { authenticateApiRequestSecure } from '@/lib/auth/api-auth';

// Module schema for validation - updated to match actual database schema
const ModuleSchema = z.object({
  name: z.string().min(3, { message: "Module name must be at least 3 characters long" }),
  type: z.enum(["Course", "Assessment"], { message: "Module type must be 'Course' or 'Assessment'" }),
  product_id: z.string().uuid().optional(),
  product_ids: z.array(z.string().uuid()).optional(),
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
    const authResult = await authenticateApiRequestSecure(['Admin']);
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
    const includeAssignments = searchParams.get('include_assignments') === 'true';
    
    // Calculate range for pagination
    const { from, to } = calculatePaginationRange(page, pageSize);
    
    // First, get total count with filters
    let countQuery = supabase
      .from("modules")
      .select('id, module_product_assignments(product_id)', { count: 'exact', head: true });
    
    // Apply filters - use junction table for product filtering
    if (productId) {
      countQuery = countQuery
        .eq("module_product_assignments.product_id", productId)
        .not("module_product_assignments", "is", null);
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
    
    // Build main data query with conditional assignment data
    let selectFields = "*, products(id, name)";
    if (includeAssignments) {
      selectFields = `*, products(id, name), module_product_assignments(
        product_id,
        products(id, name, type)
      )`;
    }
    
    let dataQuery = supabase
      .from("modules")
      .select(selectFields);
    
    // Apply the same filters - use junction table for product filtering
    if (productId) {
      dataQuery = dataQuery
        .eq("module_product_assignments.product_id", productId)
        .not("module_product_assignments", "is", null);
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
      // For new many-to-many structure, extract products from assignments
      if (module.module_product_assignments) {
        const assignedProducts = module.module_product_assignments
          .map((assignment: any) => assignment.products)
          .filter((product: any) => product !== null);
        
        return {
          ...module,
          products: assignedProducts,
        };
      }
      
      // Fallback for backward compatibility
      if (module.products) {
        return {
          ...module,
          products: [module.products],
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
    const authResult = await authenticateApiRequestSecure(['Admin']);
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

    // Handle product assignment using new product_ids array
    let productIdsToAssign: string[] = [];
    if (moduleData.product_ids && Array.isArray(moduleData.product_ids)) {
      productIdsToAssign = moduleData.product_ids;
    } else {
      // Default to "Unassigned Modules Repository" if no products specified
      productIdsToAssign = ["3f9a1ea0-5942-4ef1-bdb6-183d5add4b52"];
    }

    // Validate all product IDs
    if (productIdsToAssign.length > 0) {
      const { data: products, error: productError } = await supabase
        .from("products")
        .select("id")
        .in("id", productIdsToAssign);

      if (productError || !products || products.length !== productIdsToAssign.length) {
        return NextResponse.json(
          { error: "Bad Request", message: "One or more invalid product IDs" },
          { status: 400 }
        );
      }
    }

    // Extract configuration and other fields (exclude product_ids from module record)
    const { product_ids, ...moduleFields } = moduleData;

    // Create the module record
    const { data: module, error: moduleError } = await supabase
      .from("modules")
      .insert({
        ...moduleFields,
        created_by: user.id
      })
      .select()
      .single();

    if (moduleError) {
      console.error("Error creating module:", moduleError);
      return NextResponse.json(
        { error: "Server Error", message: "Error creating module" },
        { status: 500 }
      );
    }

    // Create product assignments
    if (productIdsToAssign.length > 0) {
      const productAssignments = productIdsToAssign.map((productId: string) => ({
        module_id: module.id,
        product_id: productId
      }));

      const { error: assignmentError } = await supabase
        .from('module_product_assignments')
        .insert(productAssignments);

      if (assignmentError) {
        console.error('Error creating product assignments:', assignmentError);
        
        // Clean up module record if assignment fails
        await supabase
          .from('modules')
          .delete()
          .eq('id', module.id);
        
        return NextResponse.json(
          { error: 'Server Error', message: 'Failed to create product assignments' },
          { status: 500 }
        );
      }
    }

    // Get the created module with its product assignments
    const { data: moduleWithProducts, error: fetchError } = await supabase
      .from('modules')
      .select(`
        *,
        module_product_assignments (
          product_id,
          products (
            id,
            name,
            type
          )
        )
      `)
      .eq('id', module.id)
      .single();

    if (fetchError) {
      console.error('Error fetching created module:', fetchError);
      return NextResponse.json(module); // Fallback to basic module data
    }

    return NextResponse.json(moduleWithProducts, { status: 201 });

  } catch (error) {
    console.error("Unexpected error in POST modules:", error);
    return NextResponse.json(
      { error: "Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 