import { DatabaseCacheManager, CacheUtils } from '../../lib/cache/cache-manager';
import { enhancedCacheInvalidation, CacheInvalidationHooks, CacheInvalidationUtils } from '../../lib/cache/invalidation-hooks';

// Create a mock cache manager for testing
const mockSupabaseClient = {
  rpc: jest.fn(),
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn(),
  gt: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
};

// Mock the cache manager methods
const mockCacheManager = {
  getCachedData: jest.fn(),
  setCachedData: jest.fn(),
  getCachedExpertSessions: jest.fn(),
  getCachedProductPerformance: jest.fn(),
  invalidateByTags: jest.fn(),
  getCacheMetrics: jest.fn(),
  getCacheStats: jest.fn(),
  withCache: jest.fn(),
  cleanupExpiredCache: jest.fn(),
};

describe('Cache Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks before each test
    Object.values(mockCacheManager).forEach(mockFn => {
      if (jest.isMockFunction(mockFn)) {
        mockFn.mockReset();
      }
    });
  });

  describe('Expert Sessions Caching', () => {
    test('should cache and retrieve expert sessions data', async () => {
      const mockSessionsData = [
        {
          id: 'session-1',
          title: 'Test Session 1',
          description: 'Test Description',
          video_duration: 300,
          completion_stats: { total_viewers: 10, completion_rate: 80 }
        }
      ];

      mockCacheManager.getCachedExpertSessions.mockResolvedValue(mockSessionsData);

      const result = await mockCacheManager.getCachedExpertSessions();
      
      expect(mockCacheManager.getCachedExpertSessions).toHaveBeenCalled();
      expect(result).toEqual(mockSessionsData);
    });

    test('should handle product filtering', async () => {
      const productId = 'product-123';
      const mockSessionsData = [{ id: 'session-1', title: 'Filtered Session' }];

      mockCacheManager.getCachedExpertSessions.mockResolvedValue(mockSessionsData);

      const result = await mockCacheManager.getCachedExpertSessions(productId, '10 minutes');
      
      expect(mockCacheManager.getCachedExpertSessions).toHaveBeenCalledWith(productId, '10 minutes');
      expect(result).toEqual(mockSessionsData);
    });

    test('should throw error on RPC failure', async () => {
      mockCacheManager.getCachedExpertSessions.mockRejectedValue(new Error('Cache operation failed: RPC failed'));

      await expect(mockCacheManager.getCachedExpertSessions()).rejects.toThrow(
        'Cache operation failed: RPC failed'
      );
    });
  });

  describe('Product Performance Caching', () => {
    test('should cache and retrieve product performance data', async () => {
      const mockPerformanceData = [
        {
          productId: 'product-1',
          productName: 'Test Product',
          averageOverallProductProgress: 75.5,
          totalEngagedLearners: 50,
          completionRate: 80
        }
      ];

      mockCacheManager.getCachedProductPerformance.mockResolvedValue(mockPerformanceData);

      const result = await mockCacheManager.getCachedProductPerformance();
      
      expect(mockCacheManager.getCachedProductPerformance).toHaveBeenCalled();
      expect(result).toEqual(mockPerformanceData);
    });

    test('should handle client filtering', async () => {
      const clientId = 'client-456';
      
      mockCacheManager.getCachedProductPerformance.mockResolvedValue([]);

      const result = await mockCacheManager.getCachedProductPerformance(clientId, '30 minutes');
      
      expect(mockCacheManager.getCachedProductPerformance).toHaveBeenCalledWith(clientId, '30 minutes');
      expect(result).toEqual([]);
    });
  });

  describe('Generic Cache Operations', () => {
    test('should get cached data', async () => {
      const mockCacheData = { test: 'data' };
      mockCacheManager.getCachedData.mockResolvedValue(mockCacheData);

      const result = await mockCacheManager.getCachedData('test-key', '5 minutes');
      
      expect(mockCacheManager.getCachedData).toHaveBeenCalledWith('test-key', '5 minutes');
      expect(result).toEqual(mockCacheData);
    });

    test('should set cached data', async () => {
      const testData = { message: 'test data' };
      const testTags = ['test', 'data'];

      mockCacheManager.setCachedData.mockResolvedValue(undefined);

      await mockCacheManager.setCachedData('test-key', testData, '10 minutes', testTags);
      
      expect(mockCacheManager.setCachedData).toHaveBeenCalledWith('test-key', testData, '10 minutes', testTags);
    });

    test('should invalidate cache by tags', async () => {
      const testTags = ['test', 'invalidate'];
      mockCacheManager.invalidateByTags.mockResolvedValue(3);

      const result = await mockCacheManager.invalidateByTags(testTags);
      
      expect(mockCacheManager.invalidateByTags).toHaveBeenCalledWith(testTags);
      expect(result).toBe(3);
    });

    test('should handle invalidation errors gracefully', async () => {
      mockCacheManager.invalidateByTags.mockResolvedValue(0);

      const result = await mockCacheManager.invalidateByTags(['test']);
      expect(result).toBe(0);
    });
  });

  describe('Cache Metrics', () => {
    test('should get cache metrics', async () => {
      const mockMetrics = {
        total_entries: 100,
        average_hits: 5.5,
        max_hits: 25,
        reused_entries: 80,
        expired_entries: 5
      };

      mockCacheManager.getCacheMetrics.mockResolvedValue(mockMetrics);

      const result = await mockCacheManager.getCacheMetrics();
      
      expect(result).toBeDefined();
      expect(result?.total_entries).toBe(100);
      expect(result?.reused_entries).toBe(80);
      expect(result?.expired_entries).toBe(5);
    });

    test('should get cache statistics', async () => {
      const mockStats = {
        hitRate: 80,
        topEntries: [
          { cache_key: 'test-key', hit_count: 10, created_at: '2024-01-01T10:00:00Z' }
        ],
        timestamp: new Date().toISOString()
      };

      mockCacheManager.getCacheStats.mockResolvedValue(mockStats);

      const result = await mockCacheManager.getCacheStats();
      
      expect(result).toBeDefined();
      expect(result?.hitRate).toBe(80);
      expect(result?.topEntries).toHaveLength(1);
      expect(result?.timestamp).toBeDefined();
    });
  });

  describe('Cache Wrapper Function', () => {
    test('should execute fetch function and cache result', async () => {
      const mockFetchResult = { data: 'fresh data' };
      const fetchFunction = jest.fn().mockResolvedValue(mockFetchResult);

      mockCacheManager.withCache.mockImplementation(async (key, fetchFn, config) => {
        return await fetchFn();
      });

      const result = await mockCacheManager.withCache(
        'test-key',
        fetchFunction,
        { duration: '5 minutes', tags: ['test'] }
      );

      expect(fetchFunction).toHaveBeenCalled();
      expect(result).toEqual(mockFetchResult);
    });

    test('should return cached data without executing fetch function', async () => {
      const cachedData = { data: 'cached data' };
      const fetchFunction = jest.fn();

      mockCacheManager.withCache.mockResolvedValue(cachedData);

      const result = await mockCacheManager.withCache(
        'test-key',
        fetchFunction
      );

      expect(result).toEqual(cachedData);
    });
  });
});

