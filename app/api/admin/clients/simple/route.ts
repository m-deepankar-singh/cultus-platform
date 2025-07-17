import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequestUltraFast } from '@/lib/auth/api-auth';
import { handleConditionalRequest } from '@/lib/cache/etag-utils';
import { CACHE_CONFIGS } from '@/lib/cache/simple-cache';
import { cacheConfig } from '@/lib/cache/config';

/**
 * GET /api/admin/clients/simple
 * Returns simplified client list for dropdown usage
 */
export async function GET(request: NextRequest) {
  try {
    // JWT-based authentication
    const authResult = await authenticateApiRequestUltraFast(['Admin', 'Staff'], request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { supabase } = authResult;
    
    // Get simple client list
    const { data: clients, error } = await supabase
      .from('clients')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching clients:', error);
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
    }

    const clientsData = clients || [];

    // Skip caching if disabled
    if (!cacheConfig.enabled) {
      return NextResponse.json(clientsData);
    }

    // Use semi-static cache (5 minutes) for client lists
    return handleConditionalRequest(request, clientsData, CACHE_CONFIGS.SEMI_STATIC);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}