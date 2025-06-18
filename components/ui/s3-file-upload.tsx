"use client";

import { useState } from 'react';
import { Button } from './button';
import { toast } from './use-toast';
import { Upload, Loader2 } from 'lucide-react';

interface S3FileUploadProps {
  onUpload: (url: string) => void;
  accept?: string;
  uploadEndpoint: string;
  maxSize?: number; // in MB
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

export function S3FileUpload({ 
  onUpload, 
  accept, 
  uploadEndpoint, 
  maxSize = 10,
  className = "",
  children,
  disabled = false
}: S3FileUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    console.log('S3FileUpload: Starting upload:', { 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type,
      endpoint: uploadEndpoint,
      maxSize: maxSize 
    });

    // Basic client-side validation (server will do more comprehensive validation)
    if (file.size > maxSize * 1024 * 1024) {
      console.log('S3FileUpload: File too large');
      toast({
        title: "File too large",
        description: `File size must be less than ${maxSize}MB`,
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    console.log('S3FileUpload: Upload started');

    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log('S3FileUpload: Making fetch request to:', uploadEndpoint);
      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
      });

      console.log('S3FileUpload: Response received:', { 
        status: response.status, 
        statusText: response.statusText 
      });

      const result = await response.json();
      console.log('S3FileUpload: Response data:', result);

      if (result.success) {
        console.log('S3FileUpload: Upload successful, calling onUpload');
        onUpload(result.url);
        toast({
          title: "Upload successful",
          description: "File has been uploaded successfully"
        });
      } else {
        // Handle structured error response
        const errorMessage = result.error || 'Upload failed';
        const errorCode = result.code || 'UNKNOWN_ERROR';
        
        // Provide user-friendly error messages for common error codes
        const userFriendlyMessage = getUserFriendlyErrorMessage(errorCode, errorMessage);
        
        console.error('S3FileUpload: Server error:', { 
          code: errorCode, 
          message: errorMessage, 
          details: result.details 
        });
        
        toast({
          title: "Upload failed",
          description: userFriendlyMessage,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('S3FileUpload: Upload error:', error);
      
      // Handle network or parsing errors
      let errorMessage = 'Upload failed due to network error';
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = 'Unable to connect to server. Please check your internet connection.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Upload failed", 
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      console.log('S3FileUpload: Upload finished');
      setUploading(false);
    }
  };

  const getUserFriendlyErrorMessage = (code: string, originalMessage: string): string => {
    switch (code) {
      case 'FILE_TOO_LARGE':
        return 'The file you selected is too large. Please choose a smaller file.';
      case 'INVALID_FILE_TYPE':
        return 'This file type is not supported. Please select a different file.';
      case 'NO_FILE_PROVIDED':
        return 'No file was selected. Please choose a file to upload.';
      case 'CONFIGURATION_ERROR':
        return 'Upload service is temporarily unavailable. Please try again later.';
      case 'NETWORK_ERROR':
        return 'Network connection failed. Please check your internet connection and try again.';
      case 'ACCESS_DENIED':
        return 'You do not have permission to upload this file.';
      case 'MISSING_SESSION_ID':
      case 'MISSING_SUBMISSION_ID':
        return 'Required information is missing. Please refresh the page and try again.';
      case 'INVALID_SESSION_ID':
      case 'INVALID_SUBMISSION_ID':
        return 'Invalid session. Please refresh the page and try again.';
      default:
        return originalMessage;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  if (children) {
    return (
      <div className={className}>
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={uploading || disabled}
          style={{ display: 'none' }}
          id="s3-file-upload"
        />
        <label htmlFor="s3-file-upload" style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}>
          {children}
        </label>
        {uploading && (
          <div className="flex items-center mt-2">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span className="text-sm">Uploading...</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <div>
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={uploading || disabled}
            className="hidden"
            id="s3-file-upload-default"
          />
          <Button 
            type="button"
            variant="outline" 
            onClick={() => document.getElementById('s3-file-upload-default')?.click()}
            disabled={uploading || disabled}
            className="mb-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Uploading...
              </>
            ) : (
              'Choose File'
            )}
          </Button>
          <p className="text-sm text-gray-500">
            Maximum file size: {maxSize}MB
          </p>
        </div>
      </div>
    </div>
  );
} 