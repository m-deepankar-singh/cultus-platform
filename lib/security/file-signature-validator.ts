/**
 * File Signature Validator
 * 
 * Provides robust file type validation using binary signatures (magic numbers)
 * to prevent MIME type spoofing attacks and ensure file integrity.
 * 
 * Security Features:
 * - Binary header inspection
 * - Magic number validation
 * - MIME type cross-validation
 * - SVG content security scanning
 * - Performance-optimized validation
 */

export interface FileSignature {
  offset: number;
  signature: number[];
  description?: string;
}

export interface ValidationResult {
  isValid: boolean;
  detectedType: string | null;
  confidence: number;
  errors: string[];
  securityFlags: string[];
  metadata?: Record<string, any>;
}

export interface SVGValidationResult {
  isSecure: boolean;
  threats: string[];
  sanitized?: string;
}

// File signature database for common file types
const FILE_SIGNATURES: Record<string, FileSignature[]> = {
  // Image formats
  'image/png': [
    { 
      offset: 0, 
      signature: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
      description: 'PNG signature'
    }
  ],
  'image/jpeg': [
    { offset: 0, signature: [0xFF, 0xD8, 0xFF, 0xE0], description: 'JPEG JFIF' },
    { offset: 0, signature: [0xFF, 0xD8, 0xFF, 0xE1], description: 'JPEG EXIF' },
    { offset: 0, signature: [0xFF, 0xD8, 0xFF, 0xE8], description: 'JPEG SPIFF' },
    { offset: 0, signature: [0xFF, 0xD8, 0xFF, 0xDB], description: 'JPEG raw' }
  ],
  'image/webp': [
    { 
      offset: 0, 
      signature: [0x52, 0x49, 0x46, 0x46], // RIFF
      description: 'WebP RIFF header'
    },
    { 
      offset: 8, 
      signature: [0x57, 0x45, 0x42, 0x50], // WEBP
      description: 'WebP format identifier'
    }
  ],
  'image/gif': [
    { offset: 0, signature: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], description: 'GIF87a' },
    { offset: 0, signature: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], description: 'GIF89a' }
  ],
  'image/bmp': [
    { offset: 0, signature: [0x42, 0x4D], description: 'BMP signature' }
  ],
  'image/tiff': [
    { offset: 0, signature: [0x49, 0x49, 0x2A, 0x00], description: 'TIFF little-endian' },
    { offset: 0, signature: [0x4D, 0x4D, 0x00, 0x2A], description: 'TIFF big-endian' }
  ],

  // Video formats
  'video/mp4': [
    { offset: 4, signature: [0x66, 0x74, 0x79, 0x70], description: 'MP4 ftyp box' }
  ],
  'video/webm': [
    { offset: 0, signature: [0x1A, 0x45, 0xDF, 0xA3], description: 'WebM EBML header' }
  ],
  'video/quicktime': [
    { offset: 4, signature: [0x66, 0x74, 0x79, 0x70, 0x71, 0x74], description: 'QuickTime ftyp' }
  ],
  'video/avi': [
    { offset: 0, signature: [0x52, 0x49, 0x46, 0x46], description: 'AVI RIFF header' },
    { offset: 8, signature: [0x41, 0x56, 0x49, 0x20], description: 'AVI format identifier' }
  ],

  // Document formats
  'application/pdf': [
    { offset: 0, signature: [0x25, 0x50, 0x44, 0x46], description: 'PDF signature' }
  ],

  // Archive formats (for reference)
  'application/zip': [
    { offset: 0, signature: [0x50, 0x4B, 0x03, 0x04], description: 'ZIP local file header' },
    { offset: 0, signature: [0x50, 0x4B, 0x05, 0x06], description: 'ZIP empty archive' },
    { offset: 0, signature: [0x50, 0x4B, 0x07, 0x08], description: 'ZIP spanned archive' }
  ]
};

