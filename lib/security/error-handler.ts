import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auditLogger, AuditEventType, logSecurityEvent } from './audit-logger';

// Security event types for audit logging
export enum SecurityEventType {
  AUTH_FAILURE = "auth_failure",
  RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
  INVALID_TOKEN = "invalid_token",
  UNAUTHORIZED_ACCESS = "unauthorized_access",
  SUSPICIOUS_ACTIVITY = "suspicious_activity",
  DATA_BREACH_ATTEMPT = "data_breach_attempt",
}

// Standardized error response format
export interface SecureErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    timestamp: string;
    requestId?: string;
  };
}

// Internal error context for logging
export interface ErrorContext {
  endpoint: string;
  method: string;
  userId?: string;
  userRole?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  additionalData?: Record<string, unknown>;
}

// Sanitized error messages for different error types
const SANITIZED_MESSAGES = {
  AUTH_INVALID_CREDENTIALS: "Invalid credentials provided",
  AUTH_USER_NOT_FOUND: "Invalid credentials provided", // Don't reveal if user exists
  AUTH_ACCOUNT_LOCKED: "Account temporarily locked due to security policy",
  AUTH_TOKEN_EXPIRED: "Authentication token has expired",
  AUTH_TOKEN_INVALID: "Invalid authentication token",
  RATE_LIMIT_EXCEEDED: "Too many requests. Please try again later",
  VALIDATION_ERROR: "Invalid input data provided",
  UNAUTHORIZED_ACCESS: "Access denied",
  FORBIDDEN_OPERATION: "Operation not permitted",
  INTERNAL_SERVER_ERROR: "An internal server error occurred",
  DATABASE_ERROR: "A database error occurred",
  NETWORK_ERROR: "A network error occurred",
  SERVICE_UNAVAILABLE: "Service temporarily unavailable",
} as const;

type SanitizedMessageKey = keyof typeof SANITIZED_MESSAGES;

/**
 * Secure error logger that separates internal logging from user responses
 */
export class SecureErrorHandler {
  private static instance: SecureErrorHandler;
  private requestId: string;

  private constructor() {
    this.requestId = this.generateRequestId();
  }

  public static getInstance(): SecureErrorHandler {
    if (!SecureErrorHandler.instance) {
      SecureErrorHandler.instance = new SecureErrorHandler();
    }
    return SecureErrorHandler.instance;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Log security events with full context for internal monitoring
   */
  public logSecurityEvent(
    eventType: SecurityEventType,
    error: Error | unknown,
    context: ErrorContext
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      requestId: context.requestId || this.requestId,
      endpoint: context.endpoint,
      method: context.method,
      userId: context.userId,
      userRole: context.userRole,
      ip: context.ip,
      userAgent: context.userAgent,
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : "Unknown",
      },
      additionalData: context.additionalData,
    };

    // In production, this should go to a secure logging service
    // For now, we'll use console.error with structured logging
    console.error(`[SECURITY_EVENT] ${eventType}:`, JSON.stringify(logEntry, null, 2));
    
    // Also log to audit system
    let auditEventType: AuditEventType;
    switch (eventType) {
      case SecurityEventType.AUTH_FAILURE:
        auditEventType = AuditEventType.LOGIN_FAILURE;
        break;
      case SecurityEventType.RATE_LIMIT_EXCEEDED:
        auditEventType = AuditEventType.RATE_LIMIT_EXCEEDED;
        break;
      case SecurityEventType.UNAUTHORIZED_ACCESS:
        auditEventType = AuditEventType.UNAUTHORIZED_ENDPOINT_ACCESS;
        break;
      case SecurityEventType.SUSPICIOUS_ACTIVITY:
        auditEventType = AuditEventType.SUSPICIOUS_ACTIVITY;
        break;
      default:
        auditEventType = AuditEventType.SYSTEM_ERROR;
    }
    
