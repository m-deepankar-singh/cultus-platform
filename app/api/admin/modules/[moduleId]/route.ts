import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ModuleIdSchema, UpdateModuleSchema } from '@/lib/schemas/module';
import { ModuleSchema } from "@/lib/schemas/module";
import { z } from "zod";
import { authenticateApiRequestSecure } from '@/lib/auth/api-auth';

/**
 * GET /api/admin/modules/[moduleId]
 * 
 * Retrieves a specific module by ID.
 * Requires admin authentication.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequestSecure(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    const paramsObj = await params;

    const moduleIdValidation = ModuleIdSchema.safeParse({ moduleId: paramsObj.moduleId });
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid module ID format', details: moduleIdValidation.error.format() }, 
        { status: 400 }
      );
    }

    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .select('*, products(name)')
      .eq('id', paramsObj.moduleId)
      .single();

    if (moduleError) {
      if (moduleError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Not Found', message: 'Module not found' }, { status: 404 });
      } else {
        console.error('Error fetching module:', moduleError);
        return NextResponse.json({ error: 'Server Error', message: 'Error fetching module' }, { status: 500 });
      }
    }

    return NextResponse.json(module);

  } catch (error) {
    console.error('Unexpected error in GET module:', error);
    return NextResponse.json({ error: 'Server Error', message: 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/modules/[moduleId]
 * 
 * Updates a specific module by ID.
 * Requires admin authentication.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequestSecure(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    const paramsObj = await params;

    const moduleIdValidation = ModuleIdSchema.safeParse({ moduleId: paramsObj.moduleId });
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid module ID format', details: moduleIdValidation.error.format() }, 
        { status: 400 }
      );
    }

    const body = await request.json();
    
    const { data: existingModule, error: checkError } = await supabase
      .from("modules")
      .select("id")
      .eq("id", paramsObj.moduleId)
      .single();
      
    if (checkError) {
      if (checkError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Not Found", message: "Module not found" },
          { status: 404 }
        );
      }
      
      console.error("Error checking module existence:", checkError);
      return NextResponse.json(
        { error: "Server Error", message: "Error checking if module exists" },
        { status: 500 }
      );
    }
    
    // Handle product assignment updates separately from other module fields
    const { product_ids, product_id, ...moduleFields } = body;
    
    // Determine product IDs to assign
    let productIdsToAssign: string[] = [];
    if (product_ids) {
      // New many-to-many format
      productIdsToAssign = Array.isArray(product_ids) ? product_ids : [];
    } else if (product_id) {
      // Legacy single product format - convert to array
      productIdsToAssign = [product_id];
    }

    // Validate product IDs if provided
    if (productIdsToAssign.length > 0) {
      const { data: products, error: productError } = await supabase
        .from('products')
        .select('id')
        .in('id', productIdsToAssign);

      if (productError || !products || products.length !== productIdsToAssign.length) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'One or more invalid product IDs' },
          { status: 400 }
        );
      }
    }

    // Update module fields if provided (excluding product assignments)
    if (Object.keys(moduleFields).length > 0) {
      const moduleValidation = ModuleSchema.partial().safeParse(moduleFields);
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

      const { data: updatedModule, error: updateError } = await supabase
        .from("modules")
        .update({
          ...moduleValidation.data,
          updated_at: new Date().toISOString()
        })
        .eq("id", paramsObj.moduleId)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating module:", updateError);
        return NextResponse.json(
          { error: "Server Error", message: "Error updating module" },
          { status: 500 }
        );
      }
    }

    // Update product assignments if product IDs were provided
    if (productIdsToAssign.length >= 0) { // Allow empty array to clear all assignments
      // Get current assignments
      const { data: currentAssignments, error: currentError } = await supabase
        .from('module_product_assignments')
        .select('product_id')
        .eq('module_id', paramsObj.moduleId);

      if (currentError) {
        console.error('Error fetching current assignments:', currentError);
        return NextResponse.json(
          { error: 'Server Error', message: 'Failed to fetch current product assignments' },
          { status: 500 }
        );
      }

      const currentProductIds = currentAssignments?.map((a: any) => a.product_id) || [];
      
      // Calculate differences
      const toRemove = currentProductIds.filter((pid: string) => !productIdsToAssign.includes(pid));
      const toAdd = productIdsToAssign.filter(productId => !currentProductIds.includes(productId));

      // Remove old assignments
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('module_product_assignments')
          .delete()
          .eq('module_id', paramsObj.moduleId)
          .in('product_id', toRemove);

        if (removeError) {
          console.error('Error removing product assignments:', removeError);
          return NextResponse.json(
            { error: 'Server Error', message: 'Failed to remove old product assignments' },
            { status: 500 }
          );
        }
      }

      // Add new assignments
      if (toAdd.length > 0) {
        const newAssignments = toAdd.map(productId => ({
          module_id: paramsObj.moduleId,
          product_id: productId
        }));

        const { error: addError } = await supabase
          .from('module_product_assignments')
          .insert(newAssignments);

        if (addError) {
          console.error('Error adding product assignments:', addError);
          return NextResponse.json(
            { error: 'Server Error', message: 'Failed to add new product assignments' },
            { status: 500 }
          );
        }
      }
    }

    // Get the updated module with its product assignments
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
      .eq('id', paramsObj.moduleId)
      .single();

    if (fetchError) {
      console.error('Error fetching updated module:', fetchError);
      return NextResponse.json(
        { error: 'Server Error', message: 'Error fetching updated module' },
        { status: 500 }
      );
    }

    return NextResponse.json(moduleWithProducts);

  } catch (error) {
    console.error("Unexpected error in PUT module:", error);
    return NextResponse.json(
      { error: "Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/modules/[moduleId]
 * 
 * Updates specific fields of a module by ID.
 * Requires admin authentication.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequestSecure(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    const paramsObj = await params;

    const moduleIdValidation = ModuleIdSchema.safeParse({ moduleId: paramsObj.moduleId });
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid module ID format', details: moduleIdValidation.error.format() }, 
        { status: 400 }
      );
    }

    const body = await request.json();
    
    const { data: existingModule, error: checkError } = await supabase
      .from("modules")
      .select("id")
      .eq("id", paramsObj.moduleId)
      .single();
      
    if (checkError) {
      if (checkError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Not Found", message: "Module not found" },
          { status: 404 }
        );
      }
      
      console.error("Error checking module existence:", checkError);
      return NextResponse.json(
        { error: "Server Error", message: "Error checking if module exists" },
        { status: 500 }
      );
    }
    
    const updateValidation = UpdateModuleSchema.safeParse(body);
    if (!updateValidation.success) {
      return NextResponse.json(
        { 
          error: "Bad Request", 
          message: "Invalid update data",
          details: updateValidation.error.format() 
        },
        { status: 400 }
      );
    }

    const validatedUpdateData = updateValidation.data;

    const { data: updatedModule, error: updateError } = await supabase
      .from("modules")
      .update({
        ...validatedUpdateData,
        updated_at: new Date().toISOString()
      })
      .eq("id", paramsObj.moduleId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating module:", updateError);
      return NextResponse.json(
        { error: "Server Error", message: "Error updating module" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedModule);

  } catch (error) {
    console.error("Unexpected error in PATCH module:", error);
    return NextResponse.json(
      { error: "Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/modules/[moduleId]
 * 
 * Deletes a specific module by ID.
 * Requires admin authentication.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequestSecure(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    const paramsObj = await params;

    const moduleIdValidation = ModuleIdSchema.safeParse({ moduleId: paramsObj.moduleId });
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid module ID format', details: moduleIdValidation.error.format() }, 
        { status: 400 }
      );
    }

    // Check if module exists
    const { data: existingModule, error: checkError } = await supabase
      .from("modules")
      .select("id")
      .eq("id", paramsObj.moduleId)
      .single();
      
    if (checkError) {
      if (checkError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Not Found", message: "Module not found" },
          { status: 404 }
        );
      }
      
      console.error("Error checking module existence:", checkError);
      return NextResponse.json(
        { error: "Server Error", message: "Error checking if module exists" },
        { status: 500 }
      );
    }

    // Delete the module
    const { error: deleteError } = await supabase
      .from("modules")
      .delete()
      .eq("id", paramsObj.moduleId);

    if (deleteError) {
      console.error("Error deleting module:", deleteError);
      return NextResponse.json(
        { error: "Server Error", message: "Error deleting module" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Module deleted successfully" });

  } catch (error) {
    console.error("Unexpected error in DELETE module:", error);
    return NextResponse.json(
      { error: "Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
