/**
 * File Validation Security Configuration
 * 
 * Centralized configuration for file upload security policies and validation rules.
 * Provides different security levels and environment-specific settings.
 */

export interface SecurityLevel {
  enforceSignatureValidation: boolean;
  allowSVGUploads: boolean;
  stripImageMetadata: boolean;
  maxFileHeaderSize: number;
  enableContentInspection: boolean;
  enableStructureValidation: boolean;
  maxConcurrentUploads: number;
  enableSecurityLogging: boolean;
  quarantineEnabled: boolean;
}

export interface FileTypeConfig {
  mimeType: string;
  maxSize: number;
  minSize: number;
  allowedExtensions: string[];
  requireSignatureValidation: boolean;
  enableContentValidation: boolean;
}

export interface UploadLimits {
  maxFileSize: number;
  maxTotalSize: number;
  maxFilesPerRequest: number;
  rateLimitPerMinute: number;
  rateLimitPerHour: number;
}

// Security level configurations
export const SECURITY_LEVELS: Record<string, SecurityLevel> = {
  strict: {
    enforceSignatureValidation: true,
    allowSVGUploads: false,
    stripImageMetadata: true,
    maxFileHeaderSize: 8192,
    enableContentInspection: true,
    enableStructureValidation: true,
    maxConcurrentUploads: 3,
    enableSecurityLogging: true,
    quarantineEnabled: true,
  },
  moderate: {
    enforceSignatureValidation: true,
    allowSVGUploads: true,
    stripImageMetadata: true,
    maxFileHeaderSize: 4096,
    enableContentInspection: true,
    enableStructureValidation: true,
    maxConcurrentUploads: 5,
    enableSecurityLogging: true,
    quarantineEnabled: false,
  },
  permissive: {
    enforceSignatureValidation: false,
    allowSVGUploads: true,
    stripImageMetadata: false,
    maxFileHeaderSize: 1024,
    enableContentInspection: false,
    enableStructureValidation: false,
    maxConcurrentUploads: 10,
    enableSecurityLogging: false,
    quarantineEnabled: false,
  },
};

// File type specific configurations
export const FILE_TYPE_CONFIGS: Record<string, FileTypeConfig> = {
  'image/png': {
    mimeType: 'image/png',
    maxSize: 5 * 1024 * 1024, // 5MB
    minSize: 100, // 100 bytes
    allowedExtensions: ['.png'],
    requireSignatureValidation: true,
    enableContentValidation: true,
  },
  'image/jpeg': {
    mimeType: 'image/jpeg',
    maxSize: 5 * 1024 * 1024, // 5MB
    minSize: 100, // 100 bytes
    allowedExtensions: ['.jpg', '.jpeg'],
    requireSignatureValidation: true,
    enableContentValidation: true,
  },
  'image/webp': {
    mimeType: 'image/webp',
    maxSize: 5 * 1024 * 1024, // 5MB
    minSize: 100, // 100 bytes
    allowedExtensions: ['.webp'],
    requireSignatureValidation: true,
    enableContentValidation: true,
  },
  'image/gif': {
    mimeType: 'image/gif',
    maxSize: 2 * 1024 * 1024, // 2MB
    minSize: 100, // 100 bytes
    allowedExtensions: ['.gif'],
    requireSignatureValidation: true,
    enableContentValidation: true,
  },
  'image/svg+xml': {
    mimeType: 'image/svg+xml',
    maxSize: 1 * 1024 * 1024, // 1MB
    minSize: 50, // 50 bytes
    allowedExtensions: ['.svg'],
    requireSignatureValidation: false, // SVG is text-based
    enableContentValidation: true, // Enable XSS scanning
  },
  'video/mp4': {
    mimeType: 'video/mp4',
    maxSize: 500 * 1024 * 1024, // 500MB
    minSize: 1024, // 1KB
    allowedExtensions: ['.mp4'],
    requireSignatureValidation: true,
    enableContentValidation: true,
  },
  'video/webm': {
    mimeType: 'video/webm',
    maxSize: 500 * 1024 * 1024, // 500MB
    minSize: 1024, // 1KB
    allowedExtensions: ['.webm'],
    requireSignatureValidation: true,
    enableContentValidation: true,
  },
  'video/quicktime': {
    mimeType: 'video/quicktime',
    maxSize: 500 * 1024 * 1024, // 500MB
    minSize: 1024, // 1KB
    allowedExtensions: ['.mov', '.qt'],
    requireSignatureValidation: true,
    enableContentValidation: true,
  },
  'application/pdf': {
    mimeType: 'application/pdf',
    maxSize: 10 * 1024 * 1024, // 10MB
    minSize: 100, // 100 bytes
    allowedExtensions: ['.pdf'],
    requireSignatureValidation: true,
    enableContentValidation: true,
  },
};

