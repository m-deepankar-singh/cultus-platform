import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getUserSessionAndRole } from '@/lib/supabase/utils';
import { z } from 'zod';
import { sendLearnerWelcomeEmail } from '@/lib/email/service';

// Schema for validating each learner
const LearnerSchema = z.object({
  full_name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email format" }),
  phone_number: z.string()
    .optional()
    .nullable()
    .default(null)
    .refine(val => !val || !val.includes('+'), { 
      message: "Phone number should not include the '+' prefix" 
    }),
  client_id: z.string().uuid({ message: "Invalid client ID format" }),
  is_active: z.union([
    z.boolean(),
    z.string().transform(val => val.toLowerCase() === 'true').pipe(z.boolean()),
    z.number().transform(val => val === 1).pipe(z.boolean()),
  ]).default(true),
  job_readiness_background_type: z.enum([
    'ECONOMICS', 
    'COMPUTER_SCIENCE', 
    'MARKETING', 
    'DESIGN', 
    'HUMANITIES', 
    'BUSINESS', 
    'ENGINEERING'
  ]),
});

type LearnerSchemaType = z.infer<typeof LearnerSchema>;

// Interface for parsed learner data with additional fields
interface ProcessedLearnerData extends LearnerSchemaType {
  client_name?: string;
  _errors?: Record<string, string>;
}

// Schema for the bulk upload request (both preview and final submission)
const BulkUploadPayloadSchema = z.object({
  learners: z.array(z.any()) // Raw data from Excel, will be parsed by LearnerSchema
});

// Define batch size for processing
const BATCH_SIZE = 50;

/**
 * POST /api/admin/learners/bulk-upload
 * 
 * Validates and previews the uploaded Excel data.
 * Returns the parsed data with validation errors if any.
 * This acts as the parse-preview endpoint.
 */
