import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ModuleIdSchema, CourseLessonSchema } from '@/lib/schemas/module';
import { z } from 'zod';

const LessonSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  video_url: z.string().url().optional().nullable(),
  sequence: z.number().int().positive().optional(),
  module_id: z.string().uuid(),
  has_quiz: z.boolean().optional(),
  quiz_questions: z.array(z.any()).optional() // Allow any structure for quiz questions
});

// Debug helper function to log detailed info
function debugLog(message: string, data: any) {
  console.log(`DEBUG - ${message}:`, JSON.stringify(data, null, 2));
}

/**
 * GET /api/admin/modules/[moduleId]/lessons
 * 
 * Retrieves all lessons for a specific 'Course' module, ordered by sequence.
 * Requires admin authentication.
 */
export async function GET(
  request: Request,
  { params }: { params: { moduleId: string } }
) {
  try {
    // Await params before destructuring to fix Next.js warning
    const resolvedParams = await Promise.resolve(params);
    const { moduleId: rawModuleId } = resolvedParams;
    
    const supabase = await createClient();

    // Check if the module exists and is a course
    const { data: module, error: moduleError } = await supabase
      .from("modules")
      .select("id, type")
      .eq("id", rawModuleId)
      .single();

    if (moduleError || !module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    if (module.type !== "Course") {
      return NextResponse.json(
        { error: "Lessons can only be added to Course modules" },
        { status: 400 }
      );
    }

    // Fetch all lessons for this module
    const { data: lessons, error: lessonsError } = await supabase
      .from("lessons")
      .select("*")
      .eq("module_id", rawModuleId)
      .order("sequence", { ascending: true });

    if (lessonsError) {
      console.error("Database error fetching lessons:", lessonsError);
      return NextResponse.json(
        { error: "Failed to fetch lessons" },
        { status: 500 }
      );
    }

    return NextResponse.json(lessons || []);
  } catch (error) {
    console.error("Error fetching lessons:", error);
    return NextResponse.json(
      { error: "Failed to fetch lessons" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/modules/[moduleId]/lessons
 * 
 * Creates a new lesson for a specific 'Course' module.
 * Automatically assigns the next sequence number.
 * Requires admin authentication.
 */
export async function POST(
  request: Request,
  { params }: { params: { moduleId: string } }
) {
  try {
    // Await params before destructuring to fix Next.js warning
    const resolvedParams = await Promise.resolve(params);
    const { moduleId: rawModuleId } = resolvedParams;
    
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error("Error parsing request body:", e);
      return NextResponse.json(
        { error: "Invalid request body", details: String(e) },
        { status: 400 }
      );
    }
    
    console.log("Request body:", body);
    console.log("Module ID:", rawModuleId);
    
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
    
    console.log("Authenticated user ID:", user.id);
    
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
    
    console.log("User role:", profile?.role);
    
    if (profile?.role !== 'Admin' && profile?.role !== 'admin') {
      return NextResponse.json(
        { error: "Insufficient permissions. Only admin users can create lessons." },
        { status: 403 }
      );
    }

    // Validate the module exists and is a course
    const { data: module, error: moduleError } = await supabase
      .from("modules")
      .select("id, type")
      .eq("id", rawModuleId)
      .single();

    if (moduleError) {
      console.error("Error fetching module:", moduleError);
      return NextResponse.json(
        { error: "Failed to fetch module", details: moduleError.message },
        { status: 500 }
      );
    }
    
    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    console.log("Module type:", module.type);
    
    if (module.type !== "Course") {
      return NextResponse.json(
        { error: "Lessons can only be added to Course modules" },
        { status: 400 }
      );
    }

    // Validate lesson data
    const result = LessonSchema.safeParse({
      ...body,
      module_id: rawModuleId
    });

    if (!result.success) {
      console.error("Validation error:", result.error.format());
      return NextResponse.json(
        { error: "Invalid lesson data", details: result.error.format() },
        { status: 400 }
      );
    }

    // Determine sequence number if not provided
    let sequence = result.data.sequence;
    if (!sequence) {
      // Get highest sequence number and add 1
      const { data: maxSequence, error: sequenceError } = await supabase
        .from("lessons")
        .select("sequence")
        .eq("module_id", rawModuleId)
        .order("sequence", { ascending: false })
        .limit(1)
        .single();

      if (sequenceError && sequenceError.code !== "PGRST116") {
        // PGRST116 is "Results contain 0 rows" error, which is fine
        console.error("Error getting max sequence:", sequenceError);
        return NextResponse.json(
          { error: "Failed to determine sequence number", details: sequenceError.message },
          { status: 500 }
        );
      }

      sequence = maxSequence ? maxSequence.sequence + 1 : 1;
    }
    
    console.log("Inserting lesson with sequence:", sequence);

    // Insert the lesson
    const { data: newLesson, error: insertError } = await supabase
      .from("lessons")
      .insert({
        module_id: rawModuleId,
        title: result.data.title,
        description: result.data.description,
        video_url: result.data.video_url,
        sequence: sequence,
        has_quiz: result.data.has_quiz || false,
        quiz_questions: result.data.has_quiz && result.data.quiz_questions ? 
          result.data.quiz_questions : null
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting lesson:", insertError);
      return NextResponse.json(
        { error: "Failed to create lesson", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(newLesson, { status: 201 });
  } catch (error) {
    console.error("Error creating lesson:", error);
    return NextResponse.json(
      { error: "Failed to create lesson", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/admin/modules/[moduleId]/lessons/reorder
// THIS HANDLER HAS BEEN MOVED TO app/api/admin/modules/[moduleId]/lessons/reorder/route.ts
// export async function PUT(
//   request: Request,
//   { params }: { params: { moduleId: string } }
// ) {
//   // ... (Previous PUT handler code removed) ...
// }
