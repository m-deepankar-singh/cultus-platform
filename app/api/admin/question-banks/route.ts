import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
// import { getUserSessionAndRole } from '@/lib/auth/utils'; // Removed incorrect assumption
import { QuestionBankQuerySchema, QuestionApiSchema } from '@/lib/schemas/question';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        // const { user, error: authError, role: assumedRole } = await getUserSessionAndRole(supabase); // Old way

        // 1. Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('GET /api/admin/question-banks: Auth Error', authError);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Fetch user role from your profiles table (adjust table/column names if needed)
        const { data: profile, error: profileError } = await supabase
            .from('profiles') // ASSUMPTION: Profiles table stores roles
            .select('role')   // ASSUMPTION: Role column name is 'role'
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            console.error(`GET /api/admin/question-banks: Profile/Role fetch error for user ${user.id}`, profileError);
            // Decide if this is a 403 (Forbidden) or 500 (Internal Server Error)
            // If a user exists but has no profile/role, Forbidden might be appropriate.
            return NextResponse.json({ error: 'Could not retrieve user role.' }, { status: 403 });
        }

        const userRole = profile.role;

        // 3. Authorization based on fetched role
        if (userRole !== 'Admin') {
            console.warn(`GET /api/admin/question-banks: User ${user.id} with role ${userRole} attempted access.`);
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Parse & Validate Query Parameters
        const { searchParams } = new URL(request.url);
        const queryParams = Object.fromEntries(searchParams.entries());
        const validationResult = QuestionBankQuerySchema.safeParse(queryParams);

        if (!validationResult.success) {
            console.error('GET /api/admin/question-banks: Validation Error', validationResult.error.flatten());
            return NextResponse.json(
                { error: 'Invalid query parameters', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        const { type, search, tag } = validationResult.data;

        // Always use assessment_questions table since course_questions doesn't exist
        const tableName = 'assessment_questions';

        // Build Supabase Query
        let query = supabase.from(tableName).select('*');

        if (search) {
            query = query.ilike('question_text', `%${search}%`);
        }

        if (tag) {
            query = query.contains('tags', [tag]);
        }

        query = query.order('created_at', { ascending: false });

        // Execute Query & Handle Response
        const { data: questions, error: dbError } = await query;

        if (dbError) {
            console.error(`GET /api/admin/question-banks: DB Error fetching from ${tableName}`, dbError);
            return NextResponse.json({ error: 'Database error while fetching questions.', details: dbError.message }, { status: 500 });
        }

        return NextResponse.json(questions || [], { status: 200 });

    } catch (error) {
        console.error('GET /api/admin/question-banks: Unexpected Error', error);
        // Log the error details (e.g., using a logging service)
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // 1. Get authenticated user & role (same logic as GET)
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        if (profileError || !profile) {
            return NextResponse.json({ error: 'Could not retrieve user role.' }, { status: 403 });
        }
        const userRole = profile.role;
        if (userRole !== 'Admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Parse & Validate Request Body
        const body = await request.json();
        const validationResult = QuestionApiSchema.safeParse(body);

        if (!validationResult.success) {
            console.error('POST /api/admin/question-banks: Validation Error', validationResult.error.flatten());
            return NextResponse.json(
                { error: 'Invalid request body', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        // 3. Extract data - always use assessment_questions table
        const { bank_type, ...questionData } = validationResult.data;
        const tableName = 'assessment_questions';

        // 4. Insert Question into the database
        const { data: newQuestion, error: dbError } = await supabase
            .from(tableName)
            .insert(questionData)
            .select()
            .single();

        if (dbError) {
            console.error(`POST /api/admin/question-banks: DB Error inserting into ${tableName}`, dbError);
            // Consider more specific error handling (e.g., constraint violations -> 409 Conflict?)
            return NextResponse.json({ error: 'Database error while creating question.', details: dbError.message }, { status: 500 });
        }

        // 5. Return new question data
        return NextResponse.json(newQuestion, { status: 201 });

    } catch (error) {
        console.error('POST /api/admin/question-banks: Unexpected Error', error);
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
} 