// app/api/viewer/reports/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { z } from 'zod';
import { Database } from '@/lib/database.types';
import { ViewerReportQuerySchema } from '@/lib/schemas/progress';
import { Role } from '@/lib/types'; // Assuming Role enum/type is defined

// Define the expected structure of the data returned by the function
// based on the aggregated_module_progress_report_item type in SQL
type AggregatedProgressReportItem = {
  client_id: string | null;
  client_name: string | null;
  product_id: string | null;
  product_title: string | null;
  module_id: string | null;
  module_title: string | null;
  module_type: 'Course' | 'Assessment' | null;
  total_assigned_students: number | null;
  students_not_started: number | null;
  students_in_progress: number | null;
  students_completed: number | null;
  average_score: number | null;
};

export async function GET(request: Request) {
  const supabase = createServerActionClient<Database>({ cookies });
  const { searchParams } = new URL(request.url);

  try {
    // 1. Authentication & Authorization
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    // Only allow 'Viewer' or 'Admin' roles (Admin has implicit viewer rights)
    if (profile.role !== Role.Viewer && profile.role !== Role.Admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Query Parameter Validation
    let validatedQuery: z.infer<typeof ViewerReportQuerySchema>;
    try {
      validatedQuery = ViewerReportQuerySchema.parse({
        clientId: searchParams.get('clientId') || undefined,
        productId: searchParams.get('productId') || undefined,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.errors }, { status: 400 });
      }
      console.error('Unexpected validation error:', error);
      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      );
    }

    // 3. Call Database Function
    const { data, error: rpcError } = await supabase.rpc(
      'get_aggregated_progress_report',
      {
        p_client_id: validatedQuery.clientId,
        p_product_id: validatedQuery.productId,
      }
    );

    if (rpcError) {
      console.error('RPC Error fetching aggregated progress:', rpcError);
      return NextResponse.json(
        { error: `Database error: ${rpcError.message}` },
        { status: 500 }
      );
    }

    // Type assertion: Assume the RPC call returns the correct structure
    const reportData = data as AggregatedProgressReportItem[];

    // 4. Return Response
    return NextResponse.json(reportData, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in GET /api/viewer/reports:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Add dynamic = 'force-dynamic' to ensure the route is dynamic
// and re-evaluated on each request, avoiding potential caching issues.
export const dynamic = 'force-dynamic';
