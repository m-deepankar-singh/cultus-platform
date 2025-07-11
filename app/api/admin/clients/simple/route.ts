import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { authenticateApiRequestSecure } from '@/lib/auth/api-auth';

/**
 * GET /api/admin/clients/simple
 * Returns simplified client list for dropdown usage
 */
export async function GET() {
  try {
    // JWT-based authentication
    const authResult = await authenticateApiRequestSecure(['Admin', 'Staff', 'Viewer']);
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

    return NextResponse.json(clients || []);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}