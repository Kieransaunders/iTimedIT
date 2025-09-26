# Git Worktrees for Parallel Claude Sessions

This repository is set up with git worktrees to enable multiple Claude sessions to work in parallel on different features/branches.

## Current Worktree Setup

```
Main Directory (Main branch):
/Users/MrZang/Library/CloudStorage/GoogleDrive-kieran@iconnectit.co.uk/My Drive/Development backup Gdrive/freelancer_time_tracker_app

Parallel Worktrees:
├── freelancer_time_tracker_app-ui (feature/ui-improvements)
├── freelancer_time_tracker_app-backend (feature/backend-api)  
└── freelancer_time_tracker_app-hotfix (hotfix/bug-fixes)
```

## Usage Instructions

### Starting Claude Sessions in Different Worktrees

1. **Main Development** (current directory):
   ```bash
   cd "/Users/MrZang/Library/CloudStorage/GoogleDrive-kieran@iconnectit.co.uk/My Drive/Development backup Gdrive/freelancer_time_tracker_app"
   # Work on main branch features
   ```

2. **UI Improvements**:
   ```bash
   cd "/Users/MrZang/Library/CloudStorage/GoogleDrive-kieran@iconnectit.co.uk/My Drive/Development backup Gdrive/freelancer_time_tracker_app-ui"
   # Focus on UI/UX improvements, component updates
   ```

3. **Backend API Development**:
   ```bash
   cd "/Users/MrZang/Library/CloudStorage/GoogleDrive-kieran@iconnectit.co.uk/My Drive/Development backup Gdrive/freelancer_time_tracker_app-backend"
   # Work on Convex functions, database schema, API endpoints
   ```

4. **Hotfixes**:
   ```bash
   cd "/Users/MrZang/Library/CloudStorage/GoogleDrive-kieran@iconnectit.co.uk/My Drive/Development backup Gdrive/freelancer_time_tracker_app-hotfix"
   # Quick bug fixes and patches
   ```

### Development Workflow

Each worktree operates independently:
- Has its own working directory and staging area
- Can run `npm run dev`, `npm run build`, etc. separately
- Can have different Convex dev environments
- Changes in one worktree don't affect others

### Merging Changes Back

1. **Commit changes in the feature worktree**:
   ```bash
   cd path/to/worktree
   git add .
   git commit -m "feature: description"
   git push -u origin feature-branch
   ```

2. **Switch to main worktree and merge**:
   ```bash
   cd "/Users/MrZang/Library/CloudStorage/GoogleDrive-kieran@iconnectit.co.uk/My Drive/Development backup Gdrive/freelancer_time_tracker_app"
   git checkout Main
   git pull
   git merge feature/ui-improvements
   ```

3. **Or create pull requests** for code review.

### Managing Worktrees

#### List all worktrees:
```bash
git worktree list
```

#### Create new worktree:
```bash
git worktree add -b feature/new-feature ../app-new-feature Main
```

#### Remove worktree:
```bash
git worktree remove ../app-feature-name
git branch -d feature/feature-name  # Delete the branch if no longer needed
```

#### Prune stale worktrees:
```bash
git worktree prune
```

## Benefits for Claude Development

1. **Parallel Development**: Multiple Claude sessions can work simultaneously
2. **Context Isolation**: Each session has its own file context and changes
3. **Branch Isolation**: Features don't interfere with each other
4. **Independent Testing**: Run different dev servers, tests, builds in parallel
5. **Convex Environment Flexibility**: Each can connect to different Convex backends

## Important Notes

- Each worktree shares the same git history but has independent working directories
- Commits from any worktree are visible in all worktrees after fetching
- Be mindful of Convex environment variables - each worktree can point to different backends
- Package dependencies are independent - run `npm install` in each worktree
- Build outputs are separate - each worktree generates its own `dist/` folder

## Example Parallel Session Scenarios

1. **Session 1** (Main): Working on core timer functionality
2. **Session 2** (UI worktree): Redesigning the dashboard layout  
3. **Session 3** (Backend worktree): Adding new Convex functions for reporting
4. **Session 4** (Hotfix worktree): Fixing a critical bug in production

Each session can develop, test, and deploy independently without conflicts.