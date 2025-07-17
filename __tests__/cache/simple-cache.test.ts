import { generateCacheHeaders, CACHE_CONFIGS } from '@/lib/cache/simple-cache';
import { generateETag, checkETagMatch, handleConditionalRequest } from '@/lib/cache/etag-utils';

// Mock NextResponse for testing
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data: any, options?: any) => ({
      data,
      headers: options?.headers || {},
      status: options?.status || 200,
    })),
  },
}));

describe('Simple Cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateCacheHeaders', () => {
    test('generates correct cache headers for static config', () => {
      const headers = generateCacheHeaders(CACHE_CONFIGS.STATIC);
      expect(headers['Cache-Control']).toBe('private, max-age=900');
      expect(headers['Vary']).toBe('Authorization');
    });

    test('generates correct cache headers for dynamic config', () => {
      const headers = generateCacheHeaders(CACHE_CONFIGS.DYNAMIC);
      expect(headers['Cache-Control']).toBe('private, max-age=60');
      expect(headers['Vary']).toBe('Authorization');
    });

    test('generates correct cache headers for frequent config', () => {
      const headers = generateCacheHeaders(CACHE_CONFIGS.FREQUENT);
      expect(headers['Cache-Control']).toBe('private, max-age=30');
      expect(headers['Vary']).toBe('Authorization');
    });

    test('generates correct cache headers for semi-static config', () => {
      const headers = generateCacheHeaders(CACHE_CONFIGS.SEMI_STATIC);
      expect(headers['Cache-Control']).toBe('private, max-age=300');
      expect(headers['Vary']).toBe('Authorization');
    });

    test('includes must-revalidate when specified', () => {
      const config = { ...CACHE_CONFIGS.STATIC, mustRevalidate: true };
      const headers = generateCacheHeaders(config);
      expect(headers['Cache-Control']).toBe('private, max-age=900, must-revalidate');
    });

    test('supports public cache type', () => {
      const config = { maxAge: 600, cacheType: 'public' as const };
      const headers = generateCacheHeaders(config);
      expect(headers['Cache-Control']).toBe('public, max-age=600');
    });
  });

  describe('generateETag', () => {
    test('generates consistent ETags for same data', () => {
      const data = { id: 1, name: 'Test' };
      const etag1 = generateETag(data);
      const etag2 = generateETag(data);
      expect(etag1).toBe(etag2);
    });

    test('generates different ETags for different data', () => {
      const data1 = { id: 1, name: 'Test1' };
      const data2 = { id: 2, name: 'Test2' };
      const etag1 = generateETag(data1);
      const etag2 = generateETag(data2);
      expect(etag1).not.toBe(etag2);
    });

    test('generates ETag in correct format', () => {
      const data = { id: 1, name: 'Test' };
      const etag = generateETag(data);
      expect(etag).toMatch(/^"[a-f0-9]{32}"$/);
    });

    test('handles complex objects', () => {
      const data = {
        users: [
          { id: 1, profile: { name: 'John', settings: { theme: 'dark' } } },
          { id: 2, profile: { name: 'Jane', settings: { theme: 'light' } } },
        ],
        metadata: { count: 2, updated: '2025-01-17' },
      };
      const etag = generateETag(data);
      expect(etag).toBeDefined();
      expect(typeof etag).toBe('string');
    });
  });

  describe('checkETagMatch', () => {
    test('detects ETag matches', () => {
      const data = { id: 1, name: 'Test' };
      const etag = generateETag(data);
      
      const mockRequest = {
        headers: {
          get: jest.fn((header: string) => {
            if (header === 'If-None-Match') return etag;
            return null;
          }),
        },
      } as any;
      
      expect(checkETagMatch(mockRequest, etag)).toBe(true);
    });

    test('detects ETag mismatches', () => {
      const data1 = { id: 1, name: 'Test1' };
      const data2 = { id: 2, name: 'Test2' };
      const etag1 = generateETag(data1);
      const etag2 = generateETag(data2);
      
      const mockRequest = {
        headers: {
          get: jest.fn((header: string) => {
            if (header === 'If-None-Match') return etag1;
            return null;
          }),
        },
      } as any;
      
      expect(checkETagMatch(mockRequest, etag2)).toBe(false);
    });

    test('returns false when no If-None-Match header', () => {
      const etag = generateETag({ id: 1, name: 'Test' });
      
      const mockRequest = {
        headers: {
          get: jest.fn(() => null),
        },
      } as any;
      
      expect(checkETagMatch(mockRequest, etag)).toBe(false);
    });
  });

  describe('handleConditionalRequest', () => {
    test('returns 304 for matching ETag', () => {
      const data = { id: 1, name: 'Test' };
      const etag = generateETag(data);
      
      const mockRequest = {
        headers: {
          get: jest.fn((header: string) => {
            if (header === 'If-None-Match') return etag;
            return null;
          }),
        },
      } as any;
      
      const response = handleConditionalRequest(mockRequest, data, CACHE_CONFIGS.STATIC);
      expect(response.status).toBe(304);
    });

    test('returns cached response for non-matching ETag', () => {
      const data = { id: 1, name: 'Test' };
      
      const mockRequest = {
        headers: {
          get: jest.fn(() => null), // No If-None-Match header
        },
      } as any;
      
      const response = handleConditionalRequest(mockRequest, data, CACHE_CONFIGS.STATIC);
      const { NextResponse } = require('next/server');
      expect(NextResponse.json).toHaveBeenCalledWith(data, {
        headers: expect.objectContaining({
          'Cache-Control': 'private, max-age=900',
          'Vary': 'Authorization',
          'ETag': expect.stringMatching(/^"[a-f0-9]{32}"$/),
        }),
      });
    });

    test('includes correct cache headers in response', () => {
      const data = { id: 1, name: 'Test' };
      
      const mockRequest = {
        headers: {
          get: jest.fn(() => null),
        },
      } as any;
      
      handleConditionalRequest(mockRequest, data, CACHE_CONFIGS.DYNAMIC);
      const { NextResponse } = require('next/server');
      expect(NextResponse.json).toHaveBeenCalledWith(data, {
        headers: expect.objectContaining({
          'Cache-Control': 'private, max-age=60',
          'Vary': 'Authorization',
        }),
      });
    });
  });

  describe('CACHE_CONFIGS', () => {
    test('has correct values for all cache types', () => {
      expect(CACHE_CONFIGS.STATIC.maxAge).toBe(900); // 15 minutes
      expect(CACHE_CONFIGS.SEMI_STATIC.maxAge).toBe(300); // 5 minutes
      expect(CACHE_CONFIGS.DYNAMIC.maxAge).toBe(60); // 1 minute
      expect(CACHE_CONFIGS.FREQUENT.maxAge).toBe(30); // 30 seconds
    });

    test('all cache types use private caching', () => {
      expect(CACHE_CONFIGS.STATIC.cacheType).toBe('private');
      expect(CACHE_CONFIGS.SEMI_STATIC.cacheType).toBe('private');
      expect(CACHE_CONFIGS.DYNAMIC.cacheType).toBe('private');
      expect(CACHE_CONFIGS.FREQUENT.cacheType).toBe('private');
    });
  });
});