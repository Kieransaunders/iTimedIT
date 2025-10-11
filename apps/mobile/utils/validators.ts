/**
 * Utility functions for input validation
 */

/**
 * Validate email format
 * @param email Email address to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate that end time is after start time
 * @param startTime Start timestamp
 * @param endTime End timestamp
 * @returns true if valid, false otherwise
 */
export function isValidTimeRange(startTime: number, endTime: number): boolean {
  return endTime > startTime;
}

/**
 * Validate that a string is not empty
 * @param value String to validate
 * @returns true if not empty, false otherwise
 */
export function isNotEmpty(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * Validate that a number is positive
 * @param value Number to validate
 * @returns true if positive, false otherwise
 */
export function isPositive(value: number): boolean {
  return value > 0;
}

/**
 * Validate that a number is within a range
 * @param value Number to validate
 * @param min Minimum value (inclusive)
 * @param max Maximum value (inclusive)
 * @returns true if within range, false otherwise
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Get validation error message for email
 * @param email Email to validate
 * @returns Error message or null if valid
 */
export function getEmailError(email: string): string | null {
  if (!isNotEmpty(email)) {
    return "Email is required";
  }
  if (!isValidEmail(email)) {
    return "Please enter a valid email address";
  }
  return null;
}

/**
 * Get validation error message for password
 * @param password Password to validate
 * @returns Error message or null if valid
 */
export function getPasswordError(password: string): string | null {
  if (!isNotEmpty(password)) {
    return "Password is required";
  }
  if (password.length < 6) {
    return "Password must be at least 6 characters";
  }
  return null;
}

/**
 * Get validation error message for time range
 * @param startTime Start timestamp
 * @param endTime End timestamp
 * @returns Error message or null if valid
 */
export function getTimeRangeError(
  startTime: number,
  endTime: number
): string | null {
  if (!isValidTimeRange(startTime, endTime)) {
    return "End time must be after start time";
  }
  return null;
}
