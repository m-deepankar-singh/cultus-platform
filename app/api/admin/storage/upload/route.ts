import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Assumes server client creator is here
import { authenticateApiRequest } from '@/lib/auth/api-auth';
import { UploadFileSchema } from '@/lib/schemas/storage'; // Import the file validation schema
import { ZodError } from 'zod';

/**
 * POST handler for uploading files (e.g., course videos) to Supabase Storage.
 * Requires Admin privileges.
 */
export async function POST(request: Request) {
  console.log('Received request to /api/admin/storage/upload');

  // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
  const authResult = await authenticateApiRequest(['Admin']);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { user, claims, supabase } = authResult;

  console.log(`Admin user ${user.id} authorized.`);

  // Process FormData and Validate File
  let file: File;
  try {
    const formData = await request.formData();
    const fileData = formData.get('file'); // Standard field name for file uploads

    // Use Zod schema to validate the file
    const validationResult = UploadFileSchema.safeParse(fileData);
    if (!validationResult.success) {
      // Log detailed Zod errors
      console.error('File validation failed:', validationResult.error.errors);
      // Return a user-friendly error message (e.g., the first issue)
      return NextResponse.json({ error: validationResult.error.errors[0]?.message || 'Invalid file provided.' }, { status: 400 });
    }
    
    file = validationResult.data; // Use the validated file object
    console.log(`File validated: ${file.name}, Size: ${file.size}, Type: ${file.type}`);

    // --- Optional Metadata Handling (Placeholder) ---
    // const metadataField = formData.get('metadata');
    // let metadata = {};
    // if (metadataField) {
    //   try {
    //     metadata = JSON.parse(metadataField as string);
    //     // const metadataValidation = UploadMetadataSchema.safeParse(metadata); // If using schema
    //     // if (!metadataValidation.success) { /* Handle validation error */ }
    //   } catch (e) {
    //     console.error('Failed to parse metadata:', e);
    //     return NextResponse.json({ error: 'Invalid metadata format.' }, { status: 400 });
    //   }
    // }
    // --- End Optional Metadata Handling ---

  } catch (error) {
    if (error instanceof ZodError) {
      // This case might be redundant due to safeParse but good as a fallback
      console.error('Zod validation error during FormData processing:', error.errors);
      return NextResponse.json({ error: error.errors[0]?.message || 'Invalid file input.' }, { status: 400 });
    }
    console.error('Error processing FormData:', error);
    return NextResponse.json({ error: 'Failed to process request data.' }, { status: 400 });
  }

  // Upload to Supabase Storage
  const bucketName = 'course-bucket'; // Changed from 'course-videos' to match the actual Supabase bucket
  let uploadDataPath: string | undefined;
  try {
    // Retrieve Supabase URL for constructing the full path later
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
        console.error('Error: NEXT_PUBLIC_SUPABASE_URL is not defined in environment variables.');
        return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    // Generate a unique file path using UUID (better strategy)
    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${crypto.randomUUID()}.${fileExtension}`;
    // Store directly in bucket root for now
    // Example path within bucket: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.mp4
    const filePath = `${uniqueFileName}`;

    console.log(`Attempting to upload to bucket '${bucketName}' with path: ${filePath}`);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600', // Optional: Cache control header
        upsert: false, // Don't overwrite existing files (UUID should prevent this anyway)
      });

    if (uploadError) {
      console.error(`Supabase Storage upload error: ${uploadError.message}`, uploadError);
      // Check for specific errors, e.g., bucket not found?
      if (uploadError.message.includes('Bucket not found')) {
          return NextResponse.json({ error: `Storage bucket '${bucketName}' not found. Please ensure it exists and RLS policies are set.` }, { status: 500 });
      }
      // Handle potential RLS errors (more specific check might be needed)
      if (uploadError.message.includes('policy') || uploadError.message.includes('authorized')) {
        return NextResponse.json({ error: `Storage policy error: ${uploadError.message}. Ensure Admin role has upload permission to bucket '${bucketName}'.` }, { status: 403 });
      }
      return NextResponse.json({ error: `Failed to upload file: ${uploadError.message}` }, { status: 500 });
    }

    if (!uploadData || !uploadData.path) {
      console.error('Supabase Storage upload failed silently (no data/path returned).');
      return NextResponse.json({ error: 'Storage upload failed unexpectedly.' }, { status: 500 });
    }
    
    uploadDataPath = uploadData.path; // Store path for final response
    console.log(`File successfully uploaded to bucket path: ${uploadData.path}`);

    // Get Public URL (Optional but useful)
    // Note: getPublicUrl requires the path relative to the bucket root, which uploadData.path provides.
    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(uploadData.path);
    const publicUrl = urlData?.publicUrl;
    console.log(`Public URL (if applicable): ${publicUrl}`);

    // Return Success Response
    // Construct the full URL using the Supabase project URL and the returned path
    const fullPath = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${uploadData.path}`;
    
    return NextResponse.json({
      message: 'File uploaded successfully.',
      path: uploadData.path, // Path within the bucket
      fullPath: fullPath,    // Full public URL (if bucket is public)
      publicUrl: publicUrl   // URL generated by getPublicUrl (may differ slightly)
    });

  } catch (error: any) {
    console.error('Unexpected error during file upload process:', error);
    // If upload succeeded but URL generation failed, still return partial success with path
    if (uploadDataPath) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const fullPath = supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/${bucketName}/${uploadDataPath}` : null;
        return NextResponse.json({
          message: 'File uploaded, but failed to get public URL.',
          path: uploadDataPath,
          fullPath: fullPath,
          publicUrl: null,
          errorInfo: 'Failed to retrieve public URL after upload.'
        }, { status: 207 }); // Multi-Status
    }
    return NextResponse.json({ error: 'An unexpected server error occurred during upload.' }, { status: 500 });
  }
}
