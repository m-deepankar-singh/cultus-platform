import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
    QuestionIdSchema,
    UpdateQuestionApiSchema,
    QuestionBankType // Import QuestionBankType for DELETE query param validation
} from '@/lib/schemas/question';

// --- PUT Handler (Update Question - Step 5) ---
export async function PUT(
    request: Request,
    { params }: { params: { questionId: string } }
) {
    try {
        const supabase = await createClient();

        // 1. Get authenticated user & role
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        if (profileError || !profile || profile.role !== 'Admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Validate Route Parameter
        const idValidationResult = QuestionIdSchema.safeParse(params);
        if (!idValidationResult.success) {
            return NextResponse.json(
                { error: 'Invalid Question ID format', details: idValidationResult.error.flatten() },
                { status: 400 }
            );
        }
        const { questionId } = idValidationResult.data;

        // 3. Parse & Validate Request Body
        const body = await request.json();
        const validationResult = UpdateQuestionApiSchema.safeParse(body);

        if (!validationResult.success) {
            console.error(`PUT /api/admin/question-banks/${questionId}: Validation Error`, validationResult.error.flatten());
            return NextResponse.json(
                { error: 'Invalid request body', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        // 4. Extract data and determine target table
        const { bank_type, ...updateData } = validationResult.data;

        // Ensure there's something to update besides bank_type (which isn't stored)
        if (Object.keys(updateData).length === 0) {
             return NextResponse.json(
                { error: 'Request body must contain fields to update.' },
                { status: 400 }
            );
        }

        const tableName = bank_type === 'course' ? 'course_questions' : 'assessment_questions';

        // 5. Update Question in the database
        const { data: updatedQuestion, error: dbError } = await supabase
            .from(tableName)
            .update(updateData)
            .eq('id', questionId)
            .select()
            .single();

        if (dbError) {
            console.error(`PUT /api/admin/question-banks/${questionId}: DB Error updating ${tableName}`, dbError);
            // Handle potential errors like not found (e.g., if dbError.code indicates no rows updated)
             if (dbError.code === 'PGRST116') { // PostgREST code for "Matching row not found"
                return NextResponse.json({ error: 'Question not found' }, { status: 404 });
            }
            return NextResponse.json({ error: 'Database error while updating question.', details: dbError.message }, { status: 500 });
        }

         // This check is redundant if using .single() which errors on no rows, but good practice if not using .single()
        if (!updatedQuestion) {
             return NextResponse.json({ error: 'Question not found' }, { status: 404 });
        }

        // 6. Return updated question data
        return NextResponse.json(updatedQuestion, { status: 200 });

    } catch (error) {
        console.error(`PUT /api/admin/question-banks/[questionId]: Unexpected Error`, error);
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
}

// --- DELETE Handler (Delete Question - Step 6) ---
export async function DELETE(
    request: Request, // request is needed to get query params
    { params }: { params: { questionId: string } }
) {
     try {
        const supabase = await createClient();

        // 1. Get authenticated user & role (same as PUT)
        const { data: { user }, error: authError } = await supabase.auth.getUser();
         if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        if (profileError || !profile || profile.role !== 'Admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Validate Route Parameter
        const idValidationResult = QuestionIdSchema.safeParse(params);
        if (!idValidationResult.success) {
            return NextResponse.json(
                { error: 'Invalid Question ID format', details: idValidationResult.error.flatten() },
                { status: 400 }
            );
        }
        const { questionId } = idValidationResult.data;

        // 3. Validate Query Parameter (`type`)
        const { searchParams } = new URL(request.url);
        const typeResult = QuestionBankType.safeParse(searchParams.get('type'));

        if (!typeResult.success) {
             return NextResponse.json(
                { error: 'Missing or invalid query parameter: type', details: typeResult.error.flatten() },
                { status: 400 }
            );
        }
        const type = typeResult.data;

        // 4. Determine Target Table
        const tableName = type === 'course' ? 'course_questions' : 'assessment_questions';

        // 5. Perform Deletion
        // TODO: Consider adding dependency checks here before deletion if needed
        // e.g., check if questionId exists in `module_quiz_questions` or `assessment_module_questions`
        const { error: dbError, count } = await supabase
            .from(tableName)
            .delete({ count: 'exact' }) // Get the count of deleted rows
            .eq('id', questionId);

        if (dbError) {
             console.error(`DELETE /api/admin/question-banks/${questionId}: DB Error deleting from ${tableName}`, dbError);
            return NextResponse.json({ error: 'Database error while deleting question.', details: dbError.message }, { status: 500 });
        }

        // Check if a row was actually deleted
        if (count === 0) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 });
        }

        // 6. Return success (No Content)
        return new NextResponse(null, { status: 204 });

    } catch (error) {
        console.error(`DELETE /api/admin/question-banks/[questionId]: Unexpected Error`, error);
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
} 