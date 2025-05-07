import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server'; // Import the service client
import { getUserSessionAndRole } from '@/lib/supabase/utils'; // Correct path
import { LearnerListQuerySchema } from '@/lib/schemas/learner';
import { UserRole } from '@/lib/schemas/user';
import { z } from "zod"
import { sendLearnerWelcomeEmail } from '@/lib/email/service'; // Import our email service

/**
 * GET /api/admin/learners
 * 
 * Retrieves a list of learners (users with the 'Student' role).
 * Accessible by users with the 'Admin' or 'Staff' role.
 * Supports filtering by search term, client ID, and active status.
 */
export async function GET(request: Request) {
  try {
    // 1. Authentication & Authorization (using the utility)
    const { user, profile, role, error: sessionError } = await getUserSessionAndRole();

    if (sessionError || !user || !profile) {
        console.error('Session Error:', sessionError?.message);
        const status = sessionError?.message.includes('No active user session') ? 401 : 403;
        return new NextResponse(JSON.stringify({ error: sessionError?.message || 'Unauthorized or profile missing' }), {
            status,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    if (!role || !["Admin", "Staff"].includes(role)) {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse & Validate Query Parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validationResult = LearnerListQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid query parameters', details: validationResult.error.flatten() }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { search, clientId, isActive } = validationResult.data;

    // Get Supabase client *after* auth check
    const supabase = await createClient();

    // 3. Build Supabase Query
    let query = supabase
      .from('students')
      .select('id, created_at, updated_at, client_id, is_active, full_name, email, phone_number, star_rating, last_login_at, temporary_password, client:clients(id, name)');
      
    // Apply search filter (case-insensitive on full_name and email)
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply client filter
    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    // Apply active filter
    if (isActive !== undefined) { // Check if the parameter was provided
      query = query.eq('is_active', isActive === 'true');
    }

    // Add ordering
    query = query.order('full_name', { ascending: true });

    // 4. Execute Query & Handle Response
    const { data: learners, error: dbError } = await query;

    if (dbError) {
      console.error('Supabase DB Error:', dbError);
      return new NextResponse(JSON.stringify({ error: 'Database error fetching learners' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return NextResponse.json(learners || []);

  } catch (error) {
    console.error('API Error:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
        errorMessage = error.message;
    }

    return new NextResponse(JSON.stringify({ error: 'An unexpected error occurred', details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Schema for creating a new learner
const CreateLearnerSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  phone_number: z.string().optional().nullable(),
  client_id: z.string().uuid(),
  is_active: z.boolean().default(true),
})

/**
 * POST /api/admin/learners
 * 
 * Create a new learner
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Authenticate user and check role
    const { profile, role, user, error: authError } = await getUserSessionAndRole()
    
    if (authError || !profile || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    if (!role || !["Admin", "Staff"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    
    // Parse and validate request body
    const body = await request.json()
    const validation = CreateLearnerSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: "Validation error", 
        details: validation.error.format() 
      }, { status: 400 })
    }
    
    const learnerData = validation.data
    
    // Check if the client exists
    const { data: clientExists, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', learnerData.client_id)
      .single()
    
    if (clientError || !clientExists) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }
    
    // Check if a student with the same email already exists
    const { data: existingUser, error: userCheckError } = await supabase
      .from('students')
      .select('id')
      .eq('email', learnerData.email)
      .maybeSingle()
    
    if (userCheckError) {
      console.error('Error checking for existing learner:', userCheckError)
      return NextResponse.json({ error: "Error checking for existing learner" }, { status: 500 })
    }
    
    if (existingUser) {
      return NextResponse.json({ error: "A learner with this email already exists" }, { status: 409 })
    }
    
    // Generate a random password
    const generateRandomPassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    }
    
    const randomPassword = generateRandomPassword();
    
    // 1. Create auth user first - using service client for admin operations
    const serviceClient = await createServiceClient()
    const { data: authUser, error: createAuthError } = await serviceClient.auth.admin.createUser({
      email: learnerData.email,
      password: randomPassword,
      email_confirm: true
    })
    
    if (createAuthError || !authUser.user) {
      console.error('Error creating auth user:', createAuthError)
      return NextResponse.json({ error: "Failed to create auth user", details: createAuthError }, { status: 500 })
    }
    
    // 2. Create the student record using the new auth user's ID
    const { data: newLearner, error: createError } = await supabase
      .from('students')
      .insert({
        id: authUser.user.id, // Use the auth user's ID
        full_name: learnerData.full_name,
        email: learnerData.email,
        phone_number: learnerData.phone_number,
        client_id: learnerData.client_id,
        is_active: learnerData.is_active,
        temporary_password: randomPassword // Store the temporary password in the database
      })
      .select()
      .single()
    
    if (createError) {
      console.error('Error creating learner:', createError)
      // If student creation fails, we should delete the auth user to avoid orphaned records
      await serviceClient.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: "Failed to create learner", details: createError.message }, { status: 500 })
    }
    
    // 3. Send welcome email with login credentials
    try {
      console.log(`[EMAIL DEBUG] Attempting to send welcome email to ${learnerData.email}`);
      console.log(`[EMAIL DEBUG] SMTP_HOST: ${process.env.SMTP_HOST || 'not set'}`);
      console.log(`[EMAIL DEBUG] SMTP_PORT: ${process.env.SMTP_PORT || 'not set'}`);
      console.log(`[EMAIL DEBUG] SMTP_USER: ${process.env.SMTP_USER || 'not set'}`);
      console.log(`[EMAIL DEBUG] SMTP_SECURE: ${process.env.SMTP_SECURE || 'not set'}`);
      console.log(`[EMAIL DEBUG] EMAIL_FROM: ${process.env.EMAIL_FROM || 'not set'}`);
      
      await sendLearnerWelcomeEmail(
        learnerData.email, 
        randomPassword,
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://cultus-platform.com'}/app/login`
      );
      console.log(`[EMAIL DEBUG] Welcome email sent successfully to ${learnerData.email}`);
    } catch (emailError) {
      // We don't want to fail the API if only the email fails
      console.error('[EMAIL DEBUG] Error sending welcome email:', emailError);
      // We could log this to a monitoring service or alert system
    }
    
    // Return success with generated password so it can be communicated to the student
    return NextResponse.json({
      ...newLearner,
      temporary_password: randomPassword
    }, { status: 201 })
    
  } catch (error) {
    console.error('Unexpected error in POST /api/admin/learners:', error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