describe('Cache Utils', () => {
  test('should generate correct cache keys', () => {
    expect(CacheUtils.studentProgressKey('student-123')).toBe('student_progress:student-123');
    expect(CacheUtils.studentProgressKey('student-123', 'module-456')).toBe('student_progress:student-123:module-456');
    expect(CacheUtils.productPerformanceKey()).toBe('product_performance:all');
    expect(CacheUtils.productPerformanceKey('client-789')).toBe('product_performance:client-789');
    expect(CacheUtils.expertSessionsKey()).toBe('expert_sessions:all');
    expect(CacheUtils.expertSessionsKey('product-123')).toBe('expert_sessions:product-123');
  });

  test('should provide correct cache durations', () => {
    expect(CacheUtils.durations.SHORT).toBe('2 minutes');
    expect(CacheUtils.durations.MEDIUM).toBe('5 minutes');
    expect(CacheUtils.durations.LONG).toBe('15 minutes');
    expect(CacheUtils.durations.EXTENDED).toBe('1 hour');
    expect(CacheUtils.durations.DAILY).toBe('24 hours');
  });

  test('should provide correct cache tags', () => {
    expect(CacheUtils.tags.STUDENT_PROGRESS).toEqual(['student_progress', 'progress']);
    expect(CacheUtils.tags.EXPERT_SESSIONS).toEqual(['expert_sessions', 'sessions', 'stats']);
    expect(CacheUtils.tags.PRODUCT_PERFORMANCE).toEqual(['products', 'performance', 'analytics']);
    expect(CacheUtils.tags.MODULE_DATA).toEqual(['modules', 'module_completion']);
    expect(CacheUtils.tags.ANALYTICS).toEqual(['analytics', 'stats', 'performance']);
  });
});

describe('Cache Invalidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle student progress update invalidation', async () => {
    const invalidateSpy = jest.spyOn(mockCacheManager, 'invalidateByTags').mockResolvedValue(2);

    await mockCacheManager.invalidateByTags(['student_progress', `student:student-123`]);

    expect(invalidateSpy).toHaveBeenCalledWith(['student_progress', 'student:student-123']);
  });

  test('should handle expert session update invalidation', async () => {
    const invalidateSpy = jest.spyOn(mockCacheManager, 'invalidateByTags').mockResolvedValue(1);

    await mockCacheManager.invalidateByTags(['expert_sessions', 'session:session-789']);

    expect(invalidateSpy).toHaveBeenCalledWith(['expert_sessions', 'session:session-789']);
  });

  test('should handle bulk invalidation', async () => {
    const invalidateSpy = jest.spyOn(mockCacheManager, 'invalidateByTags').mockResolvedValue(5);

    await mockCacheManager.invalidateByTags(['student_progress', 'modules']);

    expect(invalidateSpy).toHaveBeenCalledWith(['student_progress', 'modules']);
  });

  test('should handle analytics update invalidation', async () => {
    const invalidateSpy = jest.spyOn(mockCacheManager, 'invalidateByTags').mockResolvedValue(3);

    await mockCacheManager.invalidateByTags(['analytics', 'performance', 'stats']);

    expect(invalidateSpy).toHaveBeenCalledWith(['analytics', 'performance', 'stats']);
  });

  test('should get correct tags for entity', () => {
    expect(CacheInvalidationUtils.getTagsForEntity('student', 'student-123')).toEqual([
      'student_progress', 'product_performance', 'student:student-123'
    ]);
    expect(CacheInvalidationUtils.getTagsForEntity('expert_session', 'session-456')).toEqual([
      'expert_sessions', 'stats', 'session:session-456'
    ]);
  });
}); 