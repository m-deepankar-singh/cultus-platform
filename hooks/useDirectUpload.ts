import { useState, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UseDirectUploadOptions {
  uploadType: 'expertSessions' | 'lessonVideos' | 'interviewRecordings';
  onProgress?: (progress: UploadProgress) => void;
  onSuccess?: (result: { key: string; publicUrl: string }) => void;
  onError?: (error: string) => void;
}

export function useDirectUpload(options: UseDirectUploadOptions) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const uploadFile = useCallback(async (file: File, metadata?: Record<string, string>) => {
    setUploading(true);
    setProgress(null);

    try {
      console.log('Starting upload for file:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      // Step 1: Get presigned URL
      console.log('Requesting presigned URL...');
      const presignedResponse = await fetch('/api/r2/presigned-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          uploadType: options.uploadType,
          metadata,
        }),
      });

      console.log('Presigned URL response status:', presignedResponse.status);

      if (!presignedResponse.ok) {
        const errorData = await presignedResponse.json();
        console.error('Presigned URL error:', errorData);
        throw new Error(errorData.error || `Failed to get upload URL (${presignedResponse.status})`);
      }

      const { uploadUrl, publicUrl, key } = await presignedResponse.json();
      console.log('Presigned URL received, uploading to:', uploadUrl);

      // Step 2: Upload directly to R2 with progress tracking
      const xhr = new XMLHttpRequest();

      // Set up progress tracking
      if (options.onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progressData = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100),
            };
            setProgress(progressData);
            options.onProgress?.(progressData);
          }
        });
      }

      // Create promise for XMLHttpRequest
      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          console.log('Upload response status:', xhr.status);
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log('Upload successful');
            resolve();
          } else {
            console.error('Upload failed with status:', xhr.status, xhr.statusText);
            console.error('Response text:', xhr.responseText);
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
          }
        };

        xhr.onerror = (event) => {
          console.error('XMLHttpRequest error event:', event);
          console.error('Network state:', xhr.readyState);
          console.error('HTTP status:', xhr.status);
          reject(new Error('Network error during upload - check internet connection and CORS configuration'));
        };

        xhr.onabort = () => {
          console.log('Upload aborted');
          reject(new Error('Upload aborted'));
        };

        xhr.ontimeout = () => {
          console.error('Upload timeout');
          reject(new Error('Upload timeout - file may be too large or connection too slow'));
        };
      });

      // Set timeout for large files (10 minutes)
      xhr.timeout = 10 * 60 * 1000;

      // Start the upload
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      
      console.log('Starting file upload...');
      xhr.send(file);

      // Wait for upload completion
      await uploadPromise;

      // Step 3: Success callback
      const result = { key, publicUrl };
      options.onSuccess?.(result);
      
      toast({
        title: 'Upload successful',
        description: `${file.name} uploaded successfully`,
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      console.error('Upload error details:', {
        error,
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      options.onError?.(errorMessage);
      
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: errorMessage,
      });
      
      throw error;
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }, [options]);

  const cancelUpload = useCallback(() => {
    // Implementation for cancelling uploads would go here
    // This would require storing the XMLHttpRequest reference
    setUploading(false);
    setProgress(null);
  }, []);

  return {
    uploadFile,
    uploading,
    progress,
    cancelUpload,
  };
} 