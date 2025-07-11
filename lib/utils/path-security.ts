/**
 * Path Security Utilities
 * 
 * Comprehensive path validation and sanitization functions to prevent
 * path traversal attacks (CVE-2025-004) and other path-based security vulnerabilities.
 */

export interface PathValidationOptions {
  maxPathLength?: number;
  maxComponentLength?: number;
  allowedExtensions?: string[];
  allowAbsolutePaths?: boolean;
  allowUnicode?: boolean;
}

export interface PathValidationResult {
  isValid: boolean;
  sanitized?: string;
  errors: string[];
  securityIssues: string[];
}

const DEFAULT_OPTIONS: Required<PathValidationOptions> = {
  maxPathLength: 1024,
  maxComponentLength: 255,
  allowedExtensions: [],
  allowAbsolutePaths: false,
  allowUnicode: false,
};

/**
 * Comprehensive path validation that prevents various attack vectors:
 * - Directory traversal (../, encoded variants)
 * - Null byte injection
 * - Unicode normalization attacks
 * - Overlong paths
 * - Invalid characters
 */
export function validatePath(
  path: string,
  options: PathValidationOptions = {}
): PathValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: string[] = [];
  const securityIssues: string[] = [];

  // Basic null/undefined check
  if (!path || typeof path !== 'string') {
    errors.push('Path must be a non-empty string');
    return { isValid: false, errors, securityIssues };
  }

  // Check for null bytes (directory traversal via null byte injection)
  if (path.includes('\0')) {
    securityIssues.push('Null byte injection attempt detected');
    errors.push('Path contains null bytes');
  }

  // Check path length
  if (path.length > opts.maxPathLength) {
    errors.push(`Path too long: ${path.length} > ${opts.maxPathLength}`);
  }

  // Unicode normalization check (prevent normalization attacks)
  const normalized = path.normalize('NFC');
  if (!opts.allowUnicode && normalized !== path) {
    securityIssues.push('Unicode normalization attack detected');
    errors.push('Path contains suspicious unicode sequences');
  }
  
  // Additional check for dangerous Unicode sequences
  if (/[\u002E\u002F]/.test(path) && path !== normalized) {
    securityIssues.push('Dangerous Unicode sequence detected');
    errors.push('Path contains dangerous Unicode characters');
  }

  // Check for encoded directory traversal attempts
  const decodedPath = decodePathSafely(path);
  if (decodedPath !== path) {
    securityIssues.push('URL encoding detected in path');
  }

  // Check for directory traversal patterns (case-insensitive)
  const traversalPatterns = [
    /\.\./,           // Basic ../
    /%2e%2e/i,        // URL encoded ..
    /%252e%252e/i,    // Double URL encoded ..
    /\u002e\u002e/,   // Unicode ..
    /\uFF0E\uFF0E/,   // Fullwidth dots
    /\.%2f/i,         // Mixed encoding
    /%2f\./i,         // Mixed encoding
  ];

  for (const pattern of traversalPatterns) {
    if (pattern.test(decodedPath)) {
      securityIssues.push(`Directory traversal pattern detected: ${pattern.source}`);
      errors.push('Path contains directory traversal sequences');
      break;
    }
  }

  // Check for absolute path attempts when not allowed
  if (!opts.allowAbsolutePaths && (path.startsWith('/') || path.startsWith('\\'))) {
    securityIssues.push('Absolute path attempt detected');
    errors.push('Absolute paths not allowed');
  }

  // Validate path components
  const components = path.split('/').filter(Boolean);
  for (const component of components) {
    if (component.length > opts.maxComponentLength) {
      errors.push(`Path component too long: ${component.length} > ${opts.maxComponentLength}`);
    }

    // Check for reserved names (Windows)
    const baseName = component.split('.')[0]; // Get name without extension
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
    if (reservedNames.test(baseName)) {
      securityIssues.push(`Reserved system name detected: ${component}`);
      errors.push('Path contains reserved system names');
    }

    // Check for suspicious characters
    const suspiciousChars = /[<>:"|?*\x00-\x1f\x7f]/;
    if (suspiciousChars.test(component)) {
      securityIssues.push('Suspicious characters detected in path component');
      errors.push('Path contains invalid characters');
    }
  }

  // Extension validation
  if (opts.allowedExtensions.length > 0) {
    const extension = path.split('.').pop()?.toLowerCase();
    if (!extension || !opts.allowedExtensions.includes(extension)) {
      errors.push(`Invalid file extension: ${extension}`);
    }
  }

  const isValid = errors.length === 0;
  const sanitized = isValid ? sanitizePath(decodedPath) : undefined;

  return {
    isValid,
    sanitized,
    errors,
    securityIssues,
  };
}