export async function POST(request: Request) {
  try {
    // 1. Authentication & Authorization
    const { user, profile, role, error: sessionError } = await getUserSessionAndRole();

    if (sessionError || !user || !profile) {
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

    // 2. Parse and validate the request body
    const body = await request.json();
    const payloadValidation = BulkUploadPayloadSchema.safeParse(body);
    
    if (!payloadValidation.success) {
      return new NextResponse(JSON.stringify({ 
        error: "Invalid payload structure", 
        details: payloadValidation.error.format() 
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    const { learners: uploadedLearners } = payloadValidation.data;
    
    if (!uploadedLearners || uploadedLearners.length === 0) {
        return new NextResponse(JSON.stringify({ error: "No learner data provided"}), {
            status: 400, headers: { 'Content-Type': 'application/json' }
        });
    }

    // 3. Get client list for validation and display
    const supabase = await createClient();
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name');
      
    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      return new NextResponse(JSON.stringify({ error: 'Failed to fetch clients for validation' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const clientMap = (clients || []).reduce((map, client) => {
      map[client.id] = client.name;
      return map;
    }, {} as Record<string, string>);
    
    // 4. Process and validate each learner
    const processedLearners = uploadedLearners.map((learnerData: any, index: number) => {
      const validationResult = LearnerSchema.safeParse(learnerData);
      const errors: Record<string, string> = {};

      if (!validationResult.success) {
        const fieldErrors = validationResult.error.flatten().fieldErrors;
        for (const fieldKey in fieldErrors) {
          const key = fieldKey as keyof LearnerSchemaType;
          if (fieldErrors[key] && fieldErrors[key]!.length > 0) {
            errors[key] = fieldErrors[key]![0];
          }
        }
      } else {
        // Additional business logic validation after Zod parsing
        if (!clientMap[validationResult.data.client_id]) {
          errors.client_id = "Client ID not found or invalid.";
        }
      }
      
      // Check for duplicate emails within the batch (case-insensitive)
      const currentEmail = (learnerData.email || '').toString().toLowerCase();
      if (currentEmail) {
        const duplicateIndex = uploadedLearners.findIndex((otherLearner: any, otherIndex: number) => 
            index !== otherIndex && (otherLearner.email || '').toString().toLowerCase() === currentEmail
        );
        if (duplicateIndex !== -1) {
            errors.email = errors.email ? `${errors.email}; Duplicate in batch` : "Duplicate email found in this upload batch.";
        }
      }

      return {
        ...learnerData, // Return original data plus client_name and errors
        client_name: clientMap[learnerData.client_id as string] || 'Invalid/Unknown Client ID',
        is_active: validationResult.success ? validationResult.data.is_active : (learnerData.is_active === 'true' || learnerData.is_active === true || learnerData.is_active === 1),
        _errors: Object.keys(errors).length > 0 ? errors : undefined,
      };
    });
    
    // 5. Return the processed data for preview
    return NextResponse.json({ learners: processedLearners }, { headers: { 'Content-Type': 'application/json' } });
    
  } catch (error) {
    console.error('API Error (Preview/Validation):', error);
    let errorMessage = 'Internal Server Error during preview/validation';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return new NextResponse(JSON.stringify({ error: 'An unexpected error occurred', details: errorMessage }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * PUT /api/admin/learners/bulk-upload
 * 
 * Handles the final submission of bulk learner data.
 * Creates accounts for all validated learners in batches.
 */
export async function PUT(request: Request) {
  try {
    // 1. Authentication & Authorization (same as POST)
    const { user, profile, role, error: sessionError } = await getUserSessionAndRole();
    if (sessionError || !user || !profile || !role || !["Admin", "Staff"].includes(role)) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized or Forbidden' }), {
        status: role ? 403 : 401, headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Parse and validate the request body
    const body = await request.json();
    const payloadValidation = BulkUploadPayloadSchema.safeParse(body);
    if (!payloadValidation.success || !payloadValidation.data.learners || payloadValidation.data.learners.length === 0) {
      return new NextResponse(JSON.stringify({ error: 'Invalid or empty learner data provided' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }
    const { learners: learnersToSubmit } = payloadValidation.data;

    // 3. Set up clients
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    
    // 4. Re-validate each learner and check for existing emails in DB
    const emailsToCreate = learnersToSubmit.map((l: any) => (l.email || '').toString().toLowerCase()).filter(Boolean);
    const { data: existingDbLearners, error: dbCheckError } = await supabase
      .from('students')
      .select('email')
      .in('email', emailsToCreate);

    if (dbCheckError) {
      console.error('DB error checking existing learners:', dbCheckError);
      return new NextResponse(JSON.stringify({ error: 'Failed to verify existing learners' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }
    const existingDbEmails = new Set((existingDbLearners || []).map(s => (s.email || '').toLowerCase()));

    const successfulLearners: any[] = [];
    const failedLearners: any[] = [];
    const existingEmailsInBatch = new Set<string>();

    // Process learners in batches for better performance
    for (let i = 0; i < learnersToSubmit.length; i += BATCH_SIZE) {
      const batch = learnersToSubmit.slice(i, i + BATCH_SIZE);
      
      // Process batch
      await Promise.all(batch.map(async (learnerData: any) => {
        const validationResult = LearnerSchema.safeParse(learnerData);
        if (!validationResult.success) {
          failedLearners.push({ 
            email: learnerData.email, 
            error: "Invalid data structure (pre-DB check)", 
            details: validationResult.error.flatten().fieldErrors 
          });
          return;
        }

        const finalLearnerData = validationResult.data;
        const emailLower = finalLearnerData.email.toLowerCase();

        if (existingDbEmails.has(emailLower)) {
          failedLearners.push({ email: finalLearnerData.email, error: "Email already exists in the database" });
          return;
        }
        
        // Check for duplicates within the current successful batch
        if (existingEmailsInBatch.has(emailLower)) {
          failedLearners.push({ email: finalLearnerData.email, error: "Duplicate email within this submission batch (already processed)." });
          return;
        }

        try {
          const randomPassword = Math.random().toString(36).slice(-12); // Simple random password
          const { data: authUser, error: createAuthError } = await serviceClient.auth.admin.createUser({
            email: finalLearnerData.email,
            password: randomPassword,
            email_confirm: true, // Auto-confirm email
          });

          if (createAuthError || !authUser?.user) {
            throw new Error(createAuthError?.message || 'Failed to create auth user');
          }

          const { data: newDbLearner, error: createDbError } = await supabase
            .from('students')
            .insert({
              id: authUser.user.id,
              full_name: finalLearnerData.full_name,
              email: finalLearnerData.email,
              phone_number: finalLearnerData.phone_number,
              client_id: finalLearnerData.client_id,
              is_active: finalLearnerData.is_active,
              temporary_password: randomPassword,
              job_readiness_background_type: finalLearnerData.job_readiness_background_type,
            })
            .select('id, full_name, email') // Select only necessary fields for response
            .single();

          if (createDbError) {
            await serviceClient.auth.admin.deleteUser(authUser.user.id); // Rollback auth user
            throw new Error(createDbError.message || 'Failed to create learner record in DB');
          }
          
          existingDbEmails.add(emailLower); // Add to set to prevent re-processing in this batch
          existingEmailsInBatch.add(emailLower);
          successfulLearners.push(newDbLearner);

          try {
            await sendLearnerWelcomeEmail(
              finalLearnerData.email, 
              randomPassword,
              `${process.env.NEXT_PUBLIC_APP_URL || 'https://cultus-platform.com'}/app/login`
            );
          } catch (emailError) {
            console.warn(`Failed to send welcome email to ${finalLearnerData.email}:`, emailError);
            // Log but don't fail the entire learner creation for this
          }

        } catch (processingError) {
          failedLearners.push({ 
            email: finalLearnerData.email, 
            error: processingError instanceof Error ? processingError.message : 'Unknown processing error' 
          });
        }
      }));
    }
    
    // 7. Return the results
    return NextResponse.json({
      message: "Bulk upload process completed.",
      successCount: successfulLearners.length,
      failedCount: failedLearners.length,
      processedCount: learnersToSubmit.length,
      successful_learners: successfulLearners.map(l => l.email),
      failed_submissions: failedLearners
    }, { headers: { 'Content-Type': 'application/json' } });
    
  } catch (error) {
    console.error('API Error (Submission):', error);
    return new NextResponse(JSON.stringify({ error: 'An unexpected error occurred during final submission' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
} 