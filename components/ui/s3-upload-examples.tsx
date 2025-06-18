"use client";

import { S3FileUpload } from './s3-file-upload';

/**
 * Example usage for product image uploads
 * Use this in product forms where you need to upload images
 */
export function ProductImageUploadExample({ onImageUpload }: { onImageUpload: (url: string) => void }) {
  return (
    <S3FileUpload
      onUpload={onImageUpload}
      accept="image/*"
      uploadEndpoint="/api/admin/products/upload-image"
      maxSize={5} // 5MB limit for images
    />
  );
}

/**
 * Example usage for client logo uploads
 * Use this in client forms where you need to upload logos
 */
export function ClientLogoUploadExample({ onLogoUpload }: { onLogoUpload: (url: string) => void }) {
  return (
    <S3FileUpload
      onUpload={onLogoUpload}
      accept="image/*"
      uploadEndpoint="/api/admin/clients/upload-logo"
      maxSize={2} // 2MB limit for logos
    />
  );
}

/**
 * Example usage for lesson video uploads
 * Use this in lesson forms where you need to upload videos
 */
export function LessonVideoUploadExample({ onVideoUpload }: { onVideoUpload: (url: string) => void }) {
  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/admin/lessons/upload-video', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    
    if (result.success) {
      onVideoUpload(result.url);
    } else {
      throw new Error(result.error || 'Upload failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <input
          type="file"
          accept="video/mp4,video/webm"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
          className="hidden"
          id="lesson-upload"
        />
        <button
          onClick={() => document.getElementById('lesson-upload')?.click()}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Upload Lesson Video
        </button>
        <p className="text-sm text-gray-500 mt-2">
          Maximum file size: 500MB • MP4 and WebM only
        </p>
      </div>
    </div>
  );
}

/**
 * Example usage for expert session video uploads
 * Use this in expert session forms where you need to upload videos
 */
export function ExpertSessionVideoUploadExample({ 
  sessionId, 
  onVideoUpload 
}: { 
  sessionId: string;
  onVideoUpload: (url: string) => void;
}) {
  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', sessionId);

    const response = await fetch('/api/admin/job-readiness/expert-sessions/upload-video', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    
    if (result.success) {
      onVideoUpload(result.url);
    } else {
      throw new Error(result.error || 'Upload failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <input
          type="file"
          accept="video/mp4,video/webm"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
          className="hidden"
          id="expert-session-upload"
        />
        <button
          onClick={() => document.getElementById('expert-session-upload')?.click()}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Upload Expert Session Video
        </button>
        <p className="text-sm text-gray-500 mt-2">
          Maximum file size: 500MB
        </p>
      </div>
    </div>
  );
}

/**
 * Example usage for interview video uploads
 * Use this in interview forms where you need to upload videos
 */
export function InterviewVideoUploadExample({ 
  submissionId, 
  onVideoUpload 
}: { 
  submissionId: string;
  onVideoUpload: (url: string) => void;
}) {
  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('submissionId', submissionId);

    const response = await fetch('/api/admin/job-readiness/interviews/upload-video', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    
    if (result.success) {
      onVideoUpload(result.url);
    } else {
      throw new Error(result.error || 'Upload failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <input
          type="file"
          accept="video/mp4,video/webm"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
          className="hidden"
          id="interview-upload"
        />
        <button
          onClick={() => document.getElementById('interview-upload')?.click()}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Upload Interview Video
        </button>
        <p className="text-sm text-gray-500 mt-2">
          Maximum file size: 200MB
        </p>
      </div>
    </div>
  );
}