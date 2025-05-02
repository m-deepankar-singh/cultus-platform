import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ModuleIdSchema } from '@/lib/schemas/module';
import { z } from 'zod';

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
  { params }: { params: { moduleId: string } }
) {
  try {
    // Await params before destructuring to fix Next.js warning
    const resolvedParams = await Promise.resolve(params);
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
    
    const supabase = await createClient();
    
    // Get user info for debugging
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error("Error getting authenticated user:", userError);
      return NextResponse.json(
        { error: "Authentication error", details: userError.message },
        { status: 401 }
      );
    }
    
    if (!user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }
    
    debugLog("Authenticated user", { id: user.id });
    
    // Check user role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    
    if (profileError) {
      console.error("Error getting user profile:", profileError);
      return NextResponse.json(
        { error: "Failed to verify user permissions", details: profileError.message },
        { status: 403 }
      );
    }
    
    debugLog("User role", { role: profile?.role });
    
    if (profile?.role !== 'Admin' && profile?.role !== 'admin') {
      return NextResponse.json(
        { error: "Insufficient permissions. Only admin users can reorder lessons." },
        { status: 403 }
      );
    }

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
        validationErrors.push(`Duplicate lesson ID found in request: ${lesson.id}`);
      }
      lessonIds.add(lesson.id);
    }
    
    debugLog("Validation errors", validationErrors);
    
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Invalid lesson data", details: validationErrors.join(", ") },
        { status: 400 }
      );
    }

    // Transaction: Update sequence numbers for each lesson
    // NOTE: Using a transaction ensures all updates succeed or fail together.
    // However, Supabase JS client doesn't directly support transactions like this
    // without using RPC. For simplicity, we'll do individual updates.
    // If atomicity is critical, create a Postgres function and call it via RPC.

    const updatePromises = body.lessons.map(async (lesson: LessonOrder) => {
      debugLog(`Updating lesson`, { id: lesson.id, sequence: lesson.sequence });
      const { error } = await supabase
        .from("lessons")
        .update({ sequence: lesson.sequence })
        .eq("id", lesson.id)
        .eq("module_id", moduleId); // Ensure we only update lessons belonging to this module

      if (error) {
        console.error(`Error updating sequence for lesson ${lesson.id}:`, error);
        // Return a rejected promise or object indicating failure for this specific lesson
        return { success: false, id: lesson.id, error: error.message };
      }
      return { success: true, id: lesson.id };
    });

    try {
      const results = await Promise.all(updatePromises);
      const failures = results.filter(r => !r.success);

      if (failures.length > 0) {
         debugLog("Failed lesson updates", failures);
         // Decide how to handle partial failure. We could try to rollback, 
         // but that's complex without transactions. Reporting the error is usually sufficient.
         const errorMessages = failures.map(f => `Lesson ${f.id}: ${f.error}`).join("; ");
         return NextResponse.json(
           { error: "Failed to update one or more lessons", details: errorMessages },
           { status: 500 }
         );
      }
      
      debugLog("All lessons updated successfully", { count: body.lessons.length });
    } catch (error) {
      // This catch block might be redundant if Promise.all doesn't throw with the current setup
      // but good practice to keep it.
      console.error("Unexpected error during batch update:", error);
      return NextResponse.json(
        { error: "Failed to update lessons due to an unexpected error", details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Catch errors from outside the main try block (e.g., params resolution)
    console.error("Error reordering lessons (outer catch):", error);
    return NextResponse.json(
      { error: "Failed to reorder lessons", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 