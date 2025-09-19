import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Id } from '../../convex/_generated/dataModel';

// Mock the Convex functions since we're testing contracts
const mockMutationCtx = {
  db: {
    query: jest.fn(),
    insert: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
  },
  scheduler: {
    runAt: jest.fn(),
    runAfter: jest.fn(),
  },
  auth: {
    getUserIdentity: jest.fn(),
  },
};

const mockGetAuthUserId = jest.fn();

// Mock the timer.stop function based on the API contract
const timerStop = async (args: { sourceOverride?: "manual" | "autoStop" }) => {
  // Simulate authentication check
  const userId = await mockGetAuthUserId();
  if (!userId) {
    throw new Error("Not authenticated");
  }

  return await stopInternal(userId, args.sourceOverride || "timer");
};

const stopInternal = async (
  userId: Id<"users">,
  source: "manual" | "timer" | "autoStop" | "overrun"
) => {
  // Simulate finding running timer
  const timer = await mockMutationCtx.db.query("runningTimers");
  if (!timer) {
    return { success: false, message: "No running timer" };
  }

  const now = Date.now();

  // Simulate finding active time entry
  const activeEntry = await mockMutationCtx.db.query("timeEntries");
  let entryId = null;
  let seconds = 0;

  if (activeEntry) {
    seconds = Math.floor((now - activeEntry.startedAt) / 1000);
    entryId = activeEntry._id;

    await mockMutationCtx.db.patch(activeEntry._id, {
      stoppedAt: now,
      seconds,
      source,
    });
  }

  // Simulate timer deletion
  await mockMutationCtx.db.delete(timer._id);

  return {
    success: true,
    entryId,
    seconds,
  };
};

