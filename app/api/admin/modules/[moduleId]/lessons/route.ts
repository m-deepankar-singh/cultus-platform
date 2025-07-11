import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ModuleIdSchema, CourseLessonSchema } from '@/lib/schemas/module';
import { z } from 'zod';
import { authenticateApiRequestSecure } from '@/lib/auth/api-auth';

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
      const { data: lastLesson, error: sequenceError } = await supabase
        .from("lessons")
        .select("sequence")
        .eq("module_id", rawModuleId)
        .order("sequence", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sequenceError) {
        console.error("Error fetching last lesson sequence:", sequenceError);
        return NextResponse.json(
          { error: "Failed to determine lesson sequence" },
          { status: 500 }
        );
      }

      sequence = (lastLesson?.sequence || 0) + 1;
    }

    // Create the lesson
    const { data: createdLesson, error: createError } = await supabase
      .from("lessons")
      .insert({
        title: result.data.title,
        description: result.data.description,
        video_url: result.data.video_url,
        sequence,
        module_id: rawModuleId,
        has_quiz: result.data.has_quiz || false,
        quiz_questions: result.data.quiz_questions || []
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating lesson:", createError);
      return NextResponse.json(
        { error: "Failed to create lesson", details: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(createdLesson, { status: 201 });

  } catch (error) {
    console.error("Error creating lesson:", error);
    return NextResponse.json(
      { error: "Failed to create lesson" },
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
