import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequestUltraFast } from '@/lib/auth/api-auth';

/**
 * GET /api/admin/job-readiness/expert-sessions
 * List all expert sessions with upload/management interface
 */
export async function GET(req: NextRequest) {
  try {
    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequestUltraFast(['Admin', 'admin', 'Staff', 'staff']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;
    
    const url = new URL(req.url);
    const productId = url.searchParams.get('productId');

    try {
      // Simple direct query without caching
      let query = supabase
        .from('job_readiness_expert_sessions')
        .select(`
          id,
          title,
          description,
          video_url,
          video_duration,
          is_active,
          created_at,
          updated_at,
          job_readiness_expert_session_products!inner (
            product_id,
            products (
              id,
              name,
              type
            )
          )
        `)
        .order('created_at', { ascending: false });

      // Filter by product if specified
      if (productId) {
        query = query.eq('job_readiness_expert_session_products.product_id', productId);
      }

      const { data: expertSessions, error } = await query;

      if (error) {
        console.error('Error fetching expert sessions:', error);
        return NextResponse.json({ error: 'Failed to fetch expert sessions' }, { status: 500 });
      }

      // Transform the data to group products by session
      const sessionsMap = new Map();
      
      expertSessions?.forEach((session: any) => {
        const sessionId = session.id;
        
        if (!sessionsMap.has(sessionId)) {
          sessionsMap.set(sessionId, {
            id: session.id,
            title: session.title,
            description: session.description,
            video_url: session.video_url,
            video_duration: session.video_duration,
            is_active: session.is_active,
            created_at: session.created_at,
            updated_at: session.updated_at,
            job_readiness_expert_session_products: []
          });
        }
        
        // Add product associations with correct structure
        if (session.job_readiness_expert_session_products?.products) {
          const existingProducts = sessionsMap.get(sessionId).job_readiness_expert_session_products;
          const productExists = existingProducts.some((p: any) => 
            p.product_id === session.job_readiness_expert_session_products.product_id
          );
          
          if (!productExists && session.job_readiness_expert_session_products.products) {
            existingProducts.push({
              product_id: session.job_readiness_expert_session_products.product_id,
              products: {
                id: session.job_readiness_expert_session_products.products.id,
                name: session.job_readiness_expert_session_products.products.name || 'Unnamed Product',
                type: session.job_readiness_expert_session_products.products.type || 'UNKNOWN'
              }
            });
          }
        }
      });

      const transformedSessions = Array.from(sessionsMap.values());

      // Get completion statistics for each session in batches
      const sessionIds = transformedSessions.map((s) => s.id);

      let allProgressStats = [];
      if (sessionIds.length > 0) {
        const { data: progressData, error: statsError } = await supabase
          .from('job_readiness_expert_session_progress')
          .select('expert_session_id, is_completed, watch_time_seconds')
          .in('expert_session_id', sessionIds);

        if (statsError) {
          console.error('Error fetching progress stats:', statsError);
          // Continue without stats rather than failing
        } else {
          allProgressStats = progressData || [];
        }
      }

      // Build aggregation map
      const statsMap = new Map<string, { total: number; completed: number; totalWatchTime: number }>();

      allProgressStats.forEach((row: any) => {
        const entry = statsMap.get(row.expert_session_id) || { total: 0, completed: 0, totalWatchTime: 0 };
        entry.total += 1;
        if (row.is_completed) entry.completed += 1;
        entry.totalWatchTime += row.watch_time_seconds || 0;
        statsMap.set(row.expert_session_id, entry);
      });

      const sessionsWithStats = transformedSessions.map((session) => {
        const stats = statsMap.get(session.id) || { total: 0, completed: 0, totalWatchTime: 0 };

        return {
          ...session,
          completion_stats: {
            total_students: stats.total,
            completed_students: stats.completed,
            completion_rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
            average_completion_percentage: stats.total > 0 && session.video_duration > 0 
              ? Math.round((stats.totalWatchTime / stats.total / session.video_duration) * 100) 
              : 0,
          }
        };
      });

      return NextResponse.json({ sessions: sessionsWithStats });
    } catch (error) {
      console.error('Error in expert sessions GET:', error);
      return NextResponse.json({ error: 'Failed to fetch expert sessions' }, { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error in expert-sessions GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/job-readiness/expert-sessions
 * Upload new expert session video with title and description
 */
export async function POST(req: NextRequest) {
  try {
    // JWT-based authentication (using existing auth pattern)
    const authResult = await authenticateApiRequestUltraFast(['Admin', 'admin', 'Staff', 'staff']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, supabase } = authResult;

    // Parse JSON request body (replaces FormData parsing)
    const body = await req.json();
    const { 
      title, 
      description, 
      product_ids: productIds, 
      video_url, 
      video_storage_path, 
      video_duration 
    } = body;

    // Validate required fields (video already uploaded via direct upload)
    if (!title || !productIds?.length || !video_url || !video_storage_path) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, product_ids (array), video_url, and video_storage_path are required' 
      }, { status: 400 });
    }

    // Validate product IDs array
    if (!Array.isArray(productIds)) {
      return NextResponse.json({ 
        error: 'product_ids must be an array of product IDs' 
      }, { status: 400 });
    }

    // Verify all products exist and are of type JOB_READINESS
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id, type')
      .in('id', productIds)
      .eq('type', 'JOB_READINESS');

    if (productError || !products || products.length !== productIds.length) {
      return NextResponse.json({ 
        error: 'One or more invalid product IDs or products are not Job Readiness products' 
      }, { status: 400 });
    }

    // Parse video duration (provided by client after upload)
    const parsedDuration = video_duration ? parseInt(video_duration.toString()) : 3600; // Default 1 hour
    const finalVideoDuration = !isNaN(parsedDuration) && parsedDuration > 0 ? parsedDuration : 3600;

    // Create the expert session record with pre-uploaded video data
    const { data: expertSession, error: dbError } = await supabase
      .from('job_readiness_expert_sessions')
      .insert({
        title,
        description: description || null,
        video_url,
        video_duration: finalVideoDuration,
        is_active: true
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error creating expert session:', dbError);
      return NextResponse.json({ 
        error: 'Failed to create expert session record' 
      }, { status: 500 });
    }

    // Create product associations
    const productAssociations = productIds.map(productId => ({
      expert_session_id: expertSession.id,
      product_id: productId
    }));

    const { error: associationError } = await supabase
      .from('job_readiness_expert_session_products')
      .insert(productAssociations);

    if (associationError) {
      console.error('Error creating product associations:', associationError);
      
      // Clean up session record if association fails
      await supabase
        .from('job_readiness_expert_sessions')
        .delete()
        .eq('id', expertSession.id);
      
      return NextResponse.json({ 
        error: 'Failed to create product associations' 
      }, { status: 500 });
    }

    // Get the created session with its associated products for the response
    const { data: sessionWithProducts } = await supabase
      .from('job_readiness_expert_sessions')
      .select(`
        id,
        title,
        description,
        video_url,
        video_duration,
        is_active,
        created_at,
        updated_at,
        job_readiness_expert_session_products (
          product_id,
          products (
            id,
            name,
            type
          )
        )
      `)
      .eq('id', expertSession.id)
      .single();

    return NextResponse.json({ 
      message: 'Expert session created successfully',
      session: sessionWithProducts 
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in expert-sessions POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT/PATCH /api/admin/job-readiness/expert-sessions
 * Update expert session details (title, description, activate/deactivate)
 */
export async function PATCH(req: NextRequest) {
  try {
    // JWT-based authentication (consistent with GET and POST)
    const authResult = await authenticateApiRequestUltraFast(['Admin', 'admin', 'Staff', 'staff']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, supabase } = authResult;

    const body = await req.json();

    // Validate request body
    const { id, title, description, is_active, product_ids } = body;

    if (!id) {
      return NextResponse.json({ error: 'Expert session ID is required' }, { status: 400 });
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (Object.keys(updateData).length === 0 && !product_ids) {
      return NextResponse.json({ 
        error: 'At least one field (title, description, is_active, product_ids) must be provided' 
      }, { status: 400 });
    }

    // Update expert session basic fields if provided
    if (Object.keys(updateData).length > 0) {
      const { data: updatedSession, error } = await supabase
        .from('job_readiness_expert_sessions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating expert session:', error);
        return NextResponse.json({ 
          error: 'Failed to update expert session' 
        }, { status: 500 });
      }

      if (!updatedSession) {
        return NextResponse.json({ 
          error: 'Expert session not found' 
        }, { status: 404 });
      }
    }

    // Update product associations if provided
    if (product_ids) {
      // Validate product IDs
      const { data: products, error: productError } = await supabase
        .from('products')
        .select('id, type')
        .in('id', product_ids)
        .eq('type', 'JOB_READINESS');

      if (productError || !products || products.length !== product_ids.length) {
        return NextResponse.json({ 
          error: 'One or more invalid product IDs or products are not Job Readiness products' 
        }, { status: 400 });
      }

      // Get current associations
      const { data: currentAssociations, error: currentError } = await supabase
        .from('job_readiness_expert_session_products')
        .select('product_id')
        .eq('expert_session_id', id);

      if (currentError) {
        console.error('Error fetching current associations:', currentError);
        return NextResponse.json({ 
          error: 'Failed to fetch current product associations' 
        }, { status: 500 });
      }

      const currentProductIds = currentAssociations?.map((a: any) => a.product_id) || [];
      const newProductIds = product_ids;

      // Calculate differences
      const toRemove = currentProductIds.filter((pid: string) => !newProductIds.includes(pid));
      const toAdd = newProductIds.filter((productId: string) => !currentProductIds.includes(productId));

      // Remove old associations
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('job_readiness_expert_session_products')
          .delete()
          .eq('expert_session_id', id)
          .in('product_id', toRemove);

        if (removeError) {
          console.error('Error removing product associations:', removeError);
          return NextResponse.json({ 
            error: 'Failed to remove old product associations' 
          }, { status: 500 });
        }
      }

      // Add new associations
      if (toAdd.length > 0) {
        const newAssociations = toAdd.map((productId: string) => ({
          expert_session_id: id,
          product_id: productId
        }));

        const { error: addError } = await supabase
          .from('job_readiness_expert_session_products')
          .insert(newAssociations);

        if (addError) {
          console.error('Error adding product associations:', addError);
          return NextResponse.json({ 
            error: 'Failed to add new product associations' 
          }, { status: 500 });
        }
      }
    }

    // Get the updated session with its associated products for the response
    const { data: sessionWithProducts } = await supabase
      .from('job_readiness_expert_sessions')
      .select(`
        id,
        title,
        description,
        video_url,
        video_duration,
        is_active,
        created_at,
        updated_at,
        job_readiness_expert_session_products (
          product_id,
          products (
            id,
            name,
            type
          )
        )
      `)
      .eq('id', id)
      .single();

    return NextResponse.json({ 
      message: 'Expert session updated successfully',
      session: sessionWithProducts 
    });

  } catch (error) {
    console.error('Unexpected error in expert-sessions PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/job-readiness/expert-sessions
 * Remove expert session (soft delete by setting is_active = false)
 */
export async function DELETE(req: NextRequest) {
  try {
    // JWT-based authentication (consistent with other methods)
    const authResult = await authenticateApiRequestUltraFast(['Admin', 'admin', 'Staff', 'staff']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, supabase } = authResult;

    const url = new URL(req.url);
    const sessionId = url.searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Expert session ID is required' }, { status: 400 });
    }

    // Perform soft delete by setting is_active = false
    const { data: deletedSession, error } = await supabase
      .from('job_readiness_expert_sessions')
      .update({ is_active: false })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error deleting expert session:', error);
      return NextResponse.json({ 
        error: 'Failed to delete expert session' 
      }, { status: 500 });
    }

    if (!deletedSession) {
      return NextResponse.json({ 
        error: 'Expert session not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Expert session deleted successfully',
      session: deletedSession 
    });

  } catch (error) {
    console.error('Unexpected error in expert-sessions DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 