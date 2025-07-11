import { NextResponse } from 'next/server';
// import { getUserSessionAndRole } from '@/lib/auth/utils'; // Removed incorrect assumption
import { QuestionBankQuerySchema, QuestionApiSchema } from '@/lib/schemas/question';
import { createPaginatedResponse, calculatePaginationRange } from '@/lib/pagination';
import { authenticateApiRequestSecure } from '@/lib/auth/api-auth';
import { SELECTORS } from '@/lib/api/selectors';

export async function GET(request: Request) {
    try {
        // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
        const authResult = await authenticateApiRequestSecure(['Admin']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { supabase } = authResult;

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

        const { type, search, tag, page = '1', pageSize = '10' } = validationResult.data;

        // Convert pagination params to numbers
        const pageNum = parseInt(page as string);
        const pageSizeNum = parseInt(pageSize as string);
        
        // Calculate range for pagination
        const { from, to } = calculatePaginationRange(pageNum, pageSizeNum);

        // Always use assessment_questions table since course_questions doesn't exist
        const tableName = 'assessment_questions';

        // Build Supabase Query for count
        let countQuery = supabase.from(tableName).select('id', { count: 'exact' });

        if (search) {
            countQuery = countQuery.ilike('question_text', `%${search}%`);
        }

        if (tag) {
            countQuery = countQuery.contains('tags', [tag]);
        }

        // Execute count query
        const { count, error: countError } = await countQuery;

        if (countError) {
            console.error(`GET /api/admin/question-banks: DB Error counting ${tableName}`, countError);
            return NextResponse.json({ error: 'Database error while counting questions.', details: countError.message }, { status: 500 });
        }

        // Build Supabase Query for data
        let dataQuery = supabase.from(tableName).select(SELECTORS.QUESTION_BANK.LIST); // 📊 OPTIMIZED: Specific fields only

        if (search) {
            dataQuery = dataQuery.ilike('question_text', `%${search}%`);
        }

        if (tag) {
            dataQuery = dataQuery.contains('tags', [tag]);
        }

        dataQuery = dataQuery
            .order('created_at', { ascending: false })
            .range(from, to);

        // Execute Query & Handle Response
        const { data: questions, error: dbError } = await dataQuery;

        if (dbError) {
            console.error(`GET /api/admin/question-banks: DB Error fetching from ${tableName}`, dbError);
            return NextResponse.json({ error: 'Database error while fetching questions.', details: dbError.message }, { status: 500 });
        }

        // Format all questions with bankType property
        const formattedQuestions = (questions || []).map((q: any) => ({ ...q, bankType: 'assessment' }));

        // Create paginated response
        const paginatedResponse = createPaginatedResponse(
            formattedQuestions,
            count || 0,
            pageNum,
            pageSizeNum
        );

        return NextResponse.json(paginatedResponse, { status: 200 });

    } catch (error) {
        console.error('GET /api/admin/question-banks: Unexpected Error', error);
        // Log the error details (e.g., using a logging service)
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
        const authResult = await authenticateApiRequestSecure(['Admin']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { supabase } = authResult;

        // Parse & Validate Request Body
        const body = await request.json();
        const validationResult = QuestionApiSchema.safeParse(body);

        if (!validationResult.success) {
            console.error('POST /api/admin/question-banks: Validation Error', validationResult.error.flatten());
            return NextResponse.json(
                { error: 'Invalid request body', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        // Extract data - always use assessment_questions table
        const { bank_type, ...questionData } = validationResult.data;
        const tableName = 'assessment_questions';

        // Insert Question into the database
        const { data: newQuestion, error: dbError } = await supabase
            .from(tableName)
            .insert(questionData)
            .select(SELECTORS.QUESTION_BANK.DETAIL) // 📊 OPTIMIZED: Specific fields only
            .single();

        if (dbError) {
            console.error(`POST /api/admin/question-banks: DB Error inserting into ${tableName}`, dbError);
            // Consider more specific error handling (e.g., constraint violations -> 409 Conflict?)
            return NextResponse.json({ error: 'Database error while creating question.', details: dbError.message }, { status: 500 });
        }

        // Return new question data
        return NextResponse.json(newQuestion, { status: 201 });

    } catch (error) {
        console.error('POST /api/admin/question-banks: Unexpected Error', error);
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
} 