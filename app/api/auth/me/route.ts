import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

/**
 * GET /api/auth/me
 * 
 * Returns information about the currently authenticated user
 * including their profile data and role from JWT claims.
 */
export async function GET(request: Request) {
  try {
    // JWT-based authentication (0 database queries for basic user info)
    const authResult = await authenticateApiRequest();
    if ('error' in authResult) {
      return NextResponse.json({
        user: null,
        role: null
      }, { status: 401 });
    }
    const { user, claims, supabase } = authResult;

    // Get basic user info from JWT claims
    const userRole = claims.user_role;
    const clientId = claims.client_id;
    const isActive = claims.profile_is_active;
    const isStudent = claims.is_student;

         // For students, get additional data from database (minimal query)
     if (isStudent || userRole === 'student') {
       const { data: studentData, error: studentError } = await supabase
         .from('students')
         .select('full_name, job_readiness_background_type, job_readiness_tier, job_readiness_star_level')
         .eq('id', user.id)
         .maybeSingle();

       return NextResponse.json({
         user: {
           id: user.id,
           email: user.email
         },
         role: 'student',
         profile: {
           fullName: studentData?.full_name || null,
           backgroundType: studentData?.job_readiness_background_type || null,
           tier: studentData?.job_readiness_tier || null,
           starLevel: studentData?.job_readiness_star_level || null,
           clientId: clientId || null
         }
       });
    } else if (userRole && ['Admin', 'Staff', 'Client Staff', 'Viewer'].includes(userRole)) {
      // For admin/staff users, get full_name from profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email
        },
        role: userRole,
        profile: {
          fullName: profile?.full_name || null,
          clientId: clientId || null,
          isActive: isActive
        }
      });
    } else {
      // User exists but no valid role found
      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email
        },
        role: null,
        profile: null
      });
    }
    
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred'
    }, { status: 500 });
  }
} 