// Upload context specific limits
export const UPLOAD_LIMITS: Record<string, UploadLimits> = {
  'client-logo': {
    maxFileSize: 2 * 1024 * 1024, // 2MB
    maxTotalSize: 2 * 1024 * 1024, // 2MB
    maxFilesPerRequest: 1,
    rateLimitPerMinute: 10,
    rateLimitPerHour: 100,
  },
  'product-image': {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxTotalSize: 25 * 1024 * 1024, // 25MB
    maxFilesPerRequest: 5,
    rateLimitPerMinute: 20,
    rateLimitPerHour: 200,
  },
  'lesson-video': {
    maxFileSize: 500 * 1024 * 1024, // 500MB
    maxTotalSize: 1024 * 1024 * 1024, // 1GB
    maxFilesPerRequest: 1,
    rateLimitPerMinute: 5,
    rateLimitPerHour: 50,
  },
  'interview-recording': {
    maxFileSize: 200 * 1024 * 1024, // 200MB
    maxTotalSize: 200 * 1024 * 1024, // 200MB
    maxFilesPerRequest: 1,
    rateLimitPerMinute: 10,
    rateLimitPerHour: 100,
  },
  'expert-session': {
    maxFileSize: 500 * 1024 * 1024, // 500MB
    maxTotalSize: 500 * 1024 * 1024, // 500MB
    maxFilesPerRequest: 1,
    rateLimitPerMinute: 3,
    rateLimitPerHour: 30,
  },
};

// Security threat patterns for monitoring
export const SECURITY_PATTERNS = {
  suspiciousExtensions: [
    '.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.jar', '.vbs', '.js', 
    '.jse', '.wsf', '.wsh', '.ps1', '.ps2', '.psc1', '.psc2', '.msh', '.msh1', 
    '.msh2', '.mshxml', '.msh1xml', '.msh2xml', '.scf', '.lnk', '.inf', '.reg'
  ],
  dangerousMimeTypes: [
    'application/x-executable',
    'application/x-msdownload',
    'application/x-msdos-program',
    'application/x-msi',
    'application/x-bat',
    'application/x-sh',
    'text/javascript',
    'application/javascript',
    'application/ecmascript',
  ],
  suspiciousFilenames: [
    'autorun.inf',
    'desktop.ini',
    'thumbs.db',
    '.htaccess',
    '.htpasswd',
    'web.config',
    'robots.txt',
  ],
};

/**
 * Gets the current security level configuration
 */
export function getCurrentSecurityLevel(): SecurityLevel {
  const level = process.env.FILE_VALIDATION_SECURITY_LEVEL || 'moderate';
  return SECURITY_LEVELS[level] || SECURITY_LEVELS.moderate;
}

/**
 * Gets file type configuration for a specific MIME type
 */
export function getFileTypeConfig(mimeType: string): FileTypeConfig | null {
  return FILE_TYPE_CONFIGS[mimeType] || null;
}

/**
 * Gets upload limits for a specific context
 */
