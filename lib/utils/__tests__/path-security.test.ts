/**
 * Path Security Validation Tests
 * 
 * Comprehensive test suite for CVE-2025-004 path traversal vulnerability fixes
 */

import {
  validatePath,
  sanitizeFilename,
  validateUploadKey,
  generateSecureKey,
  PathValidationOptions,
} from '../path-security';

describe('Path Security Validation', () => {
  describe('validatePath', () => {
    it('should accept valid paths', () => {
      const validPaths = [
        'simple/path/file.txt',
        'folder/subfolder/image.jpg',
        'uploads/documents/report.pdf',
      ];

      validPaths.forEach(path => {
        const result = validatePath(path);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.securityIssues).toHaveLength(0);
      });
    });

    it('should reject directory traversal attacks', () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '../../sensitive/file.txt',
        'folder/../../../escape',
        'upload/../admin/config.json',
      ];

      maliciousPaths.forEach(path => {
        const result = validatePath(path);
        expect(result.isValid).toBe(false);
        expect(result.securityIssues.length).toBeGreaterThan(0);
        expect(result.errors).toContain('Path contains directory traversal sequences');
      });
    });

    it('should detect URL-encoded traversal attempts', () => {
      const encodedPaths = [
        'folder%2f%2e%2e%2f%2e%2e%2fpasswd',
        'upload%2F..%2F..%2Fadmin',
        '%2e%2e%2f%2e%2e%2fescaped',
        'files%2F%2E%2E%2F%2E%2E%2Fsecret',
      ];

      encodedPaths.forEach(path => {
        const result = validatePath(path);
        expect(result.isValid).toBe(false);
        expect(result.securityIssues.length).toBeGreaterThan(0);
      });
    });

    it('should detect double-encoded attacks', () => {
      const doubleEncodedPaths = [
        'folder%252e%252e%252fescaped',
        '%252e%252e%252f%252e%252e%252fpasswd',
      ];

      doubleEncodedPaths.forEach(path => {
        const result = validatePath(path);
        expect(result.isValid).toBe(false);
        expect(result.securityIssues.length).toBeGreaterThan(0);
      });
    });

    it('should reject null byte injection', () => {
      const nullBytePaths = [
        'file.txt\0.jpg',
        'upload\0/../secret',
        'normal/path\0/file.exe',
      ];

      nullBytePaths.forEach(path => {
        const result = validatePath(path);
        expect(result.isValid).toBe(false);
        expect(result.securityIssues).toContain('Null byte injection attempt detected');
      });
    });

    it('should reject absolute paths when not allowed', () => {
      const absolutePaths = [
        '/etc/passwd',
        '/home/user/secret',
        '/var/log/app.log',
        '\\Windows\\System32\\config',
      ];

      absolutePaths.forEach(path => {
        const result = validatePath(path);
        expect(result.isValid).toBe(false);
        expect(result.securityIssues).toContain('Absolute path attempt detected');
      });
    });

    it('should allow absolute paths when explicitly allowed', () => {
      const options: PathValidationOptions = {
        allowAbsolutePaths: true,
      };

      const result = validatePath('/allowed/absolute/path.txt', options);
      expect(result.isValid).toBe(true);
    });

    it('should enforce path length limits', () => {
      const longPath = 'a'.repeat(2000);
      const result = validatePath(longPath, { maxPathLength: 100 });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Path too long'))).toBe(true);
    });

    it('should detect reserved Windows names', () => {
      const reservedNames = [
        'CON/file.txt',
        'folder/PRN.log',
        'upload/AUX.data',
        'NUL.exe',
        'COM1.txt',
        'LPT9.doc',
      ];

      reservedNames.forEach(path => {
        const result = validatePath(path);
        expect(result.isValid).toBe(false);
        expect(result.securityIssues.some(issue => issue.includes('Reserved system name'))).toBe(true);
      });
    });

    it('should detect suspicious characters', () => {
      const suspiciousPaths = [
        'file<script>.txt',
        'upload|pipe.doc',
        'folder:colon.exe',
        'file"quote.txt',
        'path*star.log',
      ];

      suspiciousPaths.forEach(path => {
        const result = validatePath(path);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('invalid characters'))).toBe(true);
      });
    });

    it('should validate file extensions when specified', () => {
      const options: PathValidationOptions = {
        allowedExtensions: ['jpg', 'png', 'gif'],
      };

      expect(validatePath('image.jpg', options).isValid).toBe(true);
      expect(validatePath('image.exe', options).isValid).toBe(false);
      expect(validatePath('script.js', options).isValid).toBe(false);
    });
  });

  describe('sanitizeFilename', () => {
    it('should sanitize basic filenames', () => {
      expect(sanitizeFilename('normal-file.txt')).toBe('normal-file.txt');
      expect(sanitizeFilename('file with spaces.jpg')).toBe('file_with_spaces.jpg');
      expect(sanitizeFilename('File*With|Bad<Chars>.doc')).toBe('FileWithBadChars.doc');
    });

    it('should handle edge cases', () => {
      expect(sanitizeFilename('')).toBe('untitled');
      expect(sanitizeFilename(null as any)).toBe('untitled');
      expect(sanitizeFilename(undefined as any)).toBe('untitled');
      expect(sanitizeFilename('...')).toBe('untitled');
      expect(sanitizeFilename('   ')).toBe('untitled');
    });

    it('should remove leading and trailing dots', () => {
      expect(sanitizeFilename('...file.txt')).toBe('file.txt');
      expect(sanitizeFilename('file.txt...')).toBe('file.txt');
      expect(sanitizeFilename('..hidden.file.')).toBe('hidden.file');
    });

    it('should limit filename length', () => {
      const longName = 'a'.repeat(200) + '.txt';
      const sanitized = sanitizeFilename(longName);
      expect(sanitized.length).toBeLessThanOrEqual(100);
    });
  });

  describe('validateUploadKey', () => {
    it('should validate typical upload keys', () => {
      const validKeys = [
        'uploads/images/photo.jpg',
        'documents/reports/2024/report.pdf',
        'media/videos/tutorial.mp4',
      ];

      validKeys.forEach(key => {
        const result = validateUploadKey(key);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject malicious upload keys', () => {
      const maliciousKeys = [
        '../../../etc/passwd',
        'uploads/../admin/config.json',
        'files%2f%2e%2e%2fescaped',
        'normal\0path/file.txt',
      ];

      maliciousKeys.forEach(key => {
        const result = validateUploadKey(key);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('generateSecureKey', () => {
    it('should generate valid keys', () => {
      const key = generateSecureKey('uploads/images', 'photo.jpg');
      
      expect(key).toMatch(/^uploads\/images\/\d+_[a-z0-9]+_photo\.jpg$/);
      
      const validation = validateUploadKey(key);
      expect(validation.isValid).toBe(true);
    });

    it('should sanitize malicious filenames', () => {
      const maliciousFilenames = [
        '../../../escape.txt',
        'file<script>.exe',
        'bad|chars*.doc',
      ];

      maliciousFilenames.forEach(filename => {
        const key = generateSecureKey('safe/folder', filename);
        const validation = validateUploadKey(key);
        expect(validation.isValid).toBe(true);
        expect(key).not.toContain('..');
        expect(key).not.toContain('<');
        expect(key).not.toContain('|');
        expect(key).not.toContain('*');
      });
    });

    it('should handle empty or invalid filenames', () => {
      const invalidFilenames = ['', '...', '   ', null as any, undefined as any];

      invalidFilenames.forEach(filename => {
        const key = generateSecureKey('uploads', filename);
        expect(key).toMatch(/^uploads\/\d+_[a-z0-9]+_.*$/);
        
        const validation = validateUploadKey(key);
        expect(validation.isValid).toBe(true);
      });
    });

    it('should generate unique keys for same filename', () => {
      const keys = [];
      for (let i = 0; i < 10; i++) {
        keys.push(generateSecureKey('test', 'same-file.txt'));
      }

      // All keys should be unique
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });

    it('should preserve valid file extensions', () => {
      const testCases = [
        ['image.jpg', 'jpg'],
        ['document.pdf', 'pdf'],
        ['video.mp4', 'mp4'],
        ['archive.tar.gz', 'gz'], // Last extension only
      ];

      testCases.forEach(([filename, expectedExt]) => {
        const key = generateSecureKey('test', filename);
        expect(key.endsWith(`.${expectedExt}`)).toBe(true);
      });
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle Unicode normalization attacks', () => {
      // Unicode sequences that normalize to dangerous paths
      const unicodeAttacks = [
        'file\u002E\u002E/escape',  // Unicode dots
        'folder\uFF0F\uFF0E\uFF0E\uFF0Fescape', // Fullwidth characters
      ];

      unicodeAttacks.forEach(path => {
        const result = validatePath(path);
        expect(result.isValid).toBe(false);
      });
    });

    it('should handle mixed encoding attacks', () => {
      const mixedAttacks = [
        'folder%2F..%2Fescape',
        'upload/.%2E/admin',
        'files\\..\\windows',
      ];

      mixedAttacks.forEach(path => {
        const result = validatePath(path);
        expect(result.isValid).toBe(false);
      });
    });

    it('should prevent recursive decoding loops', () => {
      // Deeply nested encoding that could cause infinite loops
      const recursiveEncoding = '%25252e%25252e%25252f%25252e%25252e%25252f';
      
      const result = validatePath(recursiveEncoding);
      expect(result.isValid).toBe(false);
      expect(result.securityIssues.length).toBeGreaterThan(0);
    });
  });
});