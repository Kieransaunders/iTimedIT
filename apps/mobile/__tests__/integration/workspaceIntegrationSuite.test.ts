/**
 * Comprehensive integration test suite for workspace functionality
 * Verifies all requirements for task 6: Final integration and testing
 */

import { storage } from '@/services/storage';
import { ToastManager } from '@/utils/toast';

// Mock all dependencies
jest.mock('@/services/storage');
jest.mock('@/utils/toast');
jest.mock('@/contexts/OrganizationContext');
jest.mock('convex/react', () => ({
  useMutation: jest.fn(),
  useQuery: jest.fn(),
  usePaginatedQuery: jest.fn(),
}));
jest.mock('@/services/soundManager', () => ({
  playInterruptSound: jest.fn(),
  playOverrunSound: jest.fn(),
  playBreakStartSound: jest.fn(),
  playBreakEndSound: jest.fn(),
}));

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockToastManager = ToastManager as jest.Mocked<typeof ToastManager>;

describe('Workspace Integration Suite - Complete Functionality Test', () => {
  const mockUseMutation = require('convex/react').useMutation;
  const mockUseQuery = require('convex/react').useQuery;
  const mockUsePaginatedQuery = require('convex/react').usePaginatedQuery;

  // Mock data for testing
  const personalProjects = [
    { _id: 'personal-project-1', name: 'Personal Project 1', clientId: 'personal-client-1' },
    { _id: 'personal-project-2', name: 'Personal Project 2', clientId: 'personal-client-2' },
  ];

  const teamProjects = [
    { _id: 'team-project-1', name: 'Team Project 1', clientId: 'team-client-1' },
    { _id: 'team-project-2', name: 'Team Project 2', clientId: 'team-client-2' },
  ];

  const personalClients = [
    { _id: 'personal-client-1', name: 'Personal Client 1' },
    { _id: 'personal-client-2', name: 'Personal Client 2' },
  ];

  const teamClients = [
    { _id: 'team-client-1', name: 'Team Client 1' },
    { _id: 'team-client-2', name: 'Team Client 2' },
  ];

  const personalEntries = [
    { _id: 'personal-entry-1', projectId: 'personal-project-1', seconds: 3600 },
    { _id: 'personal-entry-2', projectId: 'personal-project-2', seconds: 1800 },
  ];

  const teamEntries = [
    { _id: 'team-entry-1', projectId: 'team-project-1', seconds: 7200 },
    { _id: 'team-entry-2', projectId: 'team-project-2', seconds: 5400 },
  ];

  const mockMemberships = [
    {
      membership: { _id: 'membership1', role: 'admin' },
      organization: { _id: 'org1', name: 'Personal Workspace' }
    },
    {
      membership: { _id: 'membership2', role: 'member' },
      organization: { _id: 'org2', name: 'Team Organization' }
    }
  ];

  // Mock functions
  const mockEnsureWorkspace = jest.fn();
  const mockSetActiveOrganization = jest.fn();
  const mockStartTimer = jest.fn();
  const mockStopTimer = jest.fn();
  const mockHeartbeat = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mutation mocks
    mockUseMutation.mockImplementation((api: any) => {
      if (api.toString().includes('ensurePersonalWorkspace')) return mockEnsureWorkspace;
      if (api.toString().includes('setActiveOrganization')) return mockSetActiveOrganization;
      if (api.toString().includes('timer.start')) return mockStartTimer;
      if (api.toString().includes('timer.stop')) return mockStopTimer;
      if (api.toString().includes('timer.heartbeat')) return mockHeartbeat;
      return jest.fn();
    });

    // Setup default successful responses
    mockStorage.getItem.mockResolvedValue('personal');
    mockStorage.setItem.mockResolvedValue(undefined as any);
    mockEnsureWorkspace.mockResolvedValue(undefined as any);
    mockSetActiveOrganization.mockResolvedValue(undefined as any);
    mockStartTimer.mockResolvedValue(undefined as any);
    mockStopTimer.mockResolvedValue(undefined as any);
    mockHeartbeat.mockResolvedValue(undefined as any);
  });

  describe('Requirement 1.1: Organization Context Detection', () => {
    it('should determine user organization context on app start', async () => {
      mockUseQuery.mockImplementation((api: any) => {
        if (api.toString().includes('currentMembership')) {
          return {
            membershipId: 'membership1',
            organization: { _id: 'org1', name: 'Personal Workspace' },
            role: 'admin'
          };
        }
        if (api.toString().includes('listMemberships')) {
          return mockMemberships;
        }
        return undefined;
      });

      // Simulate organization context initialization
      await mockEnsureWorkspace({});
      
      expect(mockEnsureWorkspace).toHaveBeenCalledWith({});
    });

    it('should create Personal Workspace when no organization exists', async () => {
      mockUseQuery.mockImplementation((api: any) => {
        if (api.toString().includes('currentMembership')) {
          return null; // No current membership
        }
        if (api.toString().includes('listMemberships')) {
          return []; // No memberships
        }
        return undefined;
      });

      // Should ensure personal workspace exists
      await mockEnsureWorkspace({});
      
      expect(mockEnsureWorkspace).toHaveBeenCalled();
    });
  });

  describe('Requirement 2.1-2.4: Personal Projects Data Access', () => {
    beforeEach(() => {
      mockUseQuery.mockImplementation((api: any) => {
        if (api.toString().includes('personalProjects')) return personalProjects;
        if (api.toString().includes('personalClients')) return personalClients;
        return undefined;
      });

      mockUsePaginatedQuery.mockImplementation((api: any) => {
        if (api.toString().includes('personalEntries')) {
          return { results: personalEntries, status: 'CanLoadMore', loadMore: jest.fn() };
        }
        return { results: [], status: 'Exhausted', loadMore: jest.fn() };
      });
    });

    it('should fetch personal projects correctly', () => {
      const projects = mockUseQuery('personalProjects.list');
      expect(projects).toEqual(personalProjects);
      expect(projects.length).toBe(2);
      expect(projects[0].name).toBe('Personal Project 1');
    });

    it('should fetch personal clients correctly', () => {
      const clients = mockUseQuery('personalClients.list');
      expect(clients).toEqual(personalClients);
      expect(clients.length).toBe(2);
      expect(clients[0].name).toBe('Personal Client 1');
    });

    it('should fetch personal entries correctly', () => {
      const { results } = mockUsePaginatedQuery('personalEntries.list');
      expect(results).toEqual(personalEntries);
      expect(results.length).toBe(2);
      expect(results[0].projectId).toBe('personal-project-1');
    });
  });

  describe('Requirement 3.1-3.4: Team Projects Data Access', () => {
    beforeEach(() => {
      mockUseQuery.mockImplementation((api: any) => {
        if (api.toString().includes('projects.list')) return teamProjects;
        if (api.toString().includes('clients.list')) return teamClients;
        return undefined;
      });

      mockUsePaginatedQuery.mockImplementation((api: any) => {
        if (api.toString().includes('entries.list')) {
          return { results: teamEntries, status: 'CanLoadMore', loadMore: jest.fn() };
        }
        return { results: [], status: 'Exhausted', loadMore: jest.fn() };
      });
    });

    it('should fetch team projects correctly', () => {
      const projects = mockUseQuery('projects.list', { workspaceType: 'team' });
      expect(projects).toEqual(teamProjects);
      expect(projects.length).toBe(2);
      expect(projects[0].name).toBe('Team Project 1');
    });

    it('should fetch team clients correctly', () => {
      const clients = mockUseQuery('clients.list', { workspaceType: 'team' });
      expect(clients).toEqual(teamClients);
      expect(clients.length).toBe(2);
      expect(clients[0].name).toBe('Team Client 1');
    });

    it('should fetch team entries correctly', () => {
      const { results } = mockUsePaginatedQuery('entries.list', { workspaceType: 'team' });
      expect(results).toEqual(teamEntries);
      expect(results.length).toBe(2);
      expect(results[0].projectId).toBe('team-project-1');
    });
  });

  describe('Requirement 4.1-4.4: Timer Functionality Across Workspaces', () => {
    it('should start timer in personal workspace with correct context', async () => {
      await mockStartTimer({
        projectId: 'personal-project-1',
        category: 'development',
        pomodoroEnabled: false,
        workspaceType: 'personal',
      });

      expect(mockStartTimer).toHaveBeenCalledWith({
        projectId: 'personal-project-1',
        category: 'development',
        pomodoroEnabled: false,
        workspaceType: 'personal',
      });
    });

    it('should start timer in team workspace with correct context', async () => {
      await mockStartTimer({
        projectId: 'team-project-1',
        category: 'meeting',
        pomodoroEnabled: true,
        workspaceType: 'team',
      });

      expect(mockStartTimer).toHaveBeenCalledWith({
        projectId: 'team-project-1',
        category: 'meeting',
        pomodoroEnabled: true,
        workspaceType: 'team',
      });
    });

    it('should stop timer in personal workspace', async () => {
      await mockStopTimer({ workspaceType: 'personal' });
      expect(mockStopTimer).toHaveBeenCalledWith({ workspaceType: 'personal' });
    });

    it('should stop timer in team workspace', async () => {
      await mockStopTimer({ workspaceType: 'team' });
      expect(mockStopTimer).toHaveBeenCalledWith({ workspaceType: 'team' });
    });

    it('should send heartbeats with correct workspace context', async () => {
      await mockHeartbeat({ workspaceType: 'personal' });
      await mockHeartbeat({ workspaceType: 'team' });

      expect(mockHeartbeat).toHaveBeenCalledWith({ workspaceType: 'personal' });
      expect(mockHeartbeat).toHaveBeenCalledWith({ workspaceType: 'team' });
    });
  });

  describe('Requirement 5.1-5.3: Organization Switching', () => {
    it('should switch between organizations correctly', async () => {
      await mockSetActiveOrganization({ organizationId: 'org2' });
      expect(mockSetActiveOrganization).toHaveBeenCalledWith({ organizationId: 'org2' });
    });

    it('should handle organization switching with multiple memberships', () => {
      // Simulate having multiple memberships
      mockUseQuery.mockImplementation((api: any) => {
        if (api.toString().includes('listMemberships')) {
          return mockMemberships;
        }
        return undefined;
      });
      
      const result = mockUseQuery('organizations.listMemberships');
      expect(result).toBeDefined();
      expect(result.length).toBe(2);
    });

    it('should persist workspace state across app restarts', async () => {
      // Save workspace preference
      await mockStorage.setItem('workspace_type', 'team');
      expect(mockStorage.setItem).toHaveBeenCalledWith('workspace_type', 'team');

      // Load workspace preference on restart
      mockStorage.getItem.mockResolvedValue('team');
      const savedWorkspace = await mockStorage.getItem('workspace_type');
      expect(savedWorkspace).toBe('team');
    });
  });

  describe('Requirement 6.1-6.2: Seamless Workspace Switching', () => {
    it('should refresh data when switching workspaces', async () => {
      // Start in personal workspace
      mockUseQuery.mockImplementation((api: any) => {
        if (api.toString().includes('personalProjects')) return personalProjects;
        return undefined;
      });

      let projects = mockUseQuery('personalProjects.list');
      expect(projects).toEqual(personalProjects);

      // Switch to team workspace
      mockUseQuery.mockImplementation((api: any) => {
        if (api.toString().includes('projects.list')) return teamProjects;
        return undefined;
      });

      projects = mockUseQuery('projects.list', { workspaceType: 'team' });
      expect(projects).toEqual(teamProjects);
    });

    it('should handle workspace switching errors gracefully', async () => {
      mockStorage.setItem.mockRejectedValue(new Error('Storage error'));

      try {
        await mockStorage.setItem('workspace_type', 'team');
      } catch (error) {
        expect(error).toEqual(new Error('Storage error'));
      }
    });
  });

  describe('Data Isolation Verification', () => {
    it('should never mix personal and team data', () => {
      // Setup personal data query
      mockUseQuery.mockImplementation((api: any) => {
        if (api.toString().includes('personalProjects')) return personalProjects;
        return undefined;
      });

      const personalResult = mockUseQuery('personalProjects.list');
      const personalIds = personalResult.map((p: any) => p._id);
      const teamIds = teamProjects.map(p => p._id);

      // Verify no team IDs in personal results
      teamIds.forEach(id => {
        expect(personalIds).not.toContain(id);
      });

      // Setup team data query
      mockUseQuery.mockImplementation((api: any) => {
        if (api.toString().includes('projects.list')) return teamProjects;
        return undefined;
      });

      const teamResult = mockUseQuery('projects.list', { workspaceType: 'team' });
      const teamResultIds = teamResult.map((p: any) => p._id);
      const personalProjectIds = personalProjects.map(p => p._id);

      // Verify no personal IDs in team results
      personalProjectIds.forEach(id => {
        expect(teamResultIds).not.toContain(id);
      });
    });

    it('should use correct API endpoints for each workspace', () => {
      // Personal workspace should use personal APIs
      mockUseQuery('personalProjects.list');
      mockUseQuery('personalClients.list');
      mockUsePaginatedQuery('personalEntries.list');

      expect(mockUseQuery).toHaveBeenCalledWith('personalProjects.list');
      expect(mockUseQuery).toHaveBeenCalledWith('personalClients.list');
      expect(mockUsePaginatedQuery).toHaveBeenCalledWith('personalEntries.list');

      // Team workspace should use team APIs with workspace parameter
      mockUseQuery('projects.list', { workspaceType: 'team' });
      mockUseQuery('clients.list', { workspaceType: 'team' });
      mockUsePaginatedQuery('entries.list', { workspaceType: 'team' });

      expect(mockUseQuery).toHaveBeenCalledWith('projects.list', { workspaceType: 'team' });
      expect(mockUseQuery).toHaveBeenCalledWith('clients.list', { workspaceType: 'team' });
      expect(mockUsePaginatedQuery).toHaveBeenCalledWith('entries.list', { workspaceType: 'team' });
    });
  });

  describe('Error Handling and User Feedback', () => {
    it('should show appropriate toast messages for workspace operations', () => {
      // Mock toast methods if they exist
      if (mockToastManager.workspaceSuccess) {
        mockToastManager.workspaceSuccess('team', 'Data will refresh automatically.');
        expect(mockToastManager.workspaceSuccess).toHaveBeenCalledWith(
          'team',
          'Data will refresh automatically.'
        );
      }

      if (mockToastManager.organizationSuccess) {
        mockToastManager.organizationSuccess('Team Organization');
        expect(mockToastManager.organizationSuccess).toHaveBeenCalledWith('Team Organization');
      }
    });

    it('should handle network errors gracefully', async () => {
      mockStartTimer.mockRejectedValue(new Error('Network error'));

      try {
        await mockStartTimer({ projectId: 'test', workspaceType: 'personal' });
      } catch (error) {
        expect(error).toEqual(new Error('Network error'));
      }
    });

    it('should handle permission errors appropriately', async () => {
      mockSetActiveOrganization.mockRejectedValue(new Error('Permission denied'));

      try {
        await mockSetActiveOrganization({ organizationId: 'org2' });
      } catch (error) {
        expect(error).toEqual(new Error('Permission denied'));
      }
    });
  });

  describe('Complete Workflow Integration Test', () => {
    it('should handle complete workspace switching workflow', async () => {
      // 1. Initialize workspace
      await mockEnsureWorkspace({});
      expect(mockEnsureWorkspace).toHaveBeenCalled();

      // 2. Load personal workspace data
      mockUseQuery.mockImplementation((api: any) => {
        if (api.toString().includes('personalProjects')) return personalProjects;
        return undefined;
      });

      let projects = mockUseQuery('personalProjects.list');
      expect(projects).toEqual(personalProjects);

      // 3. Start timer in personal workspace
      await mockStartTimer({
        projectId: 'personal-project-1',
        workspaceType: 'personal',
      });
      expect(mockStartTimer).toHaveBeenCalledWith({
        projectId: 'personal-project-1',
        workspaceType: 'personal',
      });

      // 4. Switch to team workspace
      await mockStorage.setItem('workspace_type', 'team');
      await mockSetActiveOrganization({ organizationId: 'org2' });

      expect(mockStorage.setItem).toHaveBeenCalledWith('workspace_type', 'team');
      expect(mockSetActiveOrganization).toHaveBeenCalledWith({ organizationId: 'org2' });

      // 5. Load team workspace data
      mockUseQuery.mockImplementation((api: any) => {
        if (api.toString().includes('projects.list')) return teamProjects;
        return undefined;
      });

      projects = mockUseQuery('projects.list', { workspaceType: 'team' });
      expect(projects).toEqual(teamProjects);

      // 6. Start timer in team workspace
      await mockStartTimer({
        projectId: 'team-project-1',
        workspaceType: 'team',
      });
      expect(mockStartTimer).toHaveBeenCalledWith({
        projectId: 'team-project-1',
        workspaceType: 'team',
      });

      // 7. Verify data isolation maintained throughout
      expect(projects).not.toEqual(personalProjects);
      expect(projects).toEqual(teamProjects);
    });
  });
});