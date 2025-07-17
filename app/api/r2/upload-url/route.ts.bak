import { NextRequest, NextResponse } from "next/server";

// ⚠️ DEPRECATED: This endpoint is deprecated and should not be used.
// Use the new upload system instead:
// - /api/admin/products/upload-image (for product images)
// - /api/admin/clients/upload-logo (for client logos)
// - /api/admin/lessons/upload-video (for lesson videos)
// - /api/r2/presigned-upload (for direct uploads - expert sessions & interviews)

export async function POST() {
  return NextResponse.json(
    { 
      success: false, 
      error: "This endpoint is deprecated. Please use the new S3 upload endpoints instead.",
      code: "DEPRECATED_ENDPOINT",
      migration_guide: {
        "client-logo": "/api/admin/clients/upload-logo",
        "product-image": "/api/admin/products/upload-image", 
        "course-material": "/api/admin/lessons/upload-video",
        "interview-recording": "/api/r2/presigned-upload (direct upload)",
        "expert-session": "/api/r2/presigned-upload (direct upload)"
      }
    },
    { status: 410 } // 410 Gone - indicates the endpoint is permanently unavailable
  );
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    success: false,
    error: "This health check endpoint is deprecated. The new S3 upload system is active.",
    healthy: false,
    service: "Deprecated R2 Storage Service",
    timestamp: new Date().toISOString(),
    migration_info: "All uploads now use direct S3 endpoints with simplified architecture."
  }, { status: 410 });
} 