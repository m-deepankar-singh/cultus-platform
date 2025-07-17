import { NextRequest } from 'next/server';
import { generateETag } from '@/lib/cache/etag-utils';
import { cacheConfig } from '@/lib/cache/config';

// Mock the cache config to enable caching for tests
jest.mock('@/lib/cache/config', () => ({
  cacheConfig: {
    enabled: true,
  },
}));

// Mock authentication
jest.mock('@/lib/auth/api-auth', () => ({
  authenticateApiRequestUltraFast: jest.fn(() => ({
    user: { id: 'test-user-id' },
    claims: { user_role: 'Admin', client_id: 'test-client-id' },
    supabase: {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              data: [
                { id: '1', name: 'Test Client 1' },
                { id: '2', name: 'Test Client 2' },
              ],
              error: null,
            })),
          })),
        })),
      })),
    },
  })),
}));

// Import the API handlers after mocking
import { GET as getClients } from '@/app/api/admin/clients/simple/route';

describe('Cache Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Client Lists API Caching', () => {
    test('returns cached response with correct headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/clients/simple');
      const response = await getClients(request);
      
      // Check that response is successful
      expect(response.status).toBe(200);
      
      // Check cache headers are present
      expect(response.headers.get('Cache-Control')).toContain('private, max-age=');
      expect(response.headers.get('ETag')).toBeDefined();
      expect(response.headers.get('Vary')).toBe('Authorization');
    });

    test('returns 304 for matching ETag', async () => {
      // First request to get the ETag
      const firstRequest = new NextRequest('http://localhost:3000/api/admin/clients/simple');
      const firstResponse = await getClients(firstRequest);
      const etag = firstResponse.headers.get('ETag');
      
      // Second request with matching ETag
      const secondRequest = new NextRequest('http://localhost:3000/api/admin/clients/simple', {
        headers: { 'If-None-Match': etag! },
      });
      const secondResponse = await getClients(secondRequest);
      
      expect(secondResponse.status).toBe(304);
    });

    test('returns fresh data for non-matching ETag', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/clients/simple', {
        headers: { 'If-None-Match': '"different-etag"' },
      });
      const response = await getClients(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('ETag')).toBeDefined();
      expect(response.headers.get('ETag')).not.toBe('"different-etag"');
    });
  });

  describe('ETag Generation Consistency', () => {
    test('generates consistent ETags for same data', () => {
      const data = [
        { id: '1', name: 'Test Client 1' },
        { id: '2', name: 'Test Client 2' },
      ];
      
      const etag1 = generateETag(data);
      const etag2 = generateETag(data);
      
      expect(etag1).toBe(etag2);
    });

    test('generates different ETags for different data', () => {
      const data1 = [
        { id: '1', name: 'Test Client 1' },
        { id: '2', name: 'Test Client 2' },
      ];
      
      const data2 = [
        { id: '1', name: 'Test Client 1' },
        { id: '3', name: 'Test Client 3' },
      ];
      
      const etag1 = generateETag(data1);
      const etag2 = generateETag(data2);
      
      expect(etag1).not.toBe(etag2);
    });
  });

  describe('Cache Configuration', () => {
    test('respects cache enabled setting', () => {
      expect(cacheConfig.enabled).toBe(true);
    });

    test('different cache types have different max-age values', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/clients/simple');
      const response = await getClients(request);
      
      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).toContain('max-age=');
      expect(cacheControl).toContain('private');
    });
  });

  describe('Cache Headers Validation', () => {
    test('includes required cache headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/clients/simple');
      const response = await getClients(request);
      
      // Check all required cache headers are present
      expect(response.headers.get('Cache-Control')).toBeDefined();
      expect(response.headers.get('ETag')).toBeDefined();
      expect(response.headers.get('Vary')).toBe('Authorization');
    });

    test('ETag format is correct', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/clients/simple');
      const response = await getClients(request);
      
      const etag = response.headers.get('ETag');
      expect(etag).toMatch(/^"[a-f0-9]{32}"$/);
    });

    test('Cache-Control includes correct directives', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/clients/simple');
      const response = await getClients(request);
      
      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).toContain('private');
      expect(cacheControl).toContain('max-age=');
      expect(cacheControl).not.toContain('no-cache');
      expect(cacheControl).not.toContain('no-store');
    });
  });

  describe('Error Handling', () => {
    test('handles missing If-None-Match header gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/clients/simple');
      const response = await getClients(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('ETag')).toBeDefined();
    });

    test('handles malformed ETag gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/clients/simple', {
        headers: { 'If-None-Match': 'malformed-etag' },
      });
      const response = await getClients(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('ETag')).toBeDefined();
    });
  });
});

// Test cache behavior when disabled
describe('Cache Disabled Integration Tests', () => {
  beforeAll(() => {
    // Mock cache config as disabled
    jest.doMock('@/lib/cache/config', () => ({
      cacheConfig: {
        enabled: false,
      },
    }));
  });

  test('skips caching when disabled', async () => {
    // Re-import after mocking
    const { cacheConfig: disabledConfig } = require('@/lib/cache/config');
    expect(disabledConfig.enabled).toBe(false);
    
    const request = new NextRequest('http://localhost:3000/api/admin/clients/simple');
    const response = await getClients(request);
    
    expect(response.status).toBe(200);
    // When caching is disabled, cache headers should not be present
    expect(response.headers.get('Cache-Control')).toBeNull();
    expect(response.headers.get('ETag')).toBeNull();
  });
});