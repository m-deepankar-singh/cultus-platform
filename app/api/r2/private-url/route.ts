import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '@/lib/r2/s3-client';
import { authenticateApiRequest } from "@/lib/auth/api-auth";

// Request validation schema
const privateUrlRequestSchema = z.object({
  object_key: z.string().min(1, "Object key is required"),
  expires_in: z.number().min(60).max(86400).optional().default(3600), // 1 minute to 24 hours, default 1 hour
  purpose: z.string().optional(), // For audit logging
});

type PrivateUrlRequest = z.infer<typeof privateUrlRequestSchema>;

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request - Admin, Staff, and Students can access private files
    // But authorization will be checked based on file ownership
    const authResult = await authenticateApiRequest(['Admin', 'Staff', 'Student']);
    if ('error' in authResult) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Authentication required",
          code: "UNAUTHORIZED" 
        },
        { status: 401 }
      );
    }

    const { user, claims } = authResult;

    // Parse and validate request body
    const body = await request.json();
    
    let validatedData: PrivateUrlRequest;
    try {
      validatedData = privateUrlRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid request data",
            code: "VALIDATION_ERROR",
            details: error.errors,
          },
          { status: 400 }
        );
      }
      throw error;
    }

    const { object_key, expires_in, purpose } = validatedData;

    // Authorization check based on user role and file path
    const authorizationResult = await authorizePrivateFileAccess(
      { id: user.id, role: claims.user_role || 'Student', client_id: claims.client_id },
      object_key
    );

    if (!authorizationResult.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: authorizationResult.reason || "Not authorized to access this file",
          code: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    // Verify file exists before generating download URL
    try {
      const bucketName = process.env.R2_BUCKET_NAME!;
      const headCommand = new HeadObjectCommand({
        Bucket: bucketName,
        Key: object_key,
      });
      
      await s3Client.send(headCommand);
    } catch (error) {
      console.error("Error checking file metadata:", error);
      return NextResponse.json(
        {
          success: false,
          error: "File not found or inaccessible",
          code: "FILE_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Generate presigned download URL
    try {
      const bucketName = process.env.R2_BUCKET_NAME!;
      const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: object_key,
      });
      
      const downloadUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: expires_in });

      // Log the access request for audit purposes
      console.log(`Private file access requested by user ${user.id}:`, {
        objectKey: object_key,
        purpose: purpose || 'download',
        expiresIn: expires_in,
        userRole: claims.user_role,
        clientId: claims.client_id,
      });

      // TODO: In the future, implement:
      // 1. Access logging in database for audit trails
      // 2. Download tracking and analytics
      // 3. Rate limiting per user/file
      // 4. Access analytics and reporting

      return NextResponse.json({
        success: true,
        data: {
          download_url: downloadUrl,
          object_key: object_key,
          expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
          expires_in: expires_in,
          purpose: purpose || 'download',
        },
      });

    } catch (error) {
      console.error("Error generating private download URL:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to generate download URL",
          code: "URL_GENERATION_FAILED",
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error processing private URL request:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

// Authorization helper function for private file access
async function authorizePrivateFileAccess(
  user: { id: string; role: string; client_id?: string },
  objectKey: string
): Promise<{ authorized: boolean; reason?: string }> {
  
  // Admin users can access any private file
  if (user.role === "Admin") {
    return { authorized: true };
  }

  // Staff users can access most private files
  if (user.role === "Staff") {
    // Staff can access interview recordings and student submissions for oversight
    if (objectKey.includes('interview-recording') || objectKey.includes('student-submission')) {
      return { authorized: true };
    }
    return { authorized: true }; // For now, allow all access for staff
  }

  // Students can only access their own submissions
  if (user.role === "Student") {
    // Check if the object key contains the user's ID or is associated with them
    // This is a basic check - in production, you'd want to query the database
    // to verify ownership of the file
    if (objectKey.includes(user.id)) {
      return { authorized: true };
    }
    
    // TODO: Implement proper ownership check by:
    // 1. Querying the file_uploads table (when implemented)
    // 2. Checking submission ownership in relevant tables
    // 3. Verifying client_id matches for organization-level access
    
    return { 
      authorized: false, 
      reason: "Students can only access their own files" 
    };
  }

  return { 
    authorized: false, 
    reason: "Unknown user role or insufficient permissions" 
  };
}

// Health check endpoint
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      service: "R2 Private URL Service",
      timestamp: new Date().toISOString(),
      endpoints: {
        generateUrl: "POST /api/r2/private-url",
        description: "Generate time-limited download URLs for private files"
      },
      security: {
        authentication: "Required (JWT)",
        authorization: "Role-based + file ownership",
        expiration: "60 seconds to 24 hours (configurable)"
      }
    });
  } catch (error) {
    console.error("Private URL service health check failed:", error);
    return NextResponse.json(
      {
        success: false,
        service: "R2 Private URL Service", 
        error: "Service unavailable",
      },
      { status: 503 }
    );
  }
} 