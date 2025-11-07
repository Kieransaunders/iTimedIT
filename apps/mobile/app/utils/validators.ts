/**
 * Utility functions for input validation
 */

/**
 * Validate email format
 * @param email Email address to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate that a string is not empty
 * @param value String to validate
 * @returns true if not empty, false otherwise
 */
export function isNotEmpty(value: string): boolean {
  return value.trim().length > 0
}

/**
 * Get validation error message for email
 * @param email Email to validate
 * @returns Error message or null if valid
 */
export function getEmailError(email: string): string | null {
  if (!isNotEmpty(email)) {
    return "Email is required"
  }
  if (!isValidEmail(email)) {
    return "Please enter a valid email address"
  }
  return null
}

/**
 * Get validation error message for password
 * @param password Password to validate
 * @returns Error message or null if valid
 */
export function getPasswordError(password: string): string | null {
  if (!isNotEmpty(password)) {
    return "Password is required"
  }
  if (password.length < 6) {
    return "Password must be at least 6 characters"
  }
  return null
}
