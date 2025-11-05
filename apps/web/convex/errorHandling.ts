/**
 * Centralized error handling for Convex functions
 *
 * This module provides standardized error handling patterns to prevent crashes
 * and provide meaningful error messages to users.
 */

import { ConvexError } from "convex/values";

/**
 * Error categories for classification and handling
 */
export enum ErrorCategory {
  AUTHENTICATION = "AUTHENTICATION",
  AUTHORIZATION = "AUTHORIZATION",
  VALIDATION = "VALIDATION",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  DATABASE = "DATABASE",
  EXTERNAL_SERVICE = "EXTERNAL_SERVICE",
  RATE_LIMIT = "RATE_LIMIT",
  INTERNAL = "INTERNAL",
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = "LOW",         // User can continue, informational
  MEDIUM = "MEDIUM",   // User should be aware, feature degraded
  HIGH = "HIGH",       // Critical feature broken, user cannot continue
  CRITICAL = "CRITICAL", // System-level failure, requires immediate attention
}

/**
 * Structured error response
 */
export interface AppError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  details?: Record<string, any>;
  retryable: boolean;
  timestamp: number;
}

/**
 * Create a standardized error object
 */
export function createError(
  category: ErrorCategory,
  message: string,
  userMessage: string,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  details?: Record<string, any>,
  retryable: boolean = false
): AppError {
  return {
    category,
    severity,
    message,
    userMessage,
    details,
    retryable,
    timestamp: Date.now(),
  };
}

/**
 * Throw a ConvexError with structured error data
 */
export function throwAppError(error: AppError): never {
  throw new ConvexError({
    ...error,
    code: error.category,
  });
}

/**
 * Validation error helpers
 */
export class ValidationError {
  static required(field: string): AppError {
    return createError(
      ErrorCategory.VALIDATION,
      `Required field missing: ${field}`,
      `Please provide a value for ${field}`,
      ErrorSeverity.LOW,
      { field },
      false
    );
  }

  static invalid(field: string, reason: string): AppError {
    return createError(
      ErrorCategory.VALIDATION,
      `Invalid ${field}: ${reason}`,
      `The ${field} you provided is invalid. ${reason}`,
      ErrorSeverity.LOW,
      { field, reason },
      false
    );
  }

  static range(field: string, min: number, max: number, value: number): AppError {
    return createError(
      ErrorCategory.VALIDATION,
      `Value ${value} out of range for ${field}: must be between ${min} and ${max}`,
      `${field} must be between ${min} and ${max}`,
      ErrorSeverity.LOW,
      { field, min, max, value },
      false
    );
  }

  static tooLong(field: string, maxLength: number, actualLength: number): AppError {
    return createError(
      ErrorCategory.VALIDATION,
      `${field} exceeds maximum length of ${maxLength} (got ${actualLength})`,
      `${field} is too long. Maximum ${maxLength} characters allowed.`,
      ErrorSeverity.LOW,
      { field, maxLength, actualLength },
      false
    );
  }

  static tooShort(field: string, minLength: number, actualLength: number): AppError {
    return createError(
      ErrorCategory.VALIDATION,
      `${field} below minimum length of ${minLength} (got ${actualLength})`,
      `${field} is too short. Minimum ${minLength} characters required.`,
      ErrorSeverity.LOW,
      { field, minLength, actualLength },
      false
    );
  }
}

/**
 * Authentication error helpers
 */
export class AuthError {
  static notAuthenticated(): AppError {
    return createError(
      ErrorCategory.AUTHENTICATION,
      "User not authenticated",
      "Please sign in to continue",
      ErrorSeverity.HIGH,
      undefined,
      false
    );
  }

  static sessionExpired(): AppError {
    return createError(
      ErrorCategory.AUTHENTICATION,
      "Session expired",
      "Your session has expired. Please sign in again.",
      ErrorSeverity.HIGH,
      undefined,
      false
    );
  }

  static invalidCredentials(): AppError {
    return createError(
      ErrorCategory.AUTHENTICATION,
      "Invalid credentials",
      "Invalid email or password. Please try again.",
      ErrorSeverity.MEDIUM,
      undefined,
      true
    );
  }
}

/**
 * Authorization error helpers
 */
export class AuthorizationError {
  static forbidden(resource: string): AppError {
    return createError(
      ErrorCategory.AUTHORIZATION,
      `Access denied to ${resource}`,
      "You don't have permission to perform this action",
      ErrorSeverity.MEDIUM,
      { resource },
      false
    );
  }

  static organizationMismatch(): AppError {
    return createError(
      ErrorCategory.AUTHORIZATION,
      "Resource belongs to different organization",
      "This resource is not available in your current workspace",
      ErrorSeverity.MEDIUM,
      undefined,
      false
    );
  }

