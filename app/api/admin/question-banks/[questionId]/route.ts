import { NextResponse } from 'next/server';
import {
    QuestionIdSchema,
    UpdateQuestionApiSchema,
    QuestionBankType // Import QuestionBankType for DELETE query param validation
} from '@/lib/schemas/question';
import { authenticateApiRequestSecure } from '@/lib/auth/api-auth';

interface RouteParams {
    params: Promise<{ questionId: string }>;
}

// --- GET Handler (Get Question Details) ---
export async function GET(request: Request, { params }: RouteParams) {
    try {
        // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
        const authResult = await authenticateApiRequestSecure(['Admin']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { supabase } = authResult;

        // Get params asynchronously
        const { questionId } = await params;
        
        // Validate the question ID
        const validationResult = QuestionIdSchema.safeParse({ questionId });
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Invalid question ID', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }
        // We already have the validated questionId

        // Fetch the question (try assessment_questions first)
        const { data: question, error: questionError } = await supabase
            .from('assessment_questions')
            .select('*')
            .eq('id', questionId)
            .single();

        if (questionError && questionError.code !== 'PGRST116') { // Not found error code
            return NextResponse.json({ error: 'Database error', details: questionError.message }, { status: 500 });
        }

        if (!question) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 });
        }

        return NextResponse.json(question, { status: 200 });
    } catch (error) {
        console.error('GET /api/admin/question-banks/[questionId]: Unexpected Error', error);
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
}

// --- PUT Handler (Update Question - Step 5) ---
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
        const authResult = await authenticateApiRequestSecure(['Admin']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { supabase } = authResult;

        // Get params asynchronously
        const { questionId } = await params;
        
        // Validate the question ID
        const validationResult = QuestionIdSchema.safeParse({ questionId });
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Invalid question ID', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }
        // We already have the validated questionId

        // Validate request body
        const body = await request.json();
        const bodyValidation = UpdateQuestionApiSchema.safeParse(body);
        if (!bodyValidation.success) {
            return NextResponse.json(
                { error: 'Invalid request body', details: bodyValidation.error.flatten() },
                { status: 400 }
            );
        }

        // Extract and prepare data for update
        const { bank_type, ...questionData } = bodyValidation.data;

        // Always use assessment_questions table
        const tableName = 'assessment_questions';

        // Check if question exists
        const { data: existingQuestion, error: checkError } = await supabase
            .from(tableName)
            .select('id')
            .eq('id', questionId) // Use extracted variable
            .single();

        if (checkError) {
            if (checkError.code === 'PGRST116') { // Not found error code
                return NextResponse.json({ error: 'Question not found' }, { status: 404 });
            }
            return NextResponse.json({ error: 'Database error', details: checkError.message }, { status: 500 });
        }

        // Update the question
        const { data: updatedQuestion, error: updateError } = await supabase
            .from(tableName)
            .update(questionData)
            .eq('id', questionId) // Use extracted variable
            .select()
            .single();

        if (updateError) {
            return NextResponse.json({ error: 'Database error while updating question', details: updateError.message }, { status: 500 });
        }

        return NextResponse.json(updatedQuestion, { status: 200 });
    } catch (error) {
        console.error('PUT /api/admin/question-banks/[questionId]: Unexpected Error', error);
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
}

// --- DELETE Handler (Delete Question - Step 6) ---
export async function DELETE(request: Request, { params }: RouteParams) {
     try {
        // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
        const authResult = await authenticateApiRequestSecure(['Admin']);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const { claims, supabase } = authResult;

        // Get params asynchronously
        const { questionId } = await params;
        
        // Validate the question ID
        const validationResult = QuestionIdSchema.safeParse({ questionId });
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Invalid question ID', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }
        // We already have the validated questionId

        const userRole = claims?.user_role;

        // Check if user has appropriate role
        if (userRole !== 'Admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Always use assessment_questions table  
        const tableName = 'assessment_questions';

        // Check if question exists
        const { data: existingQuestion, error: checkError } = await supabase
            .from(tableName)
            .select('id')
            .eq('id', questionId)
            .single();

        if (checkError) {
            if (checkError.code === 'PGRST116') { // Not found error code
                return NextResponse.json({ error: 'Question not found' }, { status: 404 });
            }
            return NextResponse.json({ error: 'Database error', details: checkError.message }, { status: 500 });
        }

        // Delete the question
        const { error: deleteError } = await supabase
            .from(tableName)
            .delete()
            .eq('id', questionId);

        if (deleteError) {
            return NextResponse.json({ error: 'Database error while deleting question', details: deleteError.message }, { status: 500 });
        }

        return NextResponse.json({ message: 'Question deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error('DELETE /api/admin/question-banks/[questionId]: Unexpected Error', error);
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
} 