// MIME type patterns for wildcard matching
const MIME_TYPE_PATTERNS: Record<string, string[]> = {
  'image/*': Object.keys(FILE_SIGNATURES).filter(type => type.startsWith('image/')),
  'video/*': Object.keys(FILE_SIGNATURES).filter(type => type.startsWith('video/')),
  'application/*': Object.keys(FILE_SIGNATURES).filter(type => type.startsWith('application/'))
};

/**
 * Validates file signature against claimed MIME type
 */
export function validateFileSignature(
  buffer: ArrayBuffer, 
  claimedMimeType: string
): ValidationResult {
  const errors: string[] = [];
  const securityFlags: string[] = [];
  const uint8Array = new Uint8Array(buffer);
  
  // Detect actual file type from signature
  const detectedType = detectFileTypeFromSignature(buffer);
  
  // Handle wildcard MIME types (e.g., image/*, video/*)
  let allowedTypes: string[] = [];
  if (claimedMimeType.endsWith('/*')) {
    allowedTypes = MIME_TYPE_PATTERNS[claimedMimeType] || [];
  } else {
    allowedTypes = [claimedMimeType];
  }
  
  // Special handling for SVG (text-based format)
  if (claimedMimeType === 'image/svg+xml') {
    return {
      isValid: true, // SVG validation handled separately
      detectedType: 'image/svg+xml',
      confidence: 1.0,
      errors: [],
      securityFlags: []
    };
  }
  
  // Check if detected type matches any allowed type
  const isValidType = detectedType && allowedTypes.includes(detectedType);
  
  if (!detectedType) {
    errors.push('Unable to detect file type from signature');
    securityFlags.push('UNKNOWN_SIGNATURE');
  } else if (!isValidType) {
    errors.push(`MIME type mismatch: claimed '${claimedMimeType}', detected '${detectedType}'`);
    securityFlags.push('MIME_TYPE_SPOOFING');
  }
  
  // Calculate confidence based on signature match quality
  const confidence = detectedType && isValidType ? 1.0 : 0.0;
  
  return {
    isValid: isValidType || false,
    detectedType,
    confidence,
    errors,
    securityFlags,
    metadata: {
      bufferSize: buffer.byteLength,
      allowedTypes,
      signatureMatches: getSignatureMatches(uint8Array)
    }
  };
}

/**
 * Detects file type from binary signature
 */
export function detectFileTypeFromSignature(buffer: ArrayBuffer): string | null {
  const uint8Array = new Uint8Array(buffer);
  
  for (const [mimeType, signatures] of Object.entries(FILE_SIGNATURES)) {
    for (const sig of signatures) {
      if (matchesSignature(uint8Array, sig)) {
        return mimeType;
      }
    }
  }
  
  return null;
}

/**
 * Validates SVG content for security threats
 */
export function validateSVGContent(svgContent: string): SVGValidationResult {
  const threats: string[] = [];
  
  // Check for script tags
  if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(svgContent)) {
    threats.push('Contains script tags');
  }
  
  // Check for javascript: URLs
  if (/javascript:/gi.test(svgContent)) {
    threats.push('Contains javascript: URLs');
  }
  
  // Check for data URLs with javascript
  if (/data:.*javascript/gi.test(svgContent)) {
    threats.push('Contains javascript data URLs');
  }
  
  // Check for event handlers
  if (/on\w+\s*=/gi.test(svgContent)) {
    threats.push('Contains event handlers');
  }
  
  // Check for foreign object elements
  if (/<foreignObject\b/gi.test(svgContent)) {
    threats.push('Contains foreignObject elements');
  }
  
  // Check for use of external entities
  if (/<!ENTITY/gi.test(svgContent)) {
    threats.push('Contains XML entities');
  }
  
  // Check for iframe or embed elements
  if (/<(iframe|embed|object)\b/gi.test(svgContent)) {
    threats.push('Contains embedded content elements');
  }
  
  return {
    isSecure: threats.length === 0,
    threats,
    sanitized: threats.length > 0 ? sanitizeSVG(svgContent) : undefined
  };
}

