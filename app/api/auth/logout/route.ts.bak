import { createClient } from '@/lib/supabase/server';
import { NextResponse, NextRequest } from 'next/server';
import { securityLogger, SecurityEventType, SecuritySeverity, SecurityCategory } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user for logging purposes
    const { data: { user } } = await supabase.auth.getUser();
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      securityLogger.logAuthEvent(
        SecurityEventType.AUTH_FAILURE,
        {
          operation: 'logout',
          error: error.message,
          userId: user?.id,
          email: user?.email
        },
        request
      );
      return NextResponse.json(
        { error: 'Failed to logout' },
        { status: 500 }
      );
    }

    // Log successful logout
    if (user) {
      securityLogger.logAuthEvent(
        SecurityEventType.AUTH_SUCCESS,
        {
          operation: 'logout',
          userId: user.id,
          email: user.email
        },
        request
      );
    }

    return NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );

  } catch (error) {
    securityLogger.logAuthEvent(
      SecurityEventType.AUTH_FAILURE,
      {
        operation: 'logout',
        error: error instanceof Error ? error.message : 'Unknown error',
        stage: 'unexpected_error'
      },
      request
    );
    return NextResponse.json(
      { error: 'An unexpected error occurred during logout' },
      { status: 500 }
    );
  }
}

// Also support GET for direct navigation to /api/auth/logout
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user for logging purposes
    const { data: { user } } = await supabase.auth.getUser();
    
    // Sign out from Supabase
    await supabase.auth.signOut();

    // Log successful logout
    if (user) {
      securityLogger.logAuthEvent(
        SecurityEventType.AUTH_SUCCESS,
        {
          operation: 'logout_redirect',
          userId: user.id,
          email: user.email
        },
        request
      );
    }

    // Redirect to homepage after logout
    const url = new URL('/', request.url);
    return NextResponse.redirect(url);

  } catch (error) {
    securityLogger.logAuthEvent(
      SecurityEventType.AUTH_FAILURE,
      {
        operation: 'logout_redirect',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      request
    );
    // Still redirect even if there's an error
    const url = new URL('/', request.url);
    return NextResponse.redirect(url);
  }
} 