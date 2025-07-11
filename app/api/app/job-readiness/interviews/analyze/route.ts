import { NextRequest, NextResponse } from 'next/server';
import { analyzeInterview } from './analyze-function';
import { authenticateApiRequestWithRateLimitSecure } from '@/lib/auth/api-auth';
import { RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // JWT-based authentication with rate limiting (AI cost protection)
    const authResult = await authenticateApiRequestWithRateLimitSecure(
      request,
      ['student'],
      RATE_LIMIT_CONFIGS.AI_INTERVIEW_ANALYSIS
    );
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