/**
 * Validates file structure integrity (basic checks)
 */
export function isValidFileStructure(buffer: ArrayBuffer, mimeType: string): boolean {
  const uint8Array = new Uint8Array(buffer);
  
  switch (mimeType) {
    case 'image/png':
      return validatePNGStructure(uint8Array);
    case 'image/jpeg':
      return validateJPEGStructure(uint8Array);
    case 'video/mp4':
      return validateMP4Structure(uint8Array);
    case 'video/webm':
      return validateWebMStructure(uint8Array);
    default:
      // For unknown types, just check if signature matches
      return detectFileTypeFromSignature(buffer) === mimeType;
  }
}

/**
 * Gets all signature matches for debugging
 */
function getSignatureMatches(uint8Array: Uint8Array): Array<{ type: string; signature: FileSignature }> {
  const matches: Array<{ type: string; signature: FileSignature }> = [];
  
  for (const [mimeType, signatures] of Object.entries(FILE_SIGNATURES)) {
    for (const sig of signatures) {
      if (matchesSignature(uint8Array, sig)) {
        matches.push({ type: mimeType, signature: sig });
      }
    }
  }
  
  return matches;
}

/**
 * Checks if buffer matches a specific signature
 */
function matchesSignature(uint8Array: Uint8Array, signature: FileSignature): boolean {
  const { offset, signature: bytes } = signature;
  
  if (uint8Array.length < offset + bytes.length) {
    return false;
  }
  
  for (let i = 0; i < bytes.length; i++) {
    if (uint8Array[offset + i] !== bytes[i]) {
      return false;
    }
  }
  
  return true;
}

/**
 * Basic PNG structure validation
 */
function validatePNGStructure(uint8Array: Uint8Array): boolean {
  // Check PNG signature
  const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  if (uint8Array.length < 8) return false;
  
  for (let i = 0; i < pngSignature.length; i++) {
    if (uint8Array[i] !== pngSignature[i]) return false;
  }
  
  // Check for IHDR chunk
  if (uint8Array.length < 16) return false;
  const ihdrChunk = [0x49, 0x48, 0x44, 0x52]; // "IHDR"
  for (let i = 0; i < ihdrChunk.length; i++) {
    if (uint8Array[12 + i] !== ihdrChunk[i]) return false;
  }
  
  return true;
}

/**
 * Basic JPEG structure validation
 */
function validateJPEGStructure(uint8Array: Uint8Array): boolean {
  // Check JPEG signature
  if (uint8Array.length < 2) return false;
  if (uint8Array[0] !== 0xFF || uint8Array[1] !== 0xD8) return false;
  
  // Look for valid JPEG markers
  let pos = 2;
  while (pos < uint8Array.length - 1) {
    if (uint8Array[pos] !== 0xFF) break;
    
    const marker = uint8Array[pos + 1];
    if (marker === 0x00 || marker === 0xFF) {
      pos++;
      continue;
    }
    
    // Valid JPEG marker found
    if (marker >= 0xC0 && marker <= 0xFE) {
      return true;
    }
    
    // Skip this segment
    if (pos + 3 >= uint8Array.length) break;
    const segmentLength = (uint8Array[pos + 2] << 8) | uint8Array[pos + 3];
    pos += segmentLength + 2;
  }
  
  return false;
}

/**
 * Basic MP4 structure validation
 */
function validateMP4Structure(uint8Array: Uint8Array): boolean {
  // Look for ftyp box
  if (uint8Array.length < 8) return false;
  
  const ftypBox = [0x66, 0x74, 0x79, 0x70]; // "ftyp"
  for (let i = 0; i < ftypBox.length; i++) {
    if (uint8Array[4 + i] !== ftypBox[i]) return false;
  }
  
  return true;
}

/**
 * Basic WebM structure validation
 */
