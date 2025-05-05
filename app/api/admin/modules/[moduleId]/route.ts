import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ModuleIdSchema, UpdateModuleSchema } from '@/lib/schemas/module';
import { ModuleSchema } from "@/lib/schemas/module";
import { z } from "zod";

/**
 * GET /api/admin/modules/[moduleId]
 * 
 * Retrieves a specific module by ID.
 * Requires admin authentication.
 */
export async function GET(
  request: Request,
  { params }: { params: { moduleId: string } }
) {
  try {
    const supabase = await createClient();
    const paramsObj = await params;
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ error: 'Server Error', message: 'Error fetching user profile' }, { status: 500 });
    }
    if (profile.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden', message: 'Admin role required' }, { status: 403 });
    }

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
  { params }: { params: { moduleId: string } }
) {
  try {
    const supabase = await createClient();
    const paramsObj = await params;
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ error: 'Server Error', message: 'Error fetching user profile' }, { status: 500 });
    }
    if (profile.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden', message: 'Admin role required' }, { status: 403 });
    }

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
    
    const moduleValidation = ModuleSchema.partial().safeParse(body);
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

    const validatedModuleData = moduleValidation.data;

    const { data: updatedModule, error: updateError } = await supabase
      .from("modules")
      .update({
        ...validatedModuleData,
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
  { params }: { params: { moduleId: string } }
) {
  try {
    const supabase = await createClient();
    const paramsObj = await params;
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ error: 'Server Error', message: 'Error fetching user profile' }, { status: 500 });
    }
    if (profile.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden', message: 'Admin role required' }, { status: 403 });
    }

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
    
    const moduleValidation = ModuleSchema.partial().safeParse(body);
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

    const validatedModuleData = moduleValidation.data;

    const { data: updatedModule, error: updateError } = await supabase
      .from("modules")
      .update({
        ...validatedModuleData,
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
  { params }: { params: { moduleId: string } }
) {
  try {
    const supabase = await createClient();
    const paramsObj = await params;
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ error: 'Server Error', message: 'Error fetching user profile' }, { status: 500 });
    }
    if (profile.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden', message: 'Admin role required' }, { status: 403 });
    }

    const moduleIdValidation = ModuleIdSchema.safeParse({ moduleId: paramsObj.moduleId });
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid module ID format', details: moduleIdValidation.error.format() }, 
        { status: 400 }
      );
    }

    const { data: assessmentQuestions, error: assessmentError } = await supabase
      .from("assessment_module_questions")
      .select("module_id")
      .eq("module_id", paramsObj.moduleId)
      .limit(1);
      
    if (assessmentError) {
      console.error("Error checking assessment module questions:", assessmentError);
      return NextResponse.json(
        { error: "Server Error", message: "Error checking related data" },
        { status: 500 }
      );
    }
    
    if (assessmentQuestions && assessmentQuestions.length > 0) {
      return NextResponse.json(
        { 
          error: "Conflict", 
          message: "Cannot delete module with existing assessment questions. Remove the questions first." 
        },
        { status: 409 }
      );
    }
    
    const { data: studentProgress, error: progressError } = await supabase
      .from("student_module_progress")
      .select("module_id")
      .eq("module_id", paramsObj.moduleId)
      .limit(1);

    if (progressError) {
      console.error("Error checking student module progress:", progressError);
      return NextResponse.json(
        { error: "Server Error", message: "Error checking student progress" },
        { status: 500 }
      );
    }
    
    if (studentProgress && studentProgress.length > 0) {
      return NextResponse.json(
        { 
          error: "Conflict", 
          message: "Cannot delete module that has student progress data." 
        },
        { status: 409 }
      );
    }
    
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

    return NextResponse.json(
      { message: "Module deleted successfully" },
      { status: 200 }
    );

  } catch (error) {
    console.error("Unexpected error in DELETE module:", error);
    return NextResponse.json(
      { error: "Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