    auditLogger.logEvent(auditEventType, {
      userId: context.userId,
      userRole: context.userRole,
      ip: context.ip || 'unknown',
      userAgent: context.userAgent || 'unknown',
      endpoint: context.endpoint,
      method: context.method,
      details: {
        securityEventType: eventType,
        errorMessage: error instanceof Error ? error.message : String(error),
        requestId: context.requestId || this.requestId,
      },
      metadata: context.additionalData,
    });
  }

  /**
   * Log internal errors without exposing sensitive information
   */
  public logInternalError(
    error: Error | unknown,
    context: ErrorContext
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: "ERROR",
      requestId: context.requestId || this.requestId,
      endpoint: context.endpoint,
      method: context.method,
      userId: context.userId,
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : "Unknown",
      },
      additionalData: context.additionalData,
    };

    console.error(`[INTERNAL_ERROR]:`, JSON.stringify(logEntry, null, 2));
  }

  /**
   * Create a sanitized error response for API endpoints
   */
  public createSecureResponse(
    messageKey: SanitizedMessageKey,
    statusCode: number = 500,
    requestId?: string
  ): NextResponse<SecureErrorResponse> {
    const response: SecureErrorResponse = {
      success: false,
      error: {
        message: SANITIZED_MESSAGES[messageKey],
        code: messageKey,
        timestamp: new Date().toISOString(),
        requestId: requestId || this.requestId,
      },
    };

    return NextResponse.json(response, { status: statusCode });
  }

  /**
   * Handle validation errors (Zod) safely
   */
  public handleValidationError(
    error: ZodError,
    context: ErrorContext
  ): NextResponse<SecureErrorResponse> {
    this.logInternalError(error, {
      ...context,
      additionalData: { validationErrors: error.errors },
    });

    return this.createSecureResponse("VALIDATION_ERROR", 400, context.requestId);
  }

  /**
   * Handle authentication errors safely
   */
  public handleAuthError(
    error: Error | unknown,
    context: ErrorContext,
    eventType: SecurityEventType = SecurityEventType.AUTH_FAILURE
  ): NextResponse<SecureErrorResponse> {
    this.logSecurityEvent(eventType, error, context);

    // Determine appropriate response based on error type
    let messageKey: SanitizedMessageKey = "AUTH_INVALID_CREDENTIALS";
    let statusCode = 401;

    if (error instanceof Error) {
      if (error.message.includes("rate limit") || error.message.includes("too many")) {
        messageKey = "RATE_LIMIT_EXCEEDED";
        statusCode = 429;
      } else if (error.message.includes("locked")) {
        messageKey = "AUTH_ACCOUNT_LOCKED";
        statusCode = 423;
      } else if (error.message.includes("expired")) {
        messageKey = "AUTH_TOKEN_EXPIRED";
        statusCode = 401;
      } else if (error.message.includes("invalid token")) {
        messageKey = "AUTH_TOKEN_INVALID";
        statusCode = 401;
      }
    }

    return this.createSecureResponse(messageKey, statusCode, context.requestId);
  }

  /**
   * Handle database errors safely
   */
  public handleDatabaseError(
    error: Error | unknown,
    context: ErrorContext
  ): NextResponse<SecureErrorResponse> {
    this.logInternalError(error, {
      ...context,
      additionalData: { errorType: "database" },
    });

    return this.createSecureResponse("DATABASE_ERROR", 500, context.requestId);
  }

  /**
   * Handle unauthorized access attempts
   */
  public handleUnauthorizedAccess(
    error: Error | unknown,
    context: ErrorContext
  ): NextResponse<SecureErrorResponse> {
    this.logSecurityEvent(SecurityEventType.UNAUTHORIZED_ACCESS, error, context);

    return this.createSecureResponse("UNAUTHORIZED_ACCESS", 401, context.requestId);
  }

  /**
   * Handle forbidden operations
   */
  public handleForbiddenOperation(
    error: Error | unknown,
    context: ErrorContext
  ): NextResponse<SecureErrorResponse> {
    this.logSecurityEvent(SecurityEventType.UNAUTHORIZED_ACCESS, error, context);

    return this.createSecureResponse("FORBIDDEN_OPERATION", 403, context.requestId);
  }

  /**
   * Handle rate limit exceeded
   */
  public handleRateLimitExceeded(
    error: Error | unknown,
    context: ErrorContext
  ): NextResponse<SecureErrorResponse> {
    this.logSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, error, context);

    return this.createSecureResponse("RATE_LIMIT_EXCEEDED", 429, context.requestId);
  }

  /**
   * Generic error handler for unexpected errors
   */
  public handleGenericError(
    error: Error | unknown,
    context: ErrorContext
  ): NextResponse<SecureErrorResponse> {
    this.logInternalError(error, context);

    return this.createSecureResponse("INTERNAL_SERVER_ERROR", 500, context.requestId);
  }
}

// Export convenience functions for common use cases
export const errorHandler = SecureErrorHandler.getInstance();

export const createErrorContext = (
  endpoint: string,
  method: string,
  additionalData?: Partial<ErrorContext>
): ErrorContext => ({
  endpoint,
  method,
  ...additionalData,
});

export const handleSecureError = (
  error: Error | unknown,
  context: ErrorContext,
  errorType: "auth" | "database" | "validation" | "unauthorized" | "forbidden" | "rate_limit" | "generic" = "generic"
): NextResponse<SecureErrorResponse> => {
  switch (errorType) {
    case "auth":
      return errorHandler.handleAuthError(error, context);
    case "database":
      return errorHandler.handleDatabaseError(error, context);
    case "validation":
      return errorHandler.handleValidationError(error as ZodError, context);
    case "unauthorized":
      return errorHandler.handleUnauthorizedAccess(error, context);
    case "forbidden":
      return errorHandler.handleForbiddenOperation(error, context);
    case "rate_limit":
      return errorHandler.handleRateLimitExceeded(error, context);
    default:
      return errorHandler.handleGenericError(error, context);
  }
};