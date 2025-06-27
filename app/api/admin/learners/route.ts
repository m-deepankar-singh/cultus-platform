import { NextRequest, NextResponse } from 'next/server';
import { LearnerListQuerySchema } from '@/lib/schemas/learner';
import { z } from "zod"
import { sendLearnerWelcomeEmail } from '@/lib/email/service'; // Import our email service
import { calculatePaginationRange, createPaginatedResponse } from '@/lib/pagination';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

/**
 * GET /api/admin/learners
 * 
 * Retrieves a list of learners (users with the 'Student' role).
 * Accessible by users with the 'Admin' or 'Staff' role.
 * Supports filtering by search term, client ID, and active status.
 * Supports pagination with page and pageSize parameters.
 */
export async function GET(request: NextRequest) {
  try {
    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequest(['Admin', 'Staff']);
    if ('error' in authResult) {
      return new NextResponse(JSON.stringify({ error: authResult.error }), {
        status: authResult.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const { user, claims, supabase } = authResult;

    // 2. Parse & Validate Query Parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Add pagination parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

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

    // Supabase client already available from authResult

    // Calculate pagination range for Supabase
    const { from, to } = calculatePaginationRange(page, pageSize);

    // 3. First get total count with filters - using separate count query
    let countQuery = supabase
      .from('students')
      .select('id', { count: 'exact' });
      
    // Apply search filter (case-insensitive on full_name and email)
    if (search) {
      const escapedSearch = search.replace(/[%_\\]/g, '\\$&');
      countQuery = countQuery.or(`full_name.ilike.%${escapedSearch}%,email.ilike.%${escapedSearch}%`);
    }

    // Apply client filter
    if (clientId) {
      countQuery = countQuery.eq('client_id', clientId);
    }

    // Apply active filter
    if (isActive !== undefined) { // Check if the parameter was provided
      countQuery = countQuery.eq('is_active', isActive === 'true');
    }
    
    const { count, error: countError } = await countQuery;
    
    if (countError) {
      console.error('Error counting learners:', countError);
      console.error('Count error details:', {
        message: countError.message,
        code: countError.code,
        details: countError.details,
        hint: countError.hint
      });
      return NextResponse.json({ error: 'Failed to count learners', details: countError.message }, { status: 500 });
    }

    // 4. Build Supabase Query for paginated data
    let query = supabase
      .from('students')
      .select('id, created_at, updated_at, client_id, is_active, full_name, email, phone_number, star_rating, last_login_at, temporary_password, job_readiness_background_type, client:clients(id, name)');
      
    // Apply search filter (case-insensitive on full_name and email)
    if (search) {
      const escapedSearch = search.replace(/[%_\\]/g, '\\$&');
      query = query.or(`full_name.ilike.%${escapedSearch}%,email.ilike.%${escapedSearch}%`);
    }

    // Apply client filter
    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    // Apply active filter
    if (isActive !== undefined) { // Check if the parameter was provided
      query = query.eq('is_active', isActive === 'true');
    }

    // Add ordering and pagination
    query = query.order('full_name', { ascending: true })
                 .range(from, to);

    // Execute Query & Handle Response
    const { data: learners, error: dbError } = await query;

    if (dbError) {
      console.error('Supabase DB Error:', dbError);
      return new NextResponse(JSON.stringify({ error: 'Database error fetching learners' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create standardized paginated response
    const paginatedResponse = createPaginatedResponse(
      learners || [],
      count || 0,
      page,
      pageSize
    );

    return NextResponse.json(paginatedResponse);

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
  job_readiness_background_type: z.enum([
    'ECONOMICS', 
    'COMPUTER_SCIENCE', 
    'MARKETING', 
    'DESIGN', 
    'HUMANITIES', 
    'BUSINESS_ADMINISTRATION', 
    'DATA_SCIENCE',
    'ENGINEERING',
    'HEALTHCARE',
    'OTHER'
  ]),
})

/**
 * POST /api/admin/learners
 * 
 * Create a new learner
 */
export async function POST(request: Request) {
  try {
    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequest(['Admin', 'Staff']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;
    
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
    
    // 1. Create auth user first - note: this requires admin privileges
    // For now, we'll create the student record without auth user creation
    
    // Note: Creating auth users requires admin privileges
    // For now, we'll generate a UUID and create student record without auth user
    const authUserId = crypto.randomUUID();
    const authUser = { user: { id: authUserId } };
    
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
        temporary_password: randomPassword, // Store the temporary password in the database
        job_readiness_background_type: learnerData.job_readiness_background_type,
      })
      .select()
      .single()
    
    if (createError) {
      console.error('Error creating learner:', createError)
      // Note: Since we're not creating auth users, no cleanup needed
      return NextResponse.json({ error: "Failed to create learner", details: createError.message }, { status: 500 })
    }
    
    // 3. Send welcome email with login credentials
    try {
      await sendLearnerWelcomeEmail(
        learnerData.email, 
        randomPassword,
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://cultus-platform.com'}/app/login`
      );
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
