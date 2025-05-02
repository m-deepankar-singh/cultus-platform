import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/modules
 * 
 * Retrieves all modules across all products.
 * Requires admin authentication.
 */
export async function GET(request: Request) {
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
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId');
    
    // Build query
    let query = supabase.from("modules").select("*, products(name)").order("created_at", { ascending: false });
    
    // Filter by product if productId is provided
    if (productId) {
      query = query.eq("product_id", productId);
    }
    
    // Execute query
    const { data: modules, error: modulesError } = await query;

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