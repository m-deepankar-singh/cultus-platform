import { NextRequest, NextResponse } from 'next/server';
import { analyzeInterview } from './analyze-function';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

export async function POST(request: NextRequest) {
  try {
    // JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['student']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    const { submissionId } = await request.json();

    if (!submissionId) {
      return NextResponse.json(
        { error: 'Missing submissionId' },
        { status: 400 }
      );
    }

    // Call the shared analyze function
    const result = await analyzeInterview(submissionId, user.id);
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in video analysis API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 