  static insufficientRole(requiredRole: string, actualRole: string): AppError {
    return createError(
      ErrorCategory.AUTHORIZATION,
      `Insufficient role: required ${requiredRole}, has ${actualRole}`,
      `This action requires ${requiredRole} permissions`,
      ErrorSeverity.MEDIUM,
      { requiredRole, actualRole },
      false
    );
  }
}

/**
 * Not found error helpers
 */
export class NotFoundError {
  static resource(type: string, id?: string): AppError {
    return createError(
      ErrorCategory.NOT_FOUND,
      `${type} not found${id ? `: ${id}` : ""}`,
      `The ${type.toLowerCase()} you're looking for could not be found. It may have been deleted.`,
      ErrorSeverity.MEDIUM,
      { type, id },
      false
    );
  }

  static project(id?: string): AppError {
    return createError(
      ErrorCategory.NOT_FOUND,
      `Project not found${id ? `: ${id}` : ""}`,
      "Project not found. It may have been deleted or you don't have access.",
      ErrorSeverity.MEDIUM,
      { id },
      false
    );
  }

  static client(id?: string): AppError {
    return createError(
      ErrorCategory.NOT_FOUND,
      `Client not found${id ? `: ${id}` : ""}`,
      "Client not found. It may have been deleted or you don't have access.",
      ErrorSeverity.MEDIUM,
      { id },
      false
    );
  }

  static timer(): AppError {
    return createError(
      ErrorCategory.NOT_FOUND,
      "No running timer found",
      "No active timer found",
      ErrorSeverity.LOW,
      undefined,
      false
    );
  }
}

/**
 * Conflict error helpers
 */
export class ConflictError {
  static duplicate(resource: string, field: string): AppError {
    return createError(
      ErrorCategory.CONFLICT,
      `Duplicate ${resource}: ${field} already exists`,
      `A ${resource.toLowerCase()} with this ${field} already exists`,
      ErrorSeverity.MEDIUM,
      { resource, field },
      false
    );
  }

  static archivedResource(resource: string): AppError {
    return createError(
      ErrorCategory.CONFLICT,
      `Cannot operate on archived ${resource}`,
      `This ${resource.toLowerCase()} is archived. Please unarchive it first or select a different one.`,
      ErrorSeverity.MEDIUM,
      { resource },
      false
    );
  }

  static hasActiveTimer(): AppError {
    return createError(
      ErrorCategory.CONFLICT,
      "Timer already running",
      "A timer is already running. Please stop the current timer first.",
      ErrorSeverity.MEDIUM,
      undefined,
      false
    );
  }

  static hasTimeEntries(resource: string): AppError {
    return createError(
      ErrorCategory.CONFLICT,
      `Cannot delete ${resource} with time entries`,
      `Cannot delete this ${resource.toLowerCase()} because it has associated time entries. Please delete the time entries first or archive the ${resource.toLowerCase()} instead.`,
      ErrorSeverity.MEDIUM,
      { resource },
      false
    );
  }
}

/**
 * Database error helpers
 */
export class DatabaseError {
  static queryFailed(operation: string, details?: string): AppError {
    return createError(
      ErrorCategory.DATABASE,
      `Database operation failed: ${operation}${details ? ` - ${details}` : ""}`,
      "A database error occurred. Please try again.",
      ErrorSeverity.HIGH,
      { operation, details },
      true
    );
  }

  static timeout(operation: string): AppError {
    return createError(
      ErrorCategory.DATABASE,
      `Database operation timed out: ${operation}`,
      "The operation took too long. Please try again.",
      ErrorSeverity.HIGH,
      { operation },
      true
    );
  }
}

/**
 * External service error helpers
 */
export class ExternalServiceError {
  static unavailable(service: string): AppError {
    return createError(
      ErrorCategory.EXTERNAL_SERVICE,
      `External service unavailable: ${service}`,
      `${service} is currently unavailable. Please try again later.`,
      ErrorSeverity.HIGH,
      { service },
      true
    );
  }

  static timeout(service: string): AppError {
    return createError(
      ErrorCategory.EXTERNAL_SERVICE,
      `External service timeout: ${service}`,
      `Request to ${service} timed out. Please try again.`,
      ErrorSeverity.HIGH,
      { service },
      true
    );
  }
}

/**
 * Safe execution wrapper for Convex functions
 * Catches and standardizes all errors
 */