function validateWebMStructure(uint8Array: Uint8Array): boolean {
  // Check EBML header
  if (uint8Array.length < 4) return false;
  
  const ebmlHeader = [0x1A, 0x45, 0xDF, 0xA3];
  for (let i = 0; i < ebmlHeader.length; i++) {
    if (uint8Array[i] !== ebmlHeader[i]) return false;
  }
  
  return true;
}

/**
 * Sanitizes SVG content by removing dangerous elements
 */
function sanitizeSVG(svgContent: string): string {
  let sanitized = svgContent;
  
  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:[^"'\s]*/gi, '');
  
  // Remove foreignObject elements
  sanitized = sanitized.replace(/<foreignObject\b[^>]*>.*?<\/foreignObject>/gi, '');
  
  // Remove dangerous elements
  sanitized = sanitized.replace(/<(iframe|embed|object)\b[^>]*>.*?<\/\1>/gi, '');
  
  return sanitized;
}

/**
 * Validates file size constraints
 */
export function validateFileSize(
  size: number, 
  minSize: number = 0, 
  maxSize: number = 500 * 1024 * 1024
): { isValid: boolean; error?: string } {
  if (size < minSize) {
    return { 
      isValid: false, 
      error: `File too small. Minimum size: ${minSize} bytes, received: ${size} bytes` 
    };
  }
  
  if (size > maxSize) {
    return { 
      isValid: false, 
      error: `File too large. Maximum size: ${maxSize} bytes, received: ${size} bytes` 
    };
  }
  
  return { isValid: true };
}

/**
 * Comprehensive file validation combining all checks
 */
export async function validateFileComprehensive(
  file: File,
  options: {
    allowedTypes?: string[];
    maxSize?: number;
    minSize?: number;
    enableStructureValidation?: boolean;
    enableSVGSecurityValidation?: boolean;
  } = {}
): Promise<ValidationResult> {
  const {
    allowedTypes = [],
    maxSize = 500 * 1024 * 1024,
    minSize = 0,
    enableStructureValidation = true,
    enableSVGSecurityValidation = true
  } = options;
  
  const errors: string[] = [];
  const securityFlags: string[] = [];
  
  // Size validation
  const sizeValidation = validateFileSize(file.size, minSize, maxSize);
  if (!sizeValidation.isValid) {
    errors.push(sizeValidation.error!);
  }
  
  // Read file header for signature validation
  const headerSize = Math.min(8192, file.size);
  const buffer = await file.slice(0, headerSize).arrayBuffer();
  
  // MIME type validation
  if (allowedTypes.length > 0) {
    const isAllowedType = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });
    
    if (!isAllowedType) {
      errors.push(`File type '${file.type}' not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }
  }
  
  // Signature validation
  const signatureResult = validateFileSignature(buffer, file.type);
  errors.push(...signatureResult.errors);
  securityFlags.push(...signatureResult.securityFlags);
  
  // SVG security validation
  if (enableSVGSecurityValidation && file.type === 'image/svg+xml') {
    const svgContent = await file.text();
    const svgValidation = validateSVGContent(svgContent);
    
    if (!svgValidation.isSecure) {
      errors.push(`SVG security validation failed: ${svgValidation.threats.join(', ')}`);
      securityFlags.push('UNSAFE_SVG_CONTENT');
    }
  }
  
  // Structure validation
  if (enableStructureValidation && signatureResult.detectedType) {
    const isValidStructure = isValidFileStructure(buffer, signatureResult.detectedType);
    if (!isValidStructure) {
      errors.push('File structure validation failed');
      securityFlags.push('INVALID_FILE_STRUCTURE');
    }
  }
  
  return {
    isValid: errors.length === 0,
    detectedType: signatureResult.detectedType,
    confidence: signatureResult.confidence,
    errors,
    securityFlags,
    metadata: {
      fileSize: file.size,
      fileName: file.name,
      claimedMimeType: file.type,
      ...signatureResult.metadata
    }
  };
}