export function getUploadLimits(context: string): UploadLimits {
  return UPLOAD_LIMITS[context] || {
    maxFileSize: 10 * 1024 * 1024, // 10MB default
    maxTotalSize: 50 * 1024 * 1024, // 50MB default
    maxFilesPerRequest: 5,
    rateLimitPerMinute: 20,
    rateLimitPerHour: 200,
  };
}

/**
 * Checks if a file extension is suspicious
 */
export function isSuspiciousExtension(filename: string): boolean {
  const extension = filename.toLowerCase().split('.').pop();
  return extension ? SECURITY_PATTERNS.suspiciousExtensions.includes(`.${extension}`) : false;
}

/**
 * Checks if a MIME type is dangerous
 */
export function isDangerousMimeType(mimeType: string): boolean {
  return SECURITY_PATTERNS.dangerousMimeTypes.includes(mimeType.toLowerCase());
}

/**
 * Checks if a filename is suspicious
 */
export function isSuspiciousFilename(filename: string): boolean {
  const lowercaseFilename = filename.toLowerCase();
  return SECURITY_PATTERNS.suspiciousFilenames.some(pattern => 
    lowercaseFilename.includes(pattern)
  );
}

/**
 * Validates file against security policies
 */
export function validateFileSecurityPolicy(
  filename: string,
  mimeType: string,
  fileSize: number,
  context: string
): {
  isAllowed: boolean;
  violations: string[];
  warnings: string[];
} {
  const violations: string[] = [];
  const warnings: string[] = [];
  const securityLevel = getCurrentSecurityLevel();
  const uploadLimits = getUploadLimits(context);
  const fileConfig = getFileTypeConfig(mimeType);

  // Check file size limits
  if (fileSize > uploadLimits.maxFileSize) {
    violations.push(`File size ${fileSize} exceeds limit of ${uploadLimits.maxFileSize} bytes`);
  }

  // Check for dangerous MIME types
  if (isDangerousMimeType(mimeType)) {
    violations.push(`Dangerous MIME type: ${mimeType}`);
  }

  // Check for suspicious extensions
  if (isSuspiciousExtension(filename)) {
    violations.push(`Suspicious file extension in: ${filename}`);
  }

  // Check for suspicious filenames
  if (isSuspiciousFilename(filename)) {
    violations.push(`Suspicious filename: ${filename}`);
  }

  // SVG policy check
  if (mimeType === 'image/svg+xml' && !securityLevel.allowSVGUploads) {
    violations.push('SVG uploads are not allowed at current security level');
  }

  // File type configuration check
  if (fileConfig) {
    if (fileSize > fileConfig.maxSize) {
      violations.push(`File size ${fileSize} exceeds type limit of ${fileConfig.maxSize} bytes`);
    }
    if (fileSize < fileConfig.minSize) {
      violations.push(`File size ${fileSize} below minimum of ${fileConfig.minSize} bytes`);
    }
  } else {
    warnings.push(`No specific configuration found for MIME type: ${mimeType}`);
  }

  return {
    isAllowed: violations.length === 0,
    violations,
    warnings,
  };
}

/**
 * Gets security headers for file uploads
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Content-Security-Policy': "default-src 'none'",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
}

/**
 * Configuration for different environments
 */
export const ENVIRONMENT_CONFIGS = {
  development: {
    securityLevel: 'moderate',
    enableDetailedLogging: true,
    allowTestFiles: true,
    skipSignatureValidation: false,
  },
  staging: {
    securityLevel: 'moderate',
    enableDetailedLogging: true,
    allowTestFiles: false,
    skipSignatureValidation: false,
  },
  production: {
    securityLevel: 'strict',
    enableDetailedLogging: false,
    allowTestFiles: false,
    skipSignatureValidation: false,
  },
};

/**
 * Gets environment-specific configuration
 */
export function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development';
  return ENVIRONMENT_CONFIGS[env as keyof typeof ENVIRONMENT_CONFIGS] || ENVIRONMENT_CONFIGS.development;
}