export async function safeExecute<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    // If it's already an AppError, re-throw as ConvexError
    if (error.category && error.userMessage) {
      throwAppError(error);
    }

    // Handle ConvexError
    if (error instanceof ConvexError) {
      throw error;
    }

    // Log unexpected errors
    console.error(`[${context}] Unexpected error:`, error);

    // Create a generic internal error
    const internalError = createError(
      ErrorCategory.INTERNAL,
      `Unexpected error in ${context}: ${error?.message || String(error)}`,
      "An unexpected error occurred. Please try again or contact support if the problem persists.",
      ErrorSeverity.HIGH,
      { context, originalError: error?.message },
      true
    );

    throwAppError(internalError);
  }
}

/**
 * Validate and sanitize string input
 */
export function validateString(
  value: any,
  fieldName: string,
  options?: {
    minLength?: number;
    maxLength?: number;
    required?: boolean;
    trim?: boolean;
  }
): string {
  const opts = {
    required: true,
    trim: true,
    ...options,
  };

  // Check required
  if (value === undefined || value === null || value === "") {
    if (opts.required) {
      throwAppError(ValidationError.required(fieldName));
    }
    return "";
  }

  // Check type
  if (typeof value !== "string") {
    throwAppError(
      ValidationError.invalid(fieldName, "must be a text value")
    );
  }

  // Trim if requested
  let result = opts.trim ? value.trim() : value;

  // Check after trim if required
  if (result === "" && opts.required) {
    throwAppError(ValidationError.required(fieldName));
  }

  // Check length
  if (opts.minLength !== undefined && result.length < opts.minLength) {
    throwAppError(
      ValidationError.tooShort(fieldName, opts.minLength, result.length)
    );
  }

  if (opts.maxLength !== undefined && result.length > opts.maxLength) {
    throwAppError(
      ValidationError.tooLong(fieldName, opts.maxLength, result.length)
    );
  }

  return result;
}

/**
 * Validate and sanitize number input
 */
export function validateNumber(
  value: any,
  fieldName: string,
  options?: {
    min?: number;
    max?: number;
    integer?: boolean;
    required?: boolean;
  }
): number {
  const opts = {
    required: true,
    integer: false,
    ...options,
  };

  // Check required
  if (value === undefined || value === null) {
    if (opts.required) {
      throwAppError(ValidationError.required(fieldName));
    }
    return 0;
  }

  // Check type and parse
  const num = typeof value === "number" ? value : Number(value);

  if (isNaN(num) || !isFinite(num)) {
    throwAppError(
      ValidationError.invalid(fieldName, "must be a valid number")
    );
  }

  // Check integer
  if (opts.integer && !Number.isInteger(num)) {
    throwAppError(
      ValidationError.invalid(fieldName, "must be a whole number")
    );
  }

  // Check range
  if (opts.min !== undefined && num < opts.min) {
    throwAppError(
      ValidationError.range(fieldName, opts.min, opts.max ?? Infinity, num)
    );
  }

  if (opts.max !== undefined && num > opts.max) {
    throwAppError(
      ValidationError.range(fieldName, opts.min ?? -Infinity, opts.max, num)
    );
  }

  return num;
}

/**
 * Validate email format
 */
export function validateEmail(email: string, fieldName: string = "email"): string {
  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedEmail) {
    throwAppError(ValidationError.required(fieldName));
  }

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmedEmail)) {
    throwAppError(
      ValidationError.invalid(fieldName, "must be a valid email address")
    );
  }

  return trimmedEmail;
}

/**
 * Validate time range
 */
export function validateTimeRange(
  startedAt: number,
  stoppedAt: number,
  fieldName: string = "time range"
): void {
  if (stoppedAt <= startedAt) {
    throwAppError(
      ValidationError.invalid(fieldName, "end time must be after start time")
    );
  }

  // Check for unreasonably long durations (more than 7 days)
  const MAX_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
  if (stoppedAt - startedAt > MAX_DURATION_MS) {
    throwAppError(
      ValidationError.invalid(
        fieldName,
        "duration cannot exceed 7 days"
      )
    );
  }

  // Check for future times (with 5-minute grace period for clock skew)
  const now = Date.now();
  const GRACE_PERIOD_MS = 5 * 60 * 1000;
  if (stoppedAt > now + GRACE_PERIOD_MS) {
    throwAppError(
      ValidationError.invalid(fieldName, "cannot be in the future")
    );
  }
}

/**
 * Validate hex color format
 */
export function validateColor(color: string, fieldName: string = "color"): string {
  const trimmedColor = color.trim();

  if (!/^#[0-9A-Fa-f]{6}$/.test(trimmedColor)) {
    throwAppError(
      ValidationError.invalid(
        fieldName,
        "must be a valid hex color (e.g., #8b5cf6)"
      )
    );
  }

  return trimmedColor;
}
