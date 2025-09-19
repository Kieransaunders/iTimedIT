// Jest setup file for global test configuration
import { jest } from '@jest/globals';

// Mock Date.now for consistent testing
const mockDateNow = jest.fn(() => 1640995200000); // 2022-01-01 00:00:00 UTC
global.Date.now = mockDateNow;

// Export mock for use in tests
export { mockDateNow };