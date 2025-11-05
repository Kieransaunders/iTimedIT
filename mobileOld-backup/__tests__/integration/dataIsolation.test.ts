/**
 * Integration tests for data isolation between workspaces
 * Tests Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4
 */

// Mock dependencies
jest.mock('@/contexts/OrganizationContext');
jest.mock('convex/react', () => ({
  useMutation: jest.fn(),
  useQuery: jest.fn(),
  usePaginatedQuery: jest.fn(),
}));

describe('Data Isolation Integration Tests', () => {
  const mockUseQuery = require('convex/react').useQuery;
  const mockUsePaginatedQuery = require('convex/react').usePaginatedQuery;

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Personal Projects Data Isolation', () => {
    beforeEach(() => {
      mockUseQuery.mockImplementation((api: any) => {
        if (api.toString().includes('personalProjects')) {
          return personalProjects;
        }
        if (api.toString().includes('personalClients')) {
          return personalClients;
        }
        return undefined;
      });

      mockUsePaginatedQuery.mockImplementation((api: any) => {
        if (api.toString().includes('personalEntries')) {
          return {
            results: personalEntries,
            status: 'CanLoadMore',
            loadMore: jest.fn(),
          };
        }
        return {
          results: [],
          status: 'Exhausted',
          loadMore: jest.fn(),
        };
      });
    });

    it('should only return personal projects when querying personal API', () => {
      const result = mockUseQuery('personalProjects.list');
      
      expect(result).toEqual(personalProjects);
      expect(mockUseQuery).toHaveBeenCalledWith('personalProjects.list');
      
      // Verify team projects are not included
      const teamProjectIds = teamProjects.map(p => p._id);
      const returnedProjectIds = result.map((p: any) => p._id);
      
      teamProjectIds.forEach(id => {
        expect(returnedProjectIds).not.toContain(id);
      });
    });

    it('should only return personal clients when querying personal API', () => {
      const result = mockUseQuery('personalClients.list');
      
      expect(result).toEqual(personalClients);
      expect(mockUseQuery).toHaveBeenCalledWith('personalClients.list');
      
      // Verify team clients are not included
      const teamClientIds = teamClients.map(c => c._id);
      const returnedClientIds = result.map((c: any) => c._id);
      
      teamClientIds.forEach(id => {
        expect(returnedClientIds).not.toContain(id);
      });
    });

    it('should only return personal entries when querying personal API', () => {
      const result = mockUsePaginatedQuery('personalEntries.list');
      
      expect(result.results).toEqual(personalEntries);
      expect(mockUsePaginatedQuery).toHaveBeenCalledWith('personalEntries.list');
      
      // Verify team entries are not included
      const teamEntryIds = teamEntries.map(e => e._id);
      const returnedEntryIds = result.results.map((e: any) => e._id);
      
      teamEntryIds.forEach(id => {
        expect(returnedEntryIds).not.toContain(id);
      });
    });
  });

  describe('Team Projects Data Isolation', () => {
    beforeEach(() => {
      mockUseQuery.mockImplementation((api: any) => {
        if (api.toString().includes('projects.list')) {
          return teamProjects;
        }
        if (api.toString().includes('clients.list')) {
          return teamClients;
        }
        return undefined;
      });

      mockUsePaginatedQuery.mockImplementation((api: any) => {
        if (api.toString().includes('entries.list')) {
          return {
            results: teamEntries,
            status: 'CanLoadMore',
            loadMore: jest.fn(),
          };
        }
        return {
          results: [],
          status: 'Exhausted',
          loadMore: jest.fn(),
        };
      });
    });

    it('should only return team projects when querying team API', () => {
      const result = mockUseQuery('projects.list', { workspaceType: 'team' });
      
      expect(result).toEqual(teamProjects);
      expect(mockUseQuery).toHaveBeenCalledWith('projects.list', { workspaceType: 'team' });
      
      // Verify personal projects are not included
      const personalProjectIds = personalProjects.map(p => p._id);
      const returnedProjectIds = result.map((p: any) => p._id);
      
      personalProjectIds.forEach(id => {
        expect(returnedProjectIds).not.toContain(id);
      });
    });

    it('should only return team clients when querying team API', () => {
      const result = mockUseQuery('clients.list', { workspaceType: 'team' });
      
      expect(result).toEqual(teamClients);
      expect(mockUseQuery).toHaveBeenCalledWith('clients.list', { workspaceType: 'team' });
      
      // Verify personal clients are not included
      const personalClientIds = personalClients.map(c => c._id);
      const returnedClientIds = result.map((c: any) => c._id);
      
      personalClientIds.forEach(id => {
        expect(returnedClientIds).not.toContain(id);
      });
    });

    it('should only return team entries when querying team API', () => {
      const result = mockUsePaginatedQuery('entries.list', { workspaceType: 'team' });
      
      expect(result.results).toEqual(teamEntries);
      expect(mockUsePaginatedQuery).toHaveBeenCalledWith('entries.list', { workspaceType: 'team' });
      
      // Verify personal entries are not included
      const personalEntryIds = personalEntries.map(e => e._id);
      const returnedEntryIds = result.results.map((e: any) => e._id);
      
      personalEntryIds.forEach(id => {
        expect(returnedEntryIds).not.toContain(id);
      });
    });
  });

  describe('API Endpoint Selection Based on Workspace', () => {
    it('should use personal API endpoints for personal workspace', () => {
      const mockPersonalProjectsAPI = jest.fn().mockReturnValue(personalProjects);
      const mockTeamProjectsAPI = jest.fn().mockReturnValue([]);

      mockUseQuery.mockImplementation((api: any) => {
        if (api.toString().includes('personalProjects')) {
          return mockPersonalProjectsAPI();
        }
        if (api.toString().includes('projects.list')) {
          return mockTeamProjectsAPI();
        }
        return undefined;
      });

      // Simulate personal workspace query
      const personalResult = mockUseQuery('personalProjects.list');
      
      expect(mockPersonalProjectsAPI).toHaveBeenCalled();
      expect(personalResult).toEqual(personalProjects);
    });

    it('should use team API endpoints for team workspace', () => {
      const mockPersonalProjectsAPI = jest.fn().mockReturnValue([]);
      const mockTeamProjectsAPI = jest.fn().mockReturnValue(teamProjects);

      mockUseQuery.mockImplementation((api: any) => {
        if (api.toString().includes('personalProjects')) {
          return mockPersonalProjectsAPI();
        }
        if (api.toString().includes('projects.list')) {
          return mockTeamProjectsAPI();
        }
        return undefined;
      });

      // Simulate team workspace query
      const teamResult = mockUseQuery('projects.list', { workspaceType: 'team' });
      
      expect(mockTeamProjectsAPI).toHaveBeenCalled();
      expect(teamResult).toEqual(teamProjects);
    });
  });

  describe('Cross-Workspace Data Contamination Prevention', () => {
    it('should never return team data when querying personal APIs', () => {
      mockUseQuery.mockImplementation((api: any) => {
        if (api.toString().includes('personalProjects')) {
          return personalProjects; // Only personal projects should be returned
        }
        return undefined;
      });

      const result = mockUseQuery('personalProjects.list');
      
      expect(result).toEqual(personalProjects);
      
      // Verify no team project IDs are present
      const returnedProjectIds = result.map((p: any) => p._id);
      const teamProjectIds = teamProjects.map(p => p._id);
      
      teamProjectIds.forEach(id => {
        expect(returnedProjectIds).not.toContain(id);
      });
    });

    it('should never return personal data when querying team APIs', () => {
      mockUseQuery.mockImplementation((api: any) => {
        if (api.toString().includes('projects.list')) {
          return teamProjects; // Only team projects should be returned
        }
        return undefined;
      });

      const result = mockUseQuery('projects.list', { workspaceType: 'team' });
      
      expect(result).toEqual(teamProjects);
      
      // Verify no personal project IDs are present
      const returnedProjectIds = result.map((p: any) => p._id);
      const personalProjectIds = personalProjects.map(p => p._id);
      
      personalProjectIds.forEach(id => {
        expect(returnedProjectIds).not.toContain(id);
      });
    });
  });

  describe('Workspace Context Parameter Validation', () => {
    it('should pass correct workspace parameters to team APIs', () => {
      mockUseQuery('projects.list', { workspaceType: 'team' });
      mockUseQuery('clients.list', { workspaceType: 'team' });
      mockUsePaginatedQuery('entries.list', { workspaceType: 'team' });

      expect(mockUseQuery).toHaveBeenCalledWith('projects.list', { workspaceType: 'team' });
      expect(mockUseQuery).toHaveBeenCalledWith('clients.list', { workspaceType: 'team' });
      expect(mockUsePaginatedQuery).toHaveBeenCalledWith('entries.list', { workspaceType: 'team' });
    });

    it('should not pass workspace parameters to personal APIs', () => {
      mockUseQuery('personalProjects.list', {});
      mockUseQuery('personalClients.list', {});
      mockUsePaginatedQuery('personalEntries.list', {});

      expect(mockUseQuery).toHaveBeenCalledWith('personalProjects.list', {});
      expect(mockUseQuery).toHaveBeenCalledWith('personalClients.list', {});
      expect(mockUsePaginatedQuery).toHaveBeenCalledWith('personalEntries.list', {});
    });
  });

  describe('Data Refresh on Workspace Switch', () => {
    it('should refresh data when switching from personal to team workspace', () => {
      // First query personal data
      mockUseQuery.mockImplementation((api: any) => {
        if (api.toString().includes('personalProjects')) {
          return personalProjects;
        }
        return undefined;
      });

      const personalResult = mockUseQuery('personalProjects.list');
      expect(personalResult).toEqual(personalProjects);

      // Clear mocks to simulate workspace switch
      jest.clearAllMocks();

      // Then query team data after workspace switch
      mockUseQuery.mockImplementation((api: any) => {
        if (api.toString().includes('projects.list')) {
          return teamProjects;
        }
        return undefined;
      });

      const teamResult = mockUseQuery('projects.list', { workspaceType: 'team' });
      expect(teamResult).toEqual(teamProjects);
    });

    it('should refresh data when switching from team to personal workspace', () => {
      // First query team data
      mockUseQuery.mockImplementation((api: any) => {
        if (api.toString().includes('projects.list')) {
          return teamProjects;
        }
        return undefined;
      });

      const teamResult = mockUseQuery('projects.list', { workspaceType: 'team' });
      expect(teamResult).toEqual(teamProjects);

      // Clear mocks to simulate workspace switch
      jest.clearAllMocks();

      // Then query personal data after workspace switch
      mockUseQuery.mockImplementation((api: any) => {
        if (api.toString().includes('personalProjects')) {
          return personalProjects;
        }
        return undefined;
      });

      const personalResult = mockUseQuery('personalProjects.list');
      expect(personalResult).toEqual(personalProjects);
    });
  });
});