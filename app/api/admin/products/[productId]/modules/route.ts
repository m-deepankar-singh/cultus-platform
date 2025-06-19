import { NextResponse } from "next/server";
import { ProductIdSchema } from "@/lib/schemas/product";
import { ModuleSchema } from "@/lib/schemas/module";
import { authenticateApiRequest } from '@/lib/auth/api-auth';

/**
 * GET /api/admin/products/[productId]/modules
 * 
 * Retrieves all modules associated with a specific product.
 * Accessible by both Admin and Staff roles.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['Admin', 'Staff']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { supabase } = authResult;

    const paramsObj = await params;

    // Validate productId parameter
    const productIdValidation = ProductIdSchema.safeParse({ productId: paramsObj.productId });
    if (!productIdValidation.success) {
      return NextResponse.json(
        { 
          error: "Bad Request", 
          message: "Invalid product ID format",
          details: productIdValidation.error.format() 
        },
        { status: 400 }
      );
    }

    // Fetch modules for the product
    const { data: modules, error: modulesError } = await supabase
      .from("modules")
      .select("*")
      .eq("product_id", paramsObj.productId)
      .order("created_at", { ascending: true });

    // Handle database error
    if (modulesError) {
      console.error("Error fetching modules:", modulesError);
      return NextResponse.json(
        { error: "Server Error", message: "Error fetching modules" },
        { status: 500 }
      );
    }

    // Return the list of modules
    return NextResponse.json(modules);
  } catch (error) {
    console.error("Unexpected error in GET modules:", error);
    return NextResponse.json(
      { error: "Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/products/[productId]/modules
 * 
 * Creates a new module associated with a specific product.
 * Requires admin authentication.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { supabase } = authResult;

    const paramsObj = await params;

    // Validate productId parameter
    const productIdValidation = ProductIdSchema.safeParse({ productId: paramsObj.productId });
    if (!productIdValidation.success) {
      return NextResponse.json(
        { 
          error: "Bad Request", 
          message: "Invalid product ID format",
          details: productIdValidation.error.format() 
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Inject productId from route parameter
    const moduleData = { ...body, product_id: paramsObj.productId };
    
    // Validate module data with Zod schema
    const moduleValidation = ModuleSchema.safeParse(moduleData);
    if (!moduleValidation.success) {
      return NextResponse.json(
        { 
          error: "Bad Request", 
          message: "Invalid module data",
          details: moduleValidation.error.format() 
        },
        { status: 400 }
      );
    }
    
    // Extract validated data
    const validatedModuleData = moduleValidation.data;

    // Insert new module into database
    const { data: newModule, error: createError } = await supabase
      .from("modules")
      .insert(validatedModuleData)
      .select()
      .single();

    // Handle database error
    if (createError) {
      console.error("Error creating module:", createError);
      return NextResponse.json(
        { error: "Server Error", message: "Error creating module" },
        { status: 500 }
      );
    }

    // Return the newly created module data
    return NextResponse.json(newModule, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST module:", error);
    return NextResponse.json(
      { error: "Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
