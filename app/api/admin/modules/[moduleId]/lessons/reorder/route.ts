import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ModuleIdSchema } from '@/lib/schemas/module';
import { z } from 'zod';
import { authenticateApiRequestSecure } from '@/lib/auth/api-auth';

// Debug helper function to log detailed info
function debugLog(message: string, data: any) {
  console.log(`DEBUG - ${message}:`, JSON.stringify(data, null, 2));
}

/**
 * PUT /api/admin/modules/[moduleId]/lessons/reorder
 * 
 * Updates the sequence order of lessons for a specific module.
 * Requires admin authentication.
 * Expects a body like: { lessons: [{ id: "uuid", sequence: 1 }, ...] }
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

    // Await params before destructuring to fix Next.js warning
    const resolvedParams = await params;
    const { moduleId: rawModuleId } = resolvedParams;
    debugLog("Request params", { rawModuleId });
    
    let body;
    const requestClone = request.clone(); // Clone request to read twice if needed
    const contentType = request.headers.get("Content-Type");
    debugLog("Request content type", contentType);
    
    try {
      body = await request.json();
      debugLog("Parsed request body", body);
    } catch (e) {
      console.error("Error parsing request body:", e);
      
      // Try to read the raw body for debugging
      try {
        const rawText = await requestClone.text();
        debugLog("Raw request body", rawText);
      } catch (textError) {
        console.error("Could not read raw body:", textError);
      }
      
      return NextResponse.json(
        { error: "Invalid request body", details: String(e) },
        { status: 400 }
      );
    }
    
    // Check if body or lessons array is undefined
    if (!body) {
      return NextResponse.json(
        { error: "Missing request body" },
        { status: 400 }
      );
    }
    
    if (!body.lessons) {
      debugLog("Invalid body structure", body);
      return NextResponse.json(
        { error: "Missing lessons array in request body" },
        { status: 400 }
      );
    }
    
    if (!Array.isArray(body.lessons)) {
      debugLog("lessons is not an array", typeof body.lessons);
      return NextResponse.json(
        { error: "Invalid data format. Expected an array of lessons", details: `Got ${typeof body.lessons} instead` },
        { status: 400 }
      );
    }
    
    if (body.lessons.length === 0) {
      // Technically okay, but nothing to do. Maybe return success? Or 400? Let's allow it.
      debugLog("Empty lessons array received", body.lessons);
      return NextResponse.json({ success: true, message: "No lessons to reorder" });
      // Or return NextResponse.json({ error: "Empty lessons array" }, { status: 400 });
    }
    
    debugLog("Lessons array to process", body.lessons);
    debugLog("Authenticated user", { id: user.id });

    // Validate moduleId
    const moduleIdValidation = ModuleIdSchema.safeParse({ moduleId: rawModuleId });
    debugLog("Module ID validation", {
      success: moduleIdValidation.success,
      error: !moduleIdValidation.success ? moduleIdValidation.error.format() : null
    });
    
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: "Invalid Module ID format", details: moduleIdValidation.error.format() },
        { status: 400 }
      );
    }
    const moduleId = moduleIdValidation.data.moduleId;

    // Validate the module exists (no need to check type again, but good practice)
    const { data: module, error: moduleError } = await supabase
      .from("modules")
      .select("id") // Only need ID to confirm existence
      .eq("id", moduleId)
      .maybeSingle(); // Use maybeSingle to avoid error if not found

    if (moduleError) {
      console.error("Error fetching module during reorder:", moduleError);
      return NextResponse.json(
        { error: "Failed to verify module existence", details: moduleError.message },
        { status: 500 }
      );
    }
    
    if (!module) {
        debugLog("Module not found during reorder check", { moduleId });
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // Define the type for lesson items in the array
    interface LessonOrder {
      id: string;
      sequence: number;
    }

    // Validate each lesson in the array has a valid id and sequence
    const validationErrors = [];
    const lessonIds = new Set<string>();
    for (let i = 0; i < body.lessons.length; i++) {
      const lesson = body.lessons[i];
      debugLog(`Validating lesson at index ${i}`, lesson);
      
      if (!lesson.id) {
        validationErrors.push(`Lesson at index ${i} is missing an ID`);
        continue;
      }
      
      if (typeof lesson.id !== 'string') {
        validationErrors.push(`Lesson at index ${i} has an ID that is not a string (type: ${typeof lesson.id})`);
        continue;
      }
      
      // Basic UUID format check
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lesson.id)) {
        validationErrors.push(`Lesson at index ${i} has an invalid UUID format: ${lesson.id}`);
      }
      
      if (typeof lesson.sequence !== 'number') {
        validationErrors.push(`Lesson at index ${i} has a sequence that is not a number (type: ${typeof lesson.sequence})`);
      } else if (!Number.isInteger(lesson.sequence) || lesson.sequence < 1) {
        validationErrors.push(`Lesson at index ${i} has an invalid sequence (must be positive integer): ${lesson.sequence}`);
      }
      
      if(lessonIds.has(lesson.id)){
        validationErrors.push(`Lesson at index ${i} has duplicate ID: ${lesson.id}`);
      } else {
        lessonIds.add(lesson.id);
      }
    }

    if (validationErrors.length > 0) {
      debugLog("Validation errors found", validationErrors);
      return NextResponse.json(
        { error: "Invalid lesson data", details: validationErrors },
        { status: 400 }
      );
    }

    // Verify that all lessons exist and belong to this module
    const lessonIdsArray = Array.from(lessonIds);
    debugLog("Checking lesson existence", { lessonIdsArray, moduleId });
    
    const { data: existingLessons, error: lessonCheckError } = await supabase
      .from("lessons")
      .select("id, module_id")
      .in("id", lessonIdsArray);

    if (lessonCheckError) {
      console.error("Error checking lesson existence:", lessonCheckError);
      return NextResponse.json(
        { error: "Failed to verify lesson existence", details: lessonCheckError.message },
        { status: 500 }
      );
    }

    // Check if all lessons exist
    if (!existingLessons || existingLessons.length !== lessonIdsArray.length) {
      const foundIds = new Set(existingLessons?.map((l: any) => l.id) || []);
      const missingIds = lessonIdsArray.filter(id => !foundIds.has(id));
      debugLog("Missing lesson IDs", missingIds);
      return NextResponse.json(
        { error: "Some lessons do not exist", details: { missingIds } },
        { status: 404 }
      );
    }

    // Check if all lessons belong to the specified module
    const invalidModuleLessons = existingLessons.filter((lesson: any) => lesson.module_id !== moduleId);
    if (invalidModuleLessons.length > 0) {
      debugLog("Lessons from wrong module", invalidModuleLessons);
      return NextResponse.json(
        { error: "Some lessons do not belong to the specified module", 
          details: { invalidLessons: invalidModuleLessons.map((l: any) => l.id) } },
        { status: 400 }
      );
    }

    // If we get here, all lessons are valid. Now perform the updates.
    debugLog("Starting lesson sequence updates", { lessonCount: body.lessons.length });

    // Perform the updates in a transaction-like manner
    const updatePromises = body.lessons.map(async (lesson: LessonOrder) => {
      debugLog(`Updating lesson ${lesson.id} to sequence ${lesson.sequence}`, { lesson });
      
      const { data, error } = await supabase
        .from("lessons")
        .update({ 
          sequence: lesson.sequence,
          updated_at: new Date().toISOString()
        })
        .eq("id", lesson.id)
        .select("id, sequence");

      if (error) {
        console.error(`Error updating lesson ${lesson.id}:`, error);
        throw new Error(`Failed to update lesson ${lesson.id}: ${error.message}`);
      }

      debugLog(`Successfully updated lesson ${lesson.id}`, data);
      return data;
    });

    try {
      const updateResults = await Promise.all(updatePromises);
      debugLog("All lesson updates completed", updateResults);
      
      return NextResponse.json({ 
        success: true, 
        message: `Successfully updated ${body.lessons.length} lesson sequences`,
        updatedLessons: updateResults.filter((result: any, index: number) => result != null)
      });
      
    } catch (updateError) {
      console.error("Error during batch lesson updates:", updateError);
      return NextResponse.json(
        { error: "Failed to update lesson sequences", details: String(updateError) },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Unexpected error in lesson reorder:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred", details: String(error) },
      { status: 500 }
    );
  }
} 