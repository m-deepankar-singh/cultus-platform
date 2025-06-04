import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/me
 * 
 * Returns information about the currently authenticated user
 * including their profile data and role.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get auth user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({
        user: null,
        role: null
      }, { status: 401 });
    }
    
    // Try to get user profile from profiles table first
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name, client_id')
      .eq('id', user.id)
      .maybeSingle(); // Use maybeSingle to avoid error when no rows found

    // If not found in profiles, try students table
    let studentData = null;
    if (!profile) {
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, full_name, job_readiness_background_type, job_readiness_tier, job_readiness_star_level')
        .eq('id', user.id)
        .maybeSingle();
      
      if (!studentError && student) {
        studentData = student;
      }
    }

    // Return appropriate data based on what we found
    if (profile) {
      // User has admin/staff profile
      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email
        },
        role: profile.role || null,
        profile: {
          fullName: profile.full_name,
          clientId: profile.client_id
        }
      });
    } else if (studentData) {
      // User is a student
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
        role: 'student',
      profile: {
          fullName: studentData.full_name,
          backgroundType: studentData.job_readiness_background_type,
          tier: studentData.job_readiness_tier,
          starLevel: studentData.job_readiness_star_level
        }
      });
    } else {
      // User exists but no profile data found
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