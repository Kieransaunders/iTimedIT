# Requirements Document

## Introduction

The mobile app currently has broken workspace functionality where personal projects are not showing and the timer is not working. The app shares the same Convex backend as the web app via a symlink, but the mobile hooks are hardcoded to use "personal" workspace type and don't properly handle organization context switching. The mobile app needs to implement proper workspace context management that matches the web app's behavior, allowing users to switch between personal and team workspaces seamlessly.

## Requirements

### Requirement 1

**User Story:** As a mobile app user, I want the app to properly detect and use my current organization context, so that I can access the correct workspace data.

#### Acceptance Criteria

1. WHEN the mobile app starts THEN the system SHALL determine the user's current organization context using the same logic as the web app
2. WHEN a user has multiple organization memberships THEN the system SHALL use their selected organization from user settings
3. WHEN a user has no organization membership THEN the system SHALL automatically create a "Personal Workspace" organization
4. WHEN organization context is established THEN the system SHALL make this context available to all hooks and components

### Requirement 2

**User Story:** As a mobile app user, I want to see my personal projects when in personal workspace mode, so that I can track time on my personal work.

#### Acceptance Criteria

1. WHEN the user is in personal workspace mode THEN the system SHALL fetch projects using the personalProjects API endpoints
2. WHEN the user is in personal workspace mode THEN the system SHALL display only personal projects in project lists
3. WHEN personal projects are loaded THEN the system SHALL show project details including client information and budget stats
4. WHEN no personal projects exist THEN the system SHALL display an appropriate empty state

### Requirement 3

**User Story:** As a mobile app user, I want to see my team projects when in team workspace mode, so that I can track time on organizational work.

#### Acceptance Criteria

1. WHEN the user is in team workspace mode THEN the system SHALL fetch projects using the organization-based projects API endpoints
2. WHEN the user is in team workspace mode THEN the system SHALL display only team projects for the current organization
3. WHEN team projects are loaded THEN the system SHALL show project details including client information and budget stats
4. WHEN no team projects exist THEN the system SHALL display an appropriate empty state

### Requirement 4

**User Story:** As a mobile app user, I want the timer to work correctly with my current workspace context, so that time entries are created in the right workspace.

#### Acceptance Criteria

1. WHEN starting a timer THEN the system SHALL use the current workspace context to determine the correct API endpoint
2. WHEN the timer is running THEN the system SHALL send heartbeats using the correct workspace context
3. WHEN stopping a timer THEN the system SHALL create time entries in the correct workspace (personal or team)
4. WHEN timer operations fail due to workspace context issues THEN the system SHALL display clear error messages

### Requirement 5

**User Story:** As a mobile app user, I want to see all my organization memberships and easily switch between them, so that I can work with different organizations and workspaces.

#### Acceptance Criteria

1. WHEN the user accesses workspace settings THEN the system SHALL display all their active organization memberships
2. WHEN displaying organization memberships THEN the system SHALL show which organization is currently active with a clear indicator
3. WHEN the user selects a different organization THEN the system SHALL switch the active workspace context and update the user's settings
4. WHEN switching organizations THEN the system SHALL show both personal and team workspace options for the selected organization
5. WHEN no organizations exist THEN the system SHALL automatically create a "Personal Workspace" organization

### Requirement 6

**User Story:** As a mobile app user, I want the app to handle workspace switching seamlessly, so that I can work with different organizations without app restarts.

#### Acceptance Criteria

1. WHEN the user's organization context changes THEN the system SHALL automatically refresh all workspace-dependent data
2. WHEN switching between personal and team workspaces THEN the system SHALL clear cached data and reload appropriate content
3. WHEN workspace context is unavailable THEN the system SHALL gracefully handle the error state
4. WHEN workspace switching occurs THEN the system SHALL maintain user session and authentication state

### Requirement 7

**User Story:** As a mobile app user, I want the app to focus on timer functionality while guiding me to the web app for management tasks, so that I have a streamlined mobile experience.

#### Acceptance Criteria

1. WHEN no projects exist in the current workspace THEN the system SHALL display helpful text explaining how to create projects via the web app
2. WHEN displaying empty states THEN the system SHALL provide clear buttons or links to open the web app for project/client management
3. WHEN the user needs to perform management tasks THEN the system SHALL show contextual messages directing them to use the web app
4. WHEN displaying project lists THEN the system SHALL focus on timer-relevant information and de-emphasize management actions
5. WHEN the user attempts management actions THEN the system SHALL provide helpful guidance about using the web app for these tasks

### Requirement 8

**User Story:** As a mobile app user, I want proper error handling when workspace operations fail, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN workspace context cannot be determined THEN the system SHALL display a clear error message with suggested actions
2. WHEN API calls fail due to workspace permissions THEN the system SHALL show appropriate permission error messages
3. WHEN network issues prevent workspace data loading THEN the system SHALL show retry options
4. WHEN workspace data is stale or inconsistent THEN the system SHALL attempt to refresh and notify the user if refresh fails