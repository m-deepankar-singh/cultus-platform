export class UploadError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

export class ValidationError extends UploadError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class FileTypeError extends ValidationError {
  constructor(expectedTypes: string[], receivedType: string) {
    super(
      `Invalid file type. Expected: ${expectedTypes.join(', ')}, received: ${receivedType}`,
      { expectedTypes, receivedType }
    );
    this.name = 'FileTypeError';
    this.code = 'INVALID_FILE_TYPE';
  }
}

export class FileSizeError extends ValidationError {
  constructor(maxSize: number, receivedSize: number) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    const receivedSizeMB = Math.round(receivedSize / (1024 * 1024) * 100) / 100;
    
    super(
      `File too large. Maximum size: ${maxSizeMB}MB, received: ${receivedSizeMB}MB`,
      { maxSize, receivedSize, maxSizeMB, receivedSizeMB }
    );
    this.name = 'FileSizeError';
    this.code = 'FILE_TOO_LARGE';
  }
}

export class NetworkError extends UploadError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', 503, details);
    this.name = 'NetworkError';
  }
}

export class S3Error extends UploadError {
  constructor(message: string, awsErrorCode?: string, details?: any) {
    super(message, awsErrorCode || 'S3_ERROR', 500, details);
    this.name = 'S3Error';
  }
}

export class ConfigurationError extends UploadError {
  constructor(message: string, details?: any) {
    super(message, 'CONFIGURATION_ERROR', 500, details);
    this.name = 'ConfigurationError';
  }
}

// Helper function to create appropriate error from AWS S3 errors
export function createS3Error(error: any): UploadError {
  if (error.name === 'NoSuchBucket') {
    return new ConfigurationError('Bucket not found', { awsError: error });
  }
  
  if (error.name === 'InvalidAccessKeyId' || error.name === 'SignatureDoesNotMatch') {
    return new ConfigurationError('Invalid credentials', { awsError: error });
  }
  
  if (error.name === 'AccessDenied') {
    return new S3Error('Access denied to bucket', 'ACCESS_DENIED', { awsError: error });
  }
  
  if (error.name === 'EntityTooLarge') {
    return new FileSizeError(
      error.maxAllowedSize || 5 * 1024 * 1024 * 1024, // 5GB default
      error.actualSize || 0
    );
  }
  
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return new NetworkError('Network connection failed', { originalError: error });
  }
  
  return new S3Error(
    error.message || 'Unknown S3 error',
    error.name || error.code,
    { originalError: error }
  );
} 