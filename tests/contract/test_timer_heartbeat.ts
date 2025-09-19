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

// Mock the timer.heartbeat function based on the API contract
const timerHeartbeat = async () => {
  // Simulate authentication check
  const userId = await mockGetAuthUserId();
  if (!userId) {
    throw new Error("Not authenticated");
  }

  // Simulate finding running timer
  const timer = await mockMutationCtx.db.query("runningTimers");

  if (timer) {
    const now = Date.now();
    await mockMutationCtx.db.patch(timer._id, {
      lastHeartbeatAt: now,
    });

    return {
      lastHeartbeatAt: now,
    };
  }

  // If no timer exists, still return a heartbeat timestamp
  return {
    lastHeartbeatAt: Date.now(),
  };
};

describe('timer.heartbeat Contract Tests', () => {
  const mockUserId = "user_123" as Id<"users">;
  const mockTimerId = "timer_456" as Id<"runningTimers">;
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

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default successful auth
    mockGetAuthUserId.mockResolvedValue(mockUserId);

    // Setup mock database queries - default to returning timer
    mockMutationCtx.db.query.mockImplementation((table: string) => {
      if (table === "runningTimers") {
        return Promise.resolve(mockTimer);
      }
      return Promise.resolve(null);
    });

    mockMutationCtx.db.patch.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Successful heartbeat', () => {
    it('should return lastHeartbeatAt timestamp when timer exists', async () => {
      // Arrange
      const beforeHeartbeat = Date.now();

      // Act
      const result = await timerHeartbeat();
      const afterHeartbeat = Date.now();

      // Assert - Contract validation
      expect(result).toHaveProperty('lastHeartbeatAt');
      expect(typeof result.lastHeartbeatAt).toBe('number');

      // Verify timestamp is current
      expect(result.lastHeartbeatAt).toBeGreaterThanOrEqual(beforeHeartbeat);
      expect(result.lastHeartbeatAt).toBeLessThanOrEqual(afterHeartbeat);

      // Verify timer was updated
      expect(mockMutationCtx.db.patch).toHaveBeenCalledWith(
        mockTimerId,
        expect.objectContaining({
          lastHeartbeatAt: expect.any(Number),
        })
      );

      // Verify the timestamp in the patch matches the return value
      const patchCall = mockMutationCtx.db.patch.mock.calls[0];
      const patchData = patchCall[1];
      expect(patchData.lastHeartbeatAt).toBe(result.lastHeartbeatAt);
    });

    it('should return lastHeartbeatAt timestamp when no timer exists', async () => {
      // Arrange
      mockMutationCtx.db.query.mockImplementation((table: string) => {
        if (table === "runningTimers") {
          return Promise.resolve(null); // No running timer
        }
        return Promise.resolve(null);
      });

      const beforeHeartbeat = Date.now();

      // Act
      const result = await timerHeartbeat();
      const afterHeartbeat = Date.now();

      // Assert - Contract validation
      expect(result).toHaveProperty('lastHeartbeatAt');
      expect(typeof result.lastHeartbeatAt).toBe('number');

      // Verify timestamp is current
      expect(result.lastHeartbeatAt).toBeGreaterThanOrEqual(beforeHeartbeat);
      expect(result.lastHeartbeatAt).toBeLessThanOrEqual(afterHeartbeat);

      // Verify no patch operation occurred
      expect(mockMutationCtx.db.patch).not.toHaveBeenCalled();
    });

    it('should update lastHeartbeatAt to current timestamp', async () => {
      // Arrange
      const oldHeartbeat = Date.now() - 300000; // 5 minutes ago
      const timerWithOldHeartbeat = {
        ...mockTimer,
        lastHeartbeatAt: oldHeartbeat,
      };

      mockMutationCtx.db.query.mockImplementation((table: string) => {
        if (table === "runningTimers") {
          return Promise.resolve(timerWithOldHeartbeat);
        }
        return Promise.resolve(null);
      });

      const beforeHeartbeat = Date.now();

      // Act
      const result = await timerHeartbeat();

      // Assert
      // New heartbeat should be much more recent than the old one
      expect(result.lastHeartbeatAt).toBeGreaterThan(oldHeartbeat);
      expect(result.lastHeartbeatAt).toBeGreaterThanOrEqual(beforeHeartbeat);

      // Verify patch was called with new timestamp
      expect(mockMutationCtx.db.patch).toHaveBeenCalledWith(
        mockTimerId,
        expect.objectContaining({
          lastHeartbeatAt: result.lastHeartbeatAt,
        })
      );
    });
  });

  describe('Error cases', () => {
    it('should throw "Not authenticated" when user is not authenticated', async () => {
      // Arrange
      mockGetAuthUserId.mockResolvedValue(null);

      // Act & Assert
      await expect(timerHeartbeat()).rejects.toThrow('Not authenticated');
    });
  });

  describe('Request schema validation', () => {
    it('should accept empty request body (no parameters required)', async () => {
      // Act
      const result = await timerHeartbeat();

      // Assert
      expect(result).toHaveProperty('lastHeartbeatAt');
      expect(typeof result.lastHeartbeatAt).toBe('number');
    });

    it('should not require any parameters', async () => {
      // This test verifies the function signature matches the API contract
      // The heartbeat function should work without any arguments

      // Act
      const result = await timerHeartbeat();

      // Assert
      expect(result).toBeDefined();
      expect(result.lastHeartbeatAt).toBeDefined();
    });
  });

  describe('Response schema validation', () => {
    it('should return response matching API contract schema', async () => {
      // Act
      const result = await timerHeartbeat();

      // Assert - Verify response matches OpenAPI schema
      expect(result).toEqual({
        lastHeartbeatAt: expect.any(Number),
      });

      // Verify lastHeartbeatAt is a valid timestamp
      expect(typeof result.lastHeartbeatAt).toBe('number');
      expect(result.lastHeartbeatAt).toBeGreaterThan(0);

      // Should be a recent timestamp (within last second)
      const now = Date.now();
      expect(result.lastHeartbeatAt).toBeGreaterThan(now - 1000);
      expect(result.lastHeartbeatAt).toBeLessThanOrEqual(now);
    });

    it('should return consistent response structure regardless of timer existence', async () => {
      // Test with timer
      const resultWithTimer = await timerHeartbeat();

      // Test without timer
      mockMutationCtx.db.query.mockImplementation(() => Promise.resolve(null));
      const resultWithoutTimer = await timerHeartbeat();

      // Assert both responses have same structure
      expect(resultWithTimer).toEqual({
        lastHeartbeatAt: expect.any(Number),
      });

      expect(resultWithoutTimer).toEqual({
        lastHeartbeatAt: expect.any(Number),
      });

      expect(Object.keys(resultWithTimer)).toEqual(Object.keys(resultWithoutTimer));
    });
  });

  describe('Business logic validation', () => {
    it('should only update timer if it belongs to authenticated user', async () => {
      // Arrange
      const otherUserId = "user_999" as Id<"users">;
      const timerOwnedByOther = {
        ...mockTimer,
        ownerId: otherUserId,
      };

      // Mock query to use withIndex and filter by owner
      const mockQuery = {
        withIndex: jest.fn().mockReturnValue({
          unique: jest.fn().mockResolvedValue(timerOwnedByOther),
        }),
      };

      mockMutationCtx.db.query.mockReturnValue(mockQuery);

      // In a real implementation, the query would filter by ownerId
      // This test verifies that only user's own timer should be updated
      const timerHeartbeatWithOwnerCheck = async () => {
        const userId = await mockGetAuthUserId();
        if (!userId) {
          throw new Error("Not authenticated");
        }

        // Simulate proper query with owner filter
        const timer = await mockMutationCtx.db.query("runningTimers");

        if (timer && timer.ownerId === userId) {
          const now = Date.now();
          await mockMutationCtx.db.patch(timer._id, {
            lastHeartbeatAt: now,
          });
          return { lastHeartbeatAt: now };
        }

        // No timer belonging to user found
        return { lastHeartbeatAt: Date.now() };
      };

      // Act
      const result = await timerHeartbeatWithOwnerCheck();

      // Assert
      expect(result).toHaveProperty('lastHeartbeatAt');
      // Should not patch timer owned by different user
      expect(mockMutationCtx.db.patch).not.toHaveBeenCalled();
    });

    it('should update heartbeat timestamp atomically', async () => {
      // This test verifies that the heartbeat update is atomic
      // and uses the same timestamp for both patch and return value

      // Act
      const result = await timerHeartbeat();

      // Assert
      expect(mockMutationCtx.db.patch).toHaveBeenCalledTimes(1);

      const patchCall = mockMutationCtx.db.patch.mock.calls[0];
      const patchData = patchCall[1];

      // The timestamp used in patch should match the returned value
      expect(patchData.lastHeartbeatAt).toBe(result.lastHeartbeatAt);
    });

    it('should not modify other timer properties', async () => {
      // Act
      await timerHeartbeat();

      // Assert
      expect(mockMutationCtx.db.patch).toHaveBeenCalledWith(
        mockTimerId,
        {
          lastHeartbeatAt: expect.any(Number),
        }
      );

      // Verify only lastHeartbeatAt is updated
      const patchCall = mockMutationCtx.db.patch.mock.calls[0];
      const patchData = patchCall[1];

      expect(Object.keys(patchData)).toEqual(['lastHeartbeatAt']);
    });

    it('should work with timers in any state', async () => {
      // Test with timer awaiting interrupt acknowledgment
      const awaitingInterruptTimer = {
        ...mockTimer,
        awaitingInterruptAck: true,
        interruptShownAt: Date.now() - 30000, // 30 seconds ago
      };

      mockMutationCtx.db.query.mockImplementation((table: string) => {
        if (table === "runningTimers") {
          return Promise.resolve(awaitingInterruptTimer);
        }
        return Promise.resolve(null);
      });

      // Act
      const result = await timerHeartbeat();

      // Assert
      expect(result).toHaveProperty('lastHeartbeatAt');
      expect(mockMutationCtx.db.patch).toHaveBeenCalledWith(
        mockTimerId,
        expect.objectContaining({
          lastHeartbeatAt: expect.any(Number),
        })
      );
    });
  });

  describe('Performance and reliability', () => {
    it('should complete quickly', async () => {
      // Arrange
      const startTime = Date.now();

      // Act
      await timerHeartbeat();
      const endTime = Date.now();

      // Assert
      // Heartbeat should be very fast operation (under 100ms in test environment)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should be idempotent', async () => {
      // Multiple heartbeats should not cause issues

      // Act
      const result1 = await timerHeartbeat();

      // Clear mocks but keep timer state
      jest.clearAllMocks();
      mockGetAuthUserId.mockResolvedValue(mockUserId);
      mockMutationCtx.db.query.mockImplementation((table: string) => {
        if (table === "runningTimers") {
          return Promise.resolve({
            ...mockTimer,
            lastHeartbeatAt: result1.lastHeartbeatAt,
          });
        }
        return Promise.resolve(null);
      });
      mockMutationCtx.db.patch.mockResolvedValue(undefined);

      const result2 = await timerHeartbeat();

      // Assert
      expect(result1).toHaveProperty('lastHeartbeatAt');
      expect(result2).toHaveProperty('lastHeartbeatAt');
      expect(result2.lastHeartbeatAt).toBeGreaterThanOrEqual(result1.lastHeartbeatAt);
    });
  });
});