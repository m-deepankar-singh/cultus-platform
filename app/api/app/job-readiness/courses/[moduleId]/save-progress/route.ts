import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

const SaveProgressSchema = z.object({
  last_viewed_lesson_sequence: z.number().int().min(0).optional(),
  video_playback_positions: z.record(z.string().uuid(), z.number().min(0)).optional(), // { lessonId: seconds }
  fully_watched_video_ids: z.array(z.string().uuid()).optional(), // [lessonId, lessonId2]
});

export async function POST(
  request: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  try {
    const { moduleId } = params;
    
    if (!moduleId) {
      return NextResponse.json({ error: 'Module ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const progressValidation = SaveProgressSchema.safeParse(body);
    if (!progressValidation.success) {
      return NextResponse.json(
        { error: 'Invalid progress data', details: progressValidation.error.format() },
        { status: 400 }
      );
    }

    const updatesToApply = progressValidation.data;

    // First, get the module information and its product relationship
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select('id, product_id')
      .eq('id', moduleId)
      .single();

    if (moduleError || !moduleData) {
      console.error('Error fetching module:', moduleError);
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    const productId = moduleData.product_id;

    // Determine if this product is a job readiness product
    const { data: jrProduct, error: jrProductError } = await supabase
      .from('job_readiness_products')
      .select('id')
      .eq('product_id', productId)
      .maybeSingle();

    if (jrProductError && jrProductError.code !== 'PGRST116') {
      console.error('Error checking if product is job readiness:', jrProductError);
      return NextResponse.json({ error: 'Error checking product type' }, { status: 500 });
    }

    // We're always using student_module_progress as the table
    const tableToUse = 'student_module_progress';

    // Fetch existing progress or initialize
    const { data: existingProgress, error: fetchProgressError } = await supabase
      .from(tableToUse)
      .select('progress_details')
      .eq('student_id', user.id)
      .eq('module_id', moduleId)
      .maybeSingle();

    if (fetchProgressError && fetchProgressError.code !== 'PGRST116') {
      console.error('Error fetching existing progress:', fetchProgressError);
      return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
    }

    let currentProgressDetails = (existingProgress?.progress_details as any) || {};

    // Merge updates: only update fields that are present in the request
    const newProgressDetails = { ...currentProgressDetails };

    if (updatesToApply.last_viewed_lesson_sequence !== undefined) {
      newProgressDetails.last_viewed_lesson_sequence = updatesToApply.last_viewed_lesson_sequence;
    }
    if (updatesToApply.video_playback_positions) {
      newProgressDetails.video_playback_positions = {
        ...(newProgressDetails.video_playback_positions || {}),
        ...updatesToApply.video_playback_positions,
      };
    }
    if (updatesToApply.fully_watched_video_ids) {
      // Merge and deduplicate fully watched video IDs
      const existingWatched = new Set(newProgressDetails.fully_watched_video_ids || []);
      updatesToApply.fully_watched_video_ids.forEach(id => existingWatched.add(id));
      newProgressDetails.fully_watched_video_ids = Array.from(existingWatched);
    }

    if (existingProgress) {
      // Update existing progress
      const { error: updateError } = await supabase
        .from(tableToUse)
        .update({ progress_details: newProgressDetails })
        .eq('student_id', user.id)
        .eq('module_id', moduleId);

      if (updateError) {
        console.error('Error updating progress:', updateError);
        return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
      }
    } else {
      // Insert new progress
      const { error: insertError } = await supabase
        .from(tableToUse)
        .insert({
          student_id: user.id,
          module_id: moduleId,
          progress_details: newProgressDetails,
        });

      if (insertError) {
        console.error('Error inserting progress:', insertError);
        return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
      }
    }

    return NextResponse.json({ message: 'Progress saved successfully', data: newProgressDetails });

  } catch (e) {
    const error = e as Error;
    console.error('Unexpected error in /api/app/job-readiness/.../save-progress:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.', details: error.message }, { status: 500 });
  }
} 