/**
 * Safely decode URL-encoded paths, preventing double-encoding attacks
 */
function decodePathSafely(path: string): string {
  try {
    let decoded = path;
    let previousDecoded = '';
    let iterations = 0;
    const maxIterations = 3; // Prevent infinite loops

    // Decode until no more changes or max iterations
    while (decoded !== previousDecoded && iterations < maxIterations) {
      previousDecoded = decoded;
      decoded = decodeURIComponent(decoded);
      iterations++;
    }

    return decoded;
  } catch {
    // If decoding fails, return original (likely not encoded)
    return path;
  }
}

/**
 * Sanitize a validated path by normalizing and cleaning
 */
function sanitizePath(path: string): string {
  return path
    .normalize('NFC')          // Unicode normalization
    .replace(/\/+/g, '/')      // Collapse multiple slashes
    .replace(/^\/+|\/+$/g, '') // Remove leading/trailing slashes
    .trim();
}

/**
 * Sanitize filename component specifically for upload keys
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'untitled';
  }

  const sanitized = filename
    .normalize('NFC')
    .replace(/[<>:"|?*\x00-\x1f\x7f]/g, '') // Remove invalid chars
    .replace(/^\.+/, '')                     // Remove leading dots
    .replace(/\.+$/, '')                     // Remove trailing dots
    .replace(/\s+/g, '_')                    // Replace spaces with underscores
    .trim()                                  // Remove whitespace
    .slice(0, 100);                          // Limit length
    
  // Additional check for strings that are just underscores or empty
  if (!sanitized || /^_+$/.test(sanitized)) {
    return 'untitled';
  }
    
  return sanitized;
}

/**
 * Validate and sanitize file upload key
 */
export function validateUploadKey(key: string): PathValidationResult {
  return validatePath(key, {
    maxPathLength: 1024,
    maxComponentLength: 100,
    allowAbsolutePaths: false,
    allowUnicode: false,
  });
}

/**
 * Generate a secure, sanitized file key for uploads
 */
export function generateSecureKey(prefix: string, filename: string): string {
  const sanitizedPrefix = sanitizePath(prefix);
  
  // First sanitize the filename to remove any malicious content
  let sanitizedFilename = sanitizeFilename(filename);
  
  // Extra security: remove any remaining traversal patterns from filename
  sanitizedFilename = sanitizedFilename.replace(/\.\./g, '_dot_dot_');
  
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 10);
  const extension = sanitizedFilename.split('.').pop() || 'bin';
  const baseName = sanitizedFilename.replace(/\.[^.]*$/, '') || 'file';
  
  // Ensure base name is safe
  const safeBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
  
  const key = `${sanitizedPrefix}/${timestamp}_${randomId}_${safeBaseName}.${extension}`;
  
  // Final validation
  const validation = validateUploadKey(key);
  if (!validation.isValid) {
    // If validation still fails, use ultra-safe fallback
    return `${sanitizedPrefix}/${timestamp}_${randomId}_safe_file.bin`;
  }
  
  return validation.sanitized || key;
}