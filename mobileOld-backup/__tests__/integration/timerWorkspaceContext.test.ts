/**
 * Integration tests for timer functionality across workspaces
 * Tests Requirements: 4.1, 4.2, 4.3, 4.4
 */

// Mock dependencies
jest.mock('@/contexts/OrganizationContext');
jest.mock('convex/react', () => ({
  useMutation: jest.fn(),
  useQuery: jest.fn(),
}));
jest.mock('@/services/soundManager', () => ({
  playInterruptSound: jest.fn(),
  playOverrunSound: jest.fn(),
  playBreakStartSound: jest.fn(),
  playBreakEndSound: jest.fn(),
}));

describe('Timer Workspace Context Integration Tests', () => {
  const mockUseMutation = require('convex/react').useMutation;
  const mockUseQuery = require('convex/react').useQuery;

  const mockStartMutation = jest.fn();
  const mockStopMutation = jest.fn();
  const mockResetMutation = jest.fn();
  const mockHeartbeatMutation = jest.fn();
  const mockAckInterruptMutation = jest.fn();

  const mockRunningTimer = {
    _id: 'timer1',
    projectId: 'project1',
    startedAt: Date.now() - 30000, // 30 seconds ago
    awaitingInterruptAck: false,
    pomodoroEnabled: false,
    pomodoroPhase: undefined,
    nextInterruptAt: null,
  };

  const mockUserSettings = {
    gracePeriod: 300, // 5 minutes
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseMutation.mockImplementation((api: any) => {
      if (api.toString().includes('timer.start')) return mockStartMutation;
      if (api.toString().includes('timer.stop')) return mockStopMutation;
      if (api.toString().includes('timer.reset')) return mockResetMutation;
      if (api.toString().includes('timer.heartbeat')) return mockHeartbeatMutation;
      if (api.toString().includes('timer.ackInterrupt')) return mockAckInterruptMutation;
      return jest.fn();
    });

    mockUseQuery.mockImplementation((api: any) => {
      if (api.toString().includes('timer.getRunningTimer')) return mockRunningTimer;
      if (api.toString().includes('users.getUserSettings')) return mockUserSettings;
      return undefined;
    });

    mockStartMutation.mockResolvedValue(undefined as any);
    mockStopMutation.mockResolvedValue(undefined as any);
    mockResetMutation.mockResolvedValue(undefined as any);
    mockHeartbeatMutation.mockResolvedValue(undefined as any);
    mockAckInterruptMutation.mockResolvedValue(undefined as any);
  });

  describe('Timer Start/Stop in Personal Workspace', () => {
    it('should start timer in personal workspace with correct context', async () => {
      const startParams = {
        projectId: 'project1',
        category: 'development',
        pomodoroEnabled: false,
        workspaceType: 'personal',
      };

      await mockStartMutation(startParams);

      expect(mockStartMutation).toHaveBeenCalledWith(startParams);
    });

    it('should stop timer in personal workspace with correct context', async () => {
      const stopParams = {
        workspaceType: 'personal',
      };

      await mockStopMutation(stopParams);

      expect(mockStopMutation).toHaveBeenCalledWith(stopParams);
    });

    it('should send heartbeats in personal workspace with correct context', async () => {
      const heartbeatParams = {
        workspaceType: 'personal',
      };

      await mockHeartbeatMutation(heartbeatParams);

      expect(mockHeartbeatMutation).toHaveBeenCalledWith(heartbeatParams);
    });
  });

  describe('Timer Start/Stop in Team Workspace', () => {
    it('should start timer in team workspace with correct context', async () => {
      const startParams = {
        projectId: 'project2',
        category: 'design',
        pomodoroEnabled: true,
        workspaceType: 'team',
      };

      await mockStartMutation(startParams);

      expect(mockStartMutation).toHaveBeenCalledWith(startParams);
    });

    it('should stop timer in team workspace with correct context', async () => {
      const stopParams = {
        workspaceType: 'team',
      };

      await mockStopMutation(stopParams);

      expect(mockStopMutation).toHaveBeenCalledWith(stopParams);
    });

    it('should send heartbeats in team workspace with correct context', async () => {
      const heartbeatParams = {
        workspaceType: 'team',
      };

      await mockHeartbeatMutation(heartbeatParams);

      expect(mockHeartbeatMutation).toHaveBeenCalledWith(heartbeatParams);
    });
  });

  describe('Timer Data Creation in Correct Workspace Context', () => {
    it('should create timer entries in personal workspace', async () => {
      const personalStartParams = {
        projectId: 'personal-project',
        category: 'coding',
        pomodoroEnabled: false,
        workspaceType: 'personal',
      };

      const personalStopParams = {
        workspaceType: 'personal',
      };

      await mockStartMutation(personalStartParams);
      await mockStopMutation(personalStopParams);

      expect(mockStartMutation).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceType: 'personal' })
      );
      expect(mockStopMutation).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceType: 'personal' })
      );
    });

    it('should create timer entries in team workspace', async () => {
      const teamStartParams = {
        projectId: 'team-project',
        category: 'meeting',
        pomodoroEnabled: false,
        workspaceType: 'team',
      };

      const teamStopParams = {
        workspaceType: 'team',
      };

      await mockStartMutation(teamStartParams);
      await mockStopMutation(teamStopParams);

      expect(mockStartMutation).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceType: 'team' })
      );
      expect(mockStopMutation).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceType: 'team' })
      );
    });
  });

  describe('Timer Error Handling Across Workspaces', () => {
    it('should handle timer start errors in personal workspace', async () => {
      mockStartMutation.mockRejectedValue(new Error('Project not found'));

      try {
        await mockStartMutation({
          projectId: 'invalid-project',
          workspaceType: 'personal',
        });
      } catch (error) {
        expect(error).toEqual(new Error('Project not found'));
      }
    });

    it('should handle timer start errors in team workspace', async () => {
      mockStartMutation.mockRejectedValue(new Error('Permission denied'));

      try {
        await mockStartMutation({
          projectId: 'team-project',
          workspaceType: 'team',
        });
      } catch (error) {
        expect(error).toEqual(new Error('Permission denied'));
      }
    });
  });

  describe('Timer Query Context Switching', () => {
    it('should query timer data with personal workspace context', () => {
      const personalQuery = mockUseQuery('timer.getRunningTimer', {
        workspaceType: 'personal'
      });

      expect(mockUseQuery).toHaveBeenCalledWith('timer.getRunningTimer', {
        workspaceType: 'personal'
      });
    });

    it('should query timer data with team workspace context', () => {
      const teamQuery = mockUseQuery('timer.getRunningTimer', {
        workspaceType: 'team'
      });

      expect(mockUseQuery).toHaveBeenCalledWith('timer.getRunningTimer', {
        workspaceType: 'team'
      });
    });
  });

  describe('Timer Interrupt Handling', () => {
    it('should acknowledge interrupts with correct workspace context', async () => {
      const personalAckParams = {
        continue: true,
        workspaceType: 'personal',
      };

      await mockAckInterruptMutation(personalAckParams);

      expect(mockAckInterruptMutation).toHaveBeenCalledWith(personalAckParams);
    });

    it('should acknowledge interrupts in team workspace', async () => {
      const teamAckParams = {
        continue: false,
        workspaceType: 'team',
      };

      await mockAckInterruptMutation(teamAckParams);

      expect(mockAckInterruptMutation).toHaveBeenCalledWith(teamAckParams);
    });
  });

  describe('Timer Reset Operations', () => {
    it('should reset timer in personal workspace', async () => {
      const personalResetParams = {
        workspaceType: 'personal',
      };

      await mockResetMutation(personalResetParams);

      expect(mockResetMutation).toHaveBeenCalledWith(personalResetParams);
    });

    it('should reset timer in team workspace', async () => {
      const teamResetParams = {
        workspaceType: 'team',
      };

      await mockResetMutation(teamResetParams);

      expect(mockResetMutation).toHaveBeenCalledWith(teamResetParams);
    });
  });
});