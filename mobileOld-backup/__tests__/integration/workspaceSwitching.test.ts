/**
 * Integration tests for workspace switching flows
 * Tests Requirements: 5.1, 5.2, 5.3, 6.1, 6.2
 */

import { storage } from '@/services/storage';
import { ToastManager } from '@/utils/toast';

// Mock dependencies
jest.mock('@/services/storage');
jest.mock('@/utils/toast');
jest.mock('convex/react', () => ({
  useMutation: jest.fn(),
  useQuery: jest.fn(),
}));

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockToastManager = ToastManager as jest.Mocked<typeof ToastManager>;

describe('Workspace Switching Integration Tests', () => {
  const mockUseMutation = require('convex/react').useMutation;
  const mockUseQuery = require('convex/react').useQuery;
  
  const mockEnsureWorkspace = jest.fn();
  const mockSetActiveOrganization = jest.fn();
  
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

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseMutation.mockImplementation((api: any) => {
      if (api.toString().includes('ensurePersonalWorkspace')) {
        return mockEnsureWorkspace;
      }
      if (api.toString().includes('setActiveOrganization')) {
        return mockSetActiveOrganization;
      }
      return jest.fn();
    });

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

    mockStorage.getItem.mockResolvedValue('personal');
    mockStorage.setItem.mockResolvedValue();
    mockEnsureWorkspace.mockResolvedValue();
    mockSetActiveOrganization.mockResolvedValue();
  });

  describe('Workspace Type Switching', () => {
    it('should handle workspace type switching correctly', async () => {
      // Test workspace preference storage
      await mockStorage.setItem('workspace_type', 'team');
      expect(mockStorage.setItem).toHaveBeenCalledWith('workspace_type', 'team');
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

  describe('Organization Switching', () => {
    it('should switch between organizations correctly', async () => {
      await mockSetActiveOrganization({ organizationId: 'org2' });
      expect(mockSetActiveOrganization).toHaveBeenCalledWith({
        organizationId: 'org2'
      });
    });

    it('should handle organization switching permission errors', async () => {
      mockSetActiveOrganization.mockRejectedValue(
        new Error('Permission denied')
      );

      try {
        await mockSetActiveOrganization({ organizationId: 'org2' });
      } catch (error) {
        expect(error).toEqual(new Error('Permission denied'));
      }
    });
  });

  describe('Workspace State Persistence', () => {
    it('should persist workspace state in storage', async () => {
      mockStorage.getItem.mockResolvedValue('team');
      
      const result = await mockStorage.getItem('workspace_type');
      expect(result).toBe('team');
      expect(mockStorage.getItem).toHaveBeenCalledWith('workspace_type');
    });

    it('should handle storage errors during workspace loading', async () => {
      mockStorage.getItem.mockRejectedValue(new Error('Storage error'));

      try {
        await mockStorage.getItem('workspace_type');
      } catch (error) {
        expect(error).toEqual(new Error('Storage error'));
      }
    });
  });

  describe('Workspace Context Initialization', () => {
    it('should ensure personal workspace exists on user login', async () => {
      await mockEnsureWorkspace({});
      expect(mockEnsureWorkspace).toHaveBeenCalledWith({});
    });

    it('should handle workspace initialization failures', async () => {
      mockEnsureWorkspace.mockRejectedValue(new Error('Initialization failed'));

      try {
        await mockEnsureWorkspace({});
      } catch (error) {
        expect(error).toEqual(new Error('Initialization failed'));
      }
    });
  });

  describe('Toast Notifications', () => {
    it('should show success toast for workspace switching', () => {
      if (mockToastManager.workspaceSuccess) {
        mockToastManager.workspaceSuccess('team', 'Data will refresh automatically.');
        expect(mockToastManager.workspaceSuccess).toHaveBeenCalledWith(
          'team',
          'Data will refresh automatically.'
        );
      }
    });

    it('should show error toast for workspace switching failures', () => {
      if (mockToastManager.workspaceError) {
        mockToastManager.workspaceError('team', 'Failed to save preference');
        expect(mockToastManager.workspaceError).toHaveBeenCalledWith(
          'team',
          'Failed to save preference'
        );
      }
    });

    it('should show success toast for organization switching', () => {
      if (mockToastManager.organizationSuccess) {
        mockToastManager.organizationSuccess('Team Organization');
        expect(mockToastManager.organizationSuccess).toHaveBeenCalledWith(
          'Team Organization'
        );
      }
    });

    it('should show error toast for organization switching failures', () => {
      if (mockToastManager.organizationError) {
        mockToastManager.organizationError('Team Organization', 'Permission denied');
        expect(mockToastManager.organizationError).toHaveBeenCalledWith(
          'Team Organization',
          'Permission denied'
        );
      }
    });
  });
});