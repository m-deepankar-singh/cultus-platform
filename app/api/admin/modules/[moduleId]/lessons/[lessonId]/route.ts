import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ModuleIdSchema, LessonIdSchema, UpdateCourseLessonSchema } from '@/lib/schemas/module';
import { z } from 'zod';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

const LessonUpdateSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional().nullable(),
  video_url: z.string().url().optional().nullable(),
  sequence: z.number().int().positive().optional(),
  has_quiz: z.boolean().optional(),
  quiz_questions: z.array(z.any()).optional(),
  quiz_data: z.any().optional()
});

/**
 * GET /api/admin/modules/[moduleId]/lessons/[lessonId]
 * 
 * Retrieves detailed information for a specific lesson in a course module.
 * Requires admin authentication.
 */
export async function GET(
  request: Request,
  { params }: { params: { moduleId: string; lessonId: string } }
) {
  try {
    // Await params before destructuring to fix Next.js warning
    const resolvedParams = await Promise.resolve(params);
    const { moduleId: rawModuleId, lessonId: rawLessonId } = resolvedParams;
    
    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequest(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error, message: 'Authentication required' }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;

    // Validate route parameters
    const moduleIdValidation = ModuleIdSchema.safeParse({ moduleId: rawModuleId });
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid Module ID format', details: moduleIdValidation.error.format() }, 
        { status: 400 }
      );
    }
    const moduleId = moduleIdValidation.data.moduleId;

    const lessonIdValidation = LessonIdSchema.safeParse({ lessonId: rawLessonId });
    if (!lessonIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid Lesson ID format', details: lessonIdValidation.error.format() }, 
        { status: 400 }
      );
    }
    const lessonId = lessonIdValidation.data.lessonId;

    // Fetch the specific lesson
    const { data: lesson, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .eq("module_id", moduleId)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
      }
      console.error("Error fetching lesson:", error)
      return NextResponse.json(
        { error: "Failed to fetch lesson" },
        { status: 500 }
      )
    }

    return NextResponse.json(lesson)
  } catch (error) {
    console.error("Error in GET lesson:", error)
    return NextResponse.json(
      { error: "Failed to fetch lesson" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/modules/[moduleId]/lessons/[lessonId]
 * 
 * Updates a specific lesson in a course module.
 * Requires admin authentication.
 */
export async function PUT(
  request: Request,
  { params }: { params: { moduleId: string; lessonId: string } }
) {
  try {
    // Await params before destructuring to fix Next.js warning
    const resolvedParams = await Promise.resolve(params);
    const { moduleId: rawModuleId, lessonId: rawLessonId } = resolvedParams;
    
    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequest(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error, message: 'Authentication required' }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;

    // Validate route parameters
    const moduleIdValidation = ModuleIdSchema.safeParse({ moduleId: rawModuleId });
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid Module ID format', details: moduleIdValidation.error.format() }, 
        { status: 400 }
      );
    }
    const moduleId = moduleIdValidation.data.moduleId;

    const lessonIdValidation = LessonIdSchema.safeParse({ lessonId: rawLessonId });
    if (!lessonIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid Lesson ID format', details: lessonIdValidation.error.format() }, 
        { status: 400 }
      );
    }
    const lessonId = lessonIdValidation.data.lessonId;

    // First, check if lesson exists
    const { data: existingLesson, error: checkError } = await supabase
      .from("lessons")
      .select("id")
      .eq("id", lessonId)
      .eq("module_id", moduleId)
      .single()

    if (checkError) {
      if (checkError.code === "PGRST116") {
        return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
      }
      console.error("Error checking lesson:", checkError)
      return NextResponse.json(
        { error: "Failed to verify lesson" },
        { status: 500 }
      )
    }

    // Validate update data
    const body = await request.json()
    const result = LessonUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid lesson data", details: result.error.format() },
        { status: 400 }
      )
    }

    // Update the lesson
    const { data: updatedLesson, error: updateError } = await supabase
      .from("lessons")
      .update(result.data)
      .eq("id", lessonId)
      .eq("module_id", moduleId)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating lesson:", updateError)
      return NextResponse.json(
        { error: "Failed to update lesson" },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedLesson)
  } catch (error) {
    console.error("Error in PUT lesson:", error)
    return NextResponse.json(
      { error: "Failed to update lesson" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/modules/[moduleId]/lessons/[lessonId]
 * 
 * Deletes a specific lesson from a course module.
 * Requires admin authentication.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { moduleId: string; lessonId: string } }
) {
  try {
    // Await params before destructuring to fix Next.js warning
    const resolvedParams = await Promise.resolve(params);
    const { moduleId: rawModuleId, lessonId: rawLessonId } = resolvedParams;
    
    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequest(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error, message: 'Authentication required' }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;

    // Validate route parameters
    const moduleIdValidation = ModuleIdSchema.safeParse({ moduleId: rawModuleId });
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid Module ID format', details: moduleIdValidation.error.format() }, 
        { status: 400 }
      );
    }
    const moduleId = moduleIdValidation.data.moduleId;

    const lessonIdValidation = LessonIdSchema.safeParse({ lessonId: rawLessonId });
    if (!lessonIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid Lesson ID format', details: lessonIdValidation.error.format() }, 
        { status: 400 }
      );
    }
    const lessonId = lessonIdValidation.data.lessonId;

    // First, check if lesson exists
    const { data: existingLesson, error: checkError } = await supabase
      .from("lessons")
      .select("id, sequence")
      .eq("id", lessonId)
      .eq("module_id", moduleId)
      .single()

    if (checkError) {
      if (checkError.code === "PGRST116") {
        return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
      }
      console.error("Error checking lesson:", checkError)
      return NextResponse.json(
        { error: "Failed to verify lesson" },
        { status: 500 }
      )
    }

    // Delete the lesson
    const { error: deleteError } = await supabase
      .from("lessons")
      .delete()
      .eq("id", lessonId)
      .eq("module_id", moduleId)

    if (deleteError) {
      console.error("Error deleting lesson:", deleteError)
      return NextResponse.json(
        { error: "Failed to delete lesson" },
        { status: 500 }
      )
    }

    // Reorder remaining lessons to close the gap
    const { data: remainingLessons, error: fetchError } = await supabase
      .from("lessons")
      .select("id, sequence")
      .eq("module_id", moduleId)
      .order("sequence", { ascending: true })

    if (fetchError) {
      console.error("Error fetching remaining lessons:", fetchError)
      // We don't need to fail the request for this - deletion was successful
    } else if (remainingLessons && remainingLessons.length > 0) {
      // Update sequences to ensure there are no gaps
      const updatePromises = remainingLessons.map(async (lesson: any, index: number) => {
        if (lesson.sequence !== index + 1) {
          const { error } = await supabase
            .from("lessons")
            .update({ sequence: index + 1 })
            .eq("id", lesson.id)

          if (error) {
            console.error(`Error updating sequence for lesson ${lesson.id}:`, error)
          }
        }
      })

      await Promise.all(updatePromises)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE lesson:", error)
    return NextResponse.json(
      { error: "Failed to delete lesson" },
      { status: 500 }
    )
  }
}