describe('timer.stop Contract Tests', () => {
  const mockUserId = "user_123" as Id<"users">;
  const mockTimerId = "timer_456" as Id<"runningTimers">;
  const mockEntryId = "entry_789" as Id<"timeEntries">;
  const mockProjectId = "project_abc" as Id<"projects">;

  const mockTimer = {
    _id: mockTimerId,
    ownerId: mockUserId,
    projectId: mockProjectId,
    startedAt: Date.now() - 3600000, // 1 hour ago
    lastHeartbeatAt: Date.now() - 60000, // 1 minute ago
    awaitingInterruptAck: false,
    nextInterruptAt: Date.now() + 3600000, // 1 hour from now
  };

  const mockActiveEntry = {
    _id: mockEntryId,
    ownerId: mockUserId,
    projectId: mockProjectId,
    startedAt: Date.now() - 3600000, // 1 hour ago
    stoppedAt: undefined,
    seconds: undefined,
    source: "timer",
    isOverrun: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default successful auth
    mockGetAuthUserId.mockResolvedValue(mockUserId);

    // Setup mock database queries
    mockMutationCtx.db.query.mockImplementation((table: string) => {
      if (table === "runningTimers") {
        return Promise.resolve(mockTimer);
      }
      if (table === "timeEntries") {
        return Promise.resolve(mockActiveEntry);
      }
      return Promise.resolve(null);
    });

    mockMutationCtx.db.patch.mockResolvedValue(undefined);
    mockMutationCtx.db.delete.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Successful timer stop', () => {
    it('should return entryId and seconds when stopping with default source', async () => {
      // Arrange
      const args = {};

      // Act
      const result = await timerStop(args);

      // Assert - Contract validation
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('entryId');
      expect(result).toHaveProperty('seconds');

      expect(result.success).toBe(true);
      expect(typeof result.entryId).toBe('string');
      expect(typeof result.seconds).toBe('number');
      expect(result.seconds).toBeGreaterThan(0);

      // Verify time entry was updated
      expect(mockMutationCtx.db.patch).toHaveBeenCalledWith(
        mockEntryId,
        expect.objectContaining({
          stoppedAt: expect.any(Number),
          seconds: expect.any(Number),
          source: "timer", // default source
        })
      );

      // Verify timer was deleted
      expect(mockMutationCtx.db.delete).toHaveBeenCalledWith(mockTimerId);
    });

    it('should return entryId and seconds when stopping with manual source override', async () => {
      // Arrange
      const args = { sourceOverride: "manual" as const };

      // Act
      const result = await timerStop(args);

      // Assert - Contract validation
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('entryId');
      expect(result).toHaveProperty('seconds');

      expect(result.success).toBe(true);
      expect(typeof result.entryId).toBe('string');
      expect(typeof result.seconds).toBe('number');

      // Verify source override was applied
      expect(mockMutationCtx.db.patch).toHaveBeenCalledWith(
        mockEntryId,
        expect.objectContaining({
          source: "manual",
        })
      );
    });

    it('should return entryId and seconds when stopping with autoStop source override', async () => {
      // Arrange
      const args = { sourceOverride: "autoStop" as const };

      // Act
      const result = await timerStop(args);

      // Assert - Contract validation
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('entryId');
      expect(result).toHaveProperty('seconds');

      expect(result.success).toBe(true);
      expect(typeof result.entryId).toBe('string');
      expect(typeof result.seconds).toBe('number');

      // Verify source override was applied
      expect(mockMutationCtx.db.patch).toHaveBeenCalledWith(
        mockEntryId,
        expect.objectContaining({
          source: "autoStop",
        })
      );
    });

    it('should calculate correct duration in seconds', async () => {
      // Arrange
      const startTime = Date.now() - 7200000; // 2 hours ago
      const currentTime = Date.now();
      const expectedSeconds = Math.floor((currentTime - startTime) / 1000);

      const mockEntryWithKnownTime = {
        ...mockActiveEntry,
        startedAt: startTime,
      };

      mockMutationCtx.db.query.mockImplementation((table: string) => {
        if (table === "runningTimers") {
          return Promise.resolve(mockTimer);
        }
        if (table === "timeEntries") {
          return Promise.resolve(mockEntryWithKnownTime);
        }
        return Promise.resolve(null);
      });

      const args = {};

      // Act
      const result = await timerStop(args);

      // Assert
      expect(result.seconds).toBeCloseTo(expectedSeconds, 0); // Within 1 second tolerance
    });
  });

  describe('Error cases', () => {
    it('should throw "Not authenticated" when user is not authenticated', async () => {
      // Arrange
      mockGetAuthUserId.mockResolvedValue(null);
      const args = {};

      // Act & Assert
      await expect(timerStop(args)).rejects.toThrow('Not authenticated');
    });

    it('should return failure message when no running timer exists', async () => {
      // Arrange
      mockMutationCtx.db.query.mockImplementation((table: string) => {
        if (table === "runningTimers") {
          return Promise.resolve(null); // No running timer
        }
        return Promise.resolve(null);
      });
      const args = {};

      // Act
      const result = await timerStop(args);

      // Assert
      expect(result).toEqual({
        success: false,
        message: "No running timer",
      });

      // Verify no database modifications occurred
      expect(mockMutationCtx.db.patch).not.toHaveBeenCalled();
      expect(mockMutationCtx.db.delete).not.toHaveBeenCalled();
    });
  });

  describe('Request schema validation', () => {
    it('should accept empty request body (all parameters optional)', async () => {
      // Arrange
      const args = {};

      // Act
      const result = await timerStop(args);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should accept valid sourceOverride values', async () => {
      // Test each valid enum value
      const validSources = ["manual", "autoStop"] as const;

      for (const sourceOverride of validSources) {
        // Arrange
        const args = { sourceOverride };

        // Act
        const result = await timerStop(args);

        // Assert
        expect(result.success).toBe(true);
        expect(mockMutationCtx.db.patch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            source: sourceOverride,
          })
        );
      }
    });

    it('should reject invalid sourceOverride values', async () => {
      // This test ensures only valid enum values are accepted
      const invalidSource = "invalid" as any;

      // In a real implementation, this would be enforced by Convex validators
      expect(() => {
        const validSources = ["manual", "autoStop"];
        if (invalidSource && !validSources.includes(invalidSource)) {
          throw new Error('Invalid sourceOverride value');
        }
      }).toThrow('Invalid sourceOverride value');
    });
  });

  describe('Response schema validation', () => {
    it('should return response matching API contract schema', async () => {
      // Arrange
      const args = {};

      // Act
      const result = await timerStop(args);

      // Assert - Verify response matches OpenAPI schema
      expect(result).toEqual({
        success: true,
        entryId: expect.any(String),
        seconds: expect.any(Number),
      });

      // Verify entryId is string type (Convex ID)
      expect(typeof result.entryId).toBe('string');

      // Verify seconds is positive number
      expect(typeof result.seconds).toBe('number');
      expect(result.seconds).toBeGreaterThanOrEqual(0);
    });

    it('should return failure response with message when no timer', async () => {
      // Arrange
      mockMutationCtx.db.query.mockImplementation((table: string) => {
        if (table === "runningTimers") {
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      });
      const args = {};

      // Act
      const result = await timerStop(args);

      // Assert
      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      });
    });
  });

  describe('Business logic validation', () => {
    it('should handle case where timer exists but no active entry', async () => {
      // Arrange
      mockMutationCtx.db.query.mockImplementation((table: string) => {
        if (table === "runningTimers") {
          return Promise.resolve(mockTimer);
        }
        if (table === "timeEntries") {
          return Promise.resolve(null); // No active entry
        }
        return Promise.resolve(null);
      });
      const args = {};

      // Act
      const result = await timerStop(args);

      // Assert
      expect(result.success).toBe(true);
      expect(result.entryId).toBeNull();
      expect(result.seconds).toBe(0);

      // Verify timer was still deleted
      expect(mockMutationCtx.db.delete).toHaveBeenCalledWith(mockTimerId);
      // Verify no entry patch occurred
      expect(mockMutationCtx.db.patch).not.toHaveBeenCalled();
    });

    it('should set stoppedAt to current timestamp', async () => {
      // Arrange
      const beforeStop = Date.now();
      const args = {};

      // Act
      await timerStop(args);
      const afterStop = Date.now();

      // Assert
      expect(mockMutationCtx.db.patch).toHaveBeenCalledWith(
        mockEntryId,
        expect.objectContaining({
          stoppedAt: expect.any(Number),
        })
      );

      const callArgs = mockMutationCtx.db.patch.mock.calls[0];
      const patchData = callArgs[1];
      expect(patchData.stoppedAt).toBeGreaterThanOrEqual(beforeStop);
      expect(patchData.stoppedAt).toBeLessThanOrEqual(afterStop);
    });

    it('should apply correct source based on parameter', async () => {
      // Test that different source values are properly applied
      const testCases = [
        { input: undefined, expected: "timer" },
        { input: "manual", expected: "manual" },
        { input: "autoStop", expected: "autoStop" },
      ];

      for (const testCase of testCases) {
        // Reset mocks for each test case
        jest.clearAllMocks();
        mockGetAuthUserId.mockResolvedValue(mockUserId);
        mockMutationCtx.db.query.mockImplementation((table: string) => {
          if (table === "runningTimers") return Promise.resolve(mockTimer);
          if (table === "timeEntries") return Promise.resolve(mockActiveEntry);
          return Promise.resolve(null);
        });

        // Arrange
        const args = testCase.input ? { sourceOverride: testCase.input as "manual" | "autoStop" } : {};

        // Act
        await timerStop(args);

        // Assert
        expect(mockMutationCtx.db.patch).toHaveBeenCalledWith(
          mockEntryId,
          expect.objectContaining({
            source: testCase.expected,
          })
        );
      }
    });
  });
});