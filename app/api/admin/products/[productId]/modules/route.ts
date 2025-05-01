import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ProductIdSchema } from "@/lib/schemas/product";
import { ModuleSchema } from "@/lib/schemas/module";

/**
 * GET /api/admin/products/[productId]/modules
 * 
 * Retrieves all modules associated with a specific product.
 * Requires admin authentication.
 */
export async function GET(
  request: Request,
  { params }: { params: { productId: string } }
) {
  try {
    // Create Supabase server client
    const supabase = await createClient();
    const paramsObj = await params;

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
  { params }: { params: { productId: string } }
) {
  try {
    // Create Supabase server client
    const supabase = await createClient();
    const paramsObj = await params;

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
