import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ModuleIdSchema, UpdateModuleSchema } from '@/lib/schemas/module';

/**
 * GET /api/admin/modules/[moduleId]
 * 
 * Retrieves detailed information for a specific module, including related lessons or questions.
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
        { error: 'Bad Request', message: 'Invalid Module ID format', details: moduleIdValidation.error.format() }, 
        { status: 400 }
      );
    }

    // Fetch Module Core Details + Product
    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .select('*, product:products(id, name)') // Fetch product details too
      .eq('id', paramsObj.moduleId)
      .single();

    if (moduleError) {
      if (moduleError.code === 'PGRST116') { // Resource not found
        return NextResponse.json({ error: 'Not Found', message: 'Module not found' }, { status: 404 });
      } else {
        console.error('Error fetching module:', moduleError);
        return NextResponse.json({ error: 'Server Error', message: 'Error fetching module details' }, { status: 500 });
      }
    }

    let relatedData: any = {};
    let relatedError: any = null;

    // Fetch Related Data Based on Type
    if (module.type === 'Course') {
      const { data: lessons, error } = await supabase
        .from('course_lessons')
        .select('*, quiz:course_questions(id, question_text)')
        .eq('module_id', paramsObj.moduleId)
        .order('sequence', { ascending: true });
      relatedData.lessons = lessons;
      relatedError = error;
    } else if (module.type === 'Assessment') {
      const { data: assessmentQuestions, error } = await supabase
        .from('assessment_module_questions')
        .select('question:assessment_questions(*)') // Select all columns from joined questions
        .eq('module_id', paramsObj.moduleId);
      relatedData.assessmentQuestions = assessmentQuestions?.map(aq => aq.question) ?? []; // Extract question objects
      relatedError = error;
    }

    if (relatedError) {
      console.error(`Error fetching related ${module.type} data:`, relatedError);
      // Decide if this should be a fatal error or just return the module core
      return NextResponse.json({ error: 'Server Error', message: `Error fetching related ${module.type} data` }, { status: 500 });
    }

    // Combine and Return Response
    const detailedModule = { ...module, ...relatedData };
    return NextResponse.json(detailedModule);

  } catch (error) {
    console.error('Unexpected error in GET module details:', error);
    return NextResponse.json({ error: 'Server Error', message: 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/modules/[moduleId]
 * 
 * Updates an existing module.
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
        { error: 'Bad Request', message: 'Invalid Module ID format', details: moduleIdValidation.error.format() }, 
        { status: 400 }
      );
    }

    const body = await request.json();
    const updateValidation = UpdateModuleSchema.safeParse(body);

    if (!updateValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid update data', details: updateValidation.error.format() }, 
        { status: 400 }
      );
    }

    const updateData = updateValidation.data;

    // Check if there's actually anything to update
    if (Object.keys(updateData).length === 0) {
       return NextResponse.json({ error: 'Bad Request', message: 'No update fields provided' }, { status: 400 });
    }

    // Update Module
    const { data: updatedModule, error: updateError } = await supabase
      .from('modules')
      .update(updateData)
      .eq('id', paramsObj.moduleId)
      .select()
      .single();

    if (updateError) {
       if (updateError.code === 'PGRST116') { // Resource not found during update
         return NextResponse.json({ error: 'Not Found', message: 'Module not found' }, { status: 404 });
       } else {
         console.error('Error updating module:', updateError);
         return NextResponse.json({ error: 'Server Error', message: 'Error updating module' }, { status: 500 });
       }
    }

    return NextResponse.json(updatedModule);

  } catch (error) {
    console.error('Unexpected error in PUT module:', error);
    return NextResponse.json({ error: 'Server Error', message: 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/modules/[moduleId]
 * 
 * Deletes a specific module.
 * Requires admin authentication.
 */
export async function DELETE(
  request: Request, // Keep request parameter even if unused for consistency
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
        { error: 'Bad Request', message: 'Invalid Module ID format', details: moduleIdValidation.error.format() }, 
        { status: 400 }
      );
    }

    // Perform Deletion
    const { error: deleteError, count } = await supabase
      .from('modules')
      .delete({ count: 'exact' }) // Request count to check if a row was actually deleted
      .eq('id', paramsObj.moduleId);

    if (deleteError) {
      console.error('Error deleting module:', deleteError);
      // Handle potential foreign key constraint errors if needed
      return NextResponse.json({ error: 'Server Error', message: 'Error deleting module' }, { status: 500 });
    }
    
    // Check if any row was actually deleted
    if (count === 0) {
        return NextResponse.json({ error: 'Not Found', message: 'Module not found' }, { status: 404 });
    }

    // Return success response with no content
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('Unexpected error in DELETE module:', error);
    return NextResponse.json({ error: 'Server Error', message: 'An unexpected error occurred' }, { status: 500 });
  }
}
