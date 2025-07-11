/**
 * Security validation utilities for background process execution
 * Addresses CVE-2025-007: Background Process Execution Vulnerability
 */

// UUID validation regex pattern
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Resource limits for background processes
export const RESOURCE_LIMITS = {
  // Maximum execution time for analysis processes (10 minutes)
  MAX_EXECUTION_TIME_MS: 10 * 60 * 1000,
  
  // Maximum concurrent analysis processes per user
  MAX_CONCURRENT_PROCESSES_PER_USER: 3,
  
  // Maximum video file size for processing (500MB)
  MAX_VIDEO_SIZE_BYTES: 500 * 1024 * 1024,
  
  // Memory monitoring threshold (500MB)
  MEMORY_THRESHOLD_BYTES: 500 * 1024 * 1024
} as const;

/**
 * Validates if a string is a valid UUID format
 */
export function validateUUID(value: string): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  
  return UUID_PATTERN.test(value);
}

/**
 * Sanitizes and validates input parameters for background processes
 */
export function validateProcessInputs(submissionId: string, userId: string): {
  isValid: boolean;
  error?: string;
  sanitizedSubmissionId?: string;
  sanitizedUserId?: string;
} {
  // Validate submission ID
  if (!submissionId || typeof submissionId !== 'string') {
    return {
      isValid: false,
      error: 'Submission ID is required and must be a string'
    };
  }
  
  const sanitizedSubmissionId = submissionId.trim();
  if (!validateUUID(sanitizedSubmissionId)) {
    return {
      isValid: false,
      error: 'Invalid submission ID format. Must be a valid UUID.'
    };
  }
  
  // Validate user ID
  if (!userId || typeof userId !== 'string') {
    return {
      isValid: false,
      error: 'User ID is required and must be a string'
    };
  }
  
  const sanitizedUserId = userId.trim();
  if (!validateUUID(sanitizedUserId)) {
    return {
      isValid: false,
      error: 'Invalid user ID format. Must be a valid UUID.'
    };
  }
  
  return {
    isValid: true,
    sanitizedSubmissionId,
    sanitizedUserId
  };
}

/**
 * Tracks active background processes to prevent resource exhaustion
 */
class ProcessTracker {
  private activeProcesses = new Map<string, Set<string>>();
  
  /**
   * Checks if a user can start a new process
   */
  canStartProcess(userId: string): boolean {
    const userProcesses = this.activeProcesses.get(userId);
    return !userProcesses || userProcesses.size < RESOURCE_LIMITS.MAX_CONCURRENT_PROCESSES_PER_USER;
  }
  
  /**
   * Registers a new process for a user
   */
  startProcess(userId: string, processId: string): void {
    if (!this.activeProcesses.has(userId)) {
      this.activeProcesses.set(userId, new Set());
    }
    this.activeProcesses.get(userId)!.add(processId);
  }
  
  /**
   * Unregisters a process when it completes
   */
  endProcess(userId: string, processId: string): void {
    const userProcesses = this.activeProcesses.get(userId);
    if (userProcesses) {
      userProcesses.delete(processId);
      if (userProcesses.size === 0) {
        this.activeProcesses.delete(userId);
      }
    }
  }
  
  /**
   * Gets the number of active processes for a user
   */
  getActiveProcessCount(userId: string): number {
    const userProcesses = this.activeProcesses.get(userId);
    return userProcesses ? userProcesses.size : 0;
  }
}

// Global process tracker instance
export const processTracker = new ProcessTracker();

/**
 * Creates a timeout promise for resource exhaustion prevention
 */
export function createProcessTimeout(timeoutMs: number = RESOURCE_LIMITS.MAX_EXECUTION_TIME_MS): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Process timeout: Execution exceeded ${timeoutMs}ms limit`));
    }, timeoutMs);
  });
}

/**
 * Validates video file size to prevent memory exhaustion
 */
export function validateVideoSize(sizeBytes: number): {
  isValid: boolean;
  error?: string;
} {
  if (sizeBytes > RESOURCE_LIMITS.MAX_VIDEO_SIZE_BYTES) {
    return {
      isValid: false,
      error: `Video file too large: ${sizeBytes} bytes exceeds limit of ${RESOURCE_LIMITS.MAX_VIDEO_SIZE_BYTES} bytes`
    };
  }
  
  return { isValid: true };
}

/**
 * Monitors memory usage during process execution
 */
export function checkMemoryUsage(): {
  isWithinLimits: boolean;
  currentUsage: number;
  warning?: string;
} {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    const heapUsed = usage.heapUsed;
    
    return {
      isWithinLimits: heapUsed < RESOURCE_LIMITS.MEMORY_THRESHOLD_BYTES,
      currentUsage: heapUsed,
      warning: heapUsed > RESOURCE_LIMITS.MEMORY_THRESHOLD_BYTES ? 
        `Memory usage ${heapUsed} bytes exceeds threshold ${RESOURCE_LIMITS.MEMORY_THRESHOLD_BYTES} bytes` : 
        undefined
    };
  }
  
  return {
    isWithinLimits: true,
    currentUsage: 0
  };
}