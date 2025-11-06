# FreeAgent Integration Plan for iTimedIT

## Timeline: 4-6 weeks for MVP, 8-13 weeks for full integration

## What FreeAgent Integration Gives You

**Immediate Business Value**:
- Seamless time-to-invoice workflow (the #1 requested feature for freelancers/agencies)
- Eliminates manual timesheet transfers to accounting software
- Positions iTimedIT as a complete business solution, not just a timer
- **Solves the "I love your timer but I still need to use Toggl because it integrates with my accounting" problem**

**Target Market**: UK/EU freelancers and small agencies (FreeAgent's core market - 100,000+ businesses)

---

## Executive Summary

FreeAgent is a UK-based accounting and invoicing platform designed for freelancers, small businesses, and accountancy practices. It provides comprehensive financial management including invoicing, time tracking, expense management, project accounting, and tax calculations.

**Integration Feasibility**: **HIGH** ✅

FreeAgent provides a well-documented RESTful API (v2) that fully supports:
- Time tracking (timeslips)
- Project and task management
- Client/contact management
- Invoice generation from time entries
- OAuth2 authentication with long-lived refresh tokens
- Reasonable rate limits (120 req/min, 3,600 req/hour)

**Key Differentiator**: Unlike competitors, FreeAgent focuses on UK/EU market with built-in tax calculations, VAT handling, and Making Tax Digital compliance.

---

## Phase 1: MVP (4-6 Weeks)

### What You'll Build:

#### 1. OAuth2 Connection to FreeAgent
- Settings page: "Connect FreeAgent" button
- OAuth flow (redirect to FreeAgent → approval → callback → token storage)
- Token refresh logic (access tokens expire every hour)
- Secure token storage with encryption

**Endpoints**:
- Authorization: `https://api.freeagent.com/v2/approve_app`
- Token exchange: `https://api.freeagent.com/v2/token_endpoint`
- Token refresh: Automatic refresh on 401/403 errors

#### 2. One-Way Sync: iTimedIT → FreeAgent
- Completed time entries → FreeAgent timeslips
- Manual "Sync to FreeAgent" button
- Basic error handling and status messages
- Sync status indicator (synced/pending/error)

**API Endpoint**: `POST https://api.freeagent.com/v2/timeslips`

**Payload Structure**:
```json
{
  "timeslip": {
    "user": "https://api.freeagent.com/v2/users/1",
    "project": "https://api.freeagent.com/v2/projects/1",
    "task": "https://api.freeagent.com/v2/tasks/1",
    "dated_on": "2025-11-06",
    "hours": "2.5",
    "comment": "Optional description"
  }
}
```

#### 3. Data Mapping
- Map iTimedIT projects to FreeAgent projects
- Map iTimedIT clients to FreeAgent contacts
- Map iTimedIT categories to FreeAgent tasks
- Auto-create default "General Work" task for entries without categories
- Store mappings in new `freeagentMappings` table

**FreeAgent Data Hierarchy**:
```
Contact (Customer/Client)
  └─ Project
      └─ Task (billable or unbillable)
          └─ Timeslip (time entry)
              └─ Invoice (when billed)
```

#### 4. Settings UI
- Connection status indicator
- Connect/Disconnect buttons
- Last sync timestamp
- View sync errors
- Manual sync button

### Technical Implementation

#### New Convex Tables:

```typescript
// convex/schema.ts

freeagentIntegrations: defineTable({
  organizationId: v.id("organizations"),
  accessToken: v.string(), // Encrypted
  refreshToken: v.string(), // Encrypted
  tokenExpiresAt: v.number(), // Timestamp
  refreshTokenExpiresAt: v.number(), // Timestamp (20 year lifetime)
  freeAgentUserUrl: v.string(), // e.g., "https://api.freeagent.com/v2/users/123"
  companyUrl: v.string(), // e.g., "https://api.freeagent.com/v2/company"
  settings: v.object({
    autoSync: v.boolean(),
    syncInterval: v.number(), // Minutes
    syncDirection: v.string(), // "one-way" or "two-way"
    defaultTaskName: v.string(), // Default task for categories without mapping
  }),
  connectedAt: v.number(),
  lastSyncedAt: v.optional(v.number()),
})
  .index("by_organization", ["organizationId"]),

freeagentMappings: defineTable({
  organizationId: v.id("organizations"),
  entityType: v.string(), // "client", "project", "category"
  iTimedITId: v.id("genericTable"), // Union type: clients, projects, or categories
  freeAgentUrl: v.string(), // e.g., "https://api.freeagent.com/v2/projects/456"
  lastSyncedAt: v.number(),
  syncDirection: v.string(), // "to-freeagent", "from-freeagent", "bidirectional"
})
  .index("by_organization_entity", ["organizationId", "entityType"])
  .index("by_itimedit_id", ["iTimedITId"])
  .index("by_freeagent_url", ["freeAgentUrl"]),

freeagentSyncLogs: defineTable({
  organizationId: v.id("organizations"),
  entityType: v.string(),
  entityId: v.optional(v.string()),
  action: v.string(), // "create", "update", "delete"
  status: v.string(), // "success", "error", "skipped"
  message: v.optional(v.string()),
  timestamp: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_timestamp", ["timestamp"]),
```

#### New Convex Actions (using `"use node";` directive):

```typescript
// convex/freeagent.ts
"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

// OAuth Flow
export const authorize = action({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // Generate OAuth authorization URL
    // Store state parameter for CSRF protection
    // Return URL for client redirect
  },
});

export const handleCallback = action({
  args: { code: v.string(), state: v.string() },
  handler: async (ctx, args) => {
    // Exchange authorization code for access token
    // Store tokens in freeagentIntegrations table
    // Fetch user and company data
  },
});

export const refreshToken = action({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // Fetch current tokens
    // Request new access token using refresh token
    // Update stored tokens
  },
});

// Sync Operations
export const syncTimeEntry = action({
  args: {
    organizationId: v.id("organizations"),
    entryId: v.id("timeEntries"),
  },
  handler: async (ctx, args) => {
    // Get OAuth tokens (refresh if expired)
    // Get time entry data
    // Map to FreeAgent timeslip format
    // POST to FreeAgent API
    // Store FreeAgent URL in time entry
    // Log sync status
  },
});

export const syncBulkEntries = action({
  args: {
    organizationId: v.id("organizations"),
    entryIds: v.array(v.id("timeEntries")),
  },
  handler: async (ctx, args) => {
    // Batch sync with rate limit handling
    // Show progress indicator
    // Retry failed entries
  },
});

// Data Fetching
export const fetchProjects = action({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // Fetch all FreeAgent projects
    // Return for mapping UI
  },
});

export const fetchContacts = action({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // Fetch all FreeAgent contacts (customers)
    // Return for mapping UI
  },
});

// Disconnection
export const disconnect = action({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // Remove integration data
    // Clear mappings
    // Optionally revoke OAuth token
  },
});
```

#### New React Components:

**Web App Components**:
- `FreeAgentSettings.tsx` - Integration settings page (`/settings/integrations/freeagent`)
- `FreeAgentSyncButton.tsx` - Manual sync trigger
- `FreeAgentStatus.tsx` - Connection status indicator
- `FreeAgentMappings.tsx` - Data mapping management UI
- `FreeAgentSyncLogs.tsx` - Sync history viewer

**Mobile App Components**:
- `FreeAgentConnect.tsx` - OAuth flow via `expo-auth-session`
- Mobile settings integration (similar to existing settings pages)

### Key Decisions for MVP:

1. **Sync Direction**: One-way only (iTimedIT → FreeAgent)
   - Simpler to implement
   - Covers 90% of use cases (people want to push time to accounting, not pull)
   - Two-way sync can be added in Phase 2

2. **Sync Trigger**: Manual only
   - User clicks "Sync to FreeAgent" button
   - Avoids polling overhead and rate limit concerns
   - Can add auto-sync in Phase 2

3. **Category Mapping**: Auto-create default task
   - Create "General Work" task per project
   - Users can manually edit task in FreeAgent if needed
   - Avoids complex mapping UI for MVP
   - Can add custom mapping in Phase 2

4. **Duration Conversion**: Seconds to decimal hours
   - iTimedIT stores duration in seconds
   - FreeAgent expects decimal hours (1.5 = 1 hour 30 minutes)
   - Conversion: `hours = seconds / 3600`

---

## Phase 2: Full Integration (Additional 4-7 Weeks)

### What You'll Add:

#### 1. Smart Data Mapping UI
- Dedicated page for mapping clients, projects, categories to FreeAgent entities
- Auto-suggest matches by name/email
- "Create in FreeAgent" button for unmapped items
- Bulk mapping actions
- Mapping status indicators

**Features**:
- Tab navigation: Clients, Projects, Categories
- Table with columns:
  - iTimedIT name
  - FreeAgent name (dropdown/autocomplete)
  - Sync direction
  - Last synced timestamp
  - Actions (edit/remove mapping)
- Auto-map button (by name/email matching)
- Manual create in FreeAgent

#### 2. Running Timer Sync
- Start timer in iTimedIT → Create timeslip + start timer in FreeAgent
- Stop timer in iTimedIT → Stop timer + update hours in FreeAgent
- Real-time sync indicator on timer UI
- Handle timer interrupts and auto-stop

**API Endpoints**:
- Start timer: `POST https://api.freeagent.com/v2/timeslips/:id/timer`
- Stop timer: `DELETE https://api.freeagent.com/v2/timeslips/:id/timer`
- Update hours: `PUT https://api.freeagent.com/v2/timeslips/:id`

**Implementation Flow**:
1. User starts timer in iTimedIT
2. Create timeslip in FreeAgent with 0 hours
3. Start timer in FreeAgent via API
4. Store FreeAgent timeslip URL in iTimedIT running timer
5. When timer stops:
   - Calculate final hours
   - Stop FreeAgent timer
   - Update timeslip with actual hours

#### 3. Bulk Sync
- "Sync last 7 days" / "Sync last 30 days" quick actions
- Custom date range selector
- Progress indicator with current/total counts
- Batching to respect rate limits (120 req/min)
- Retry failed entries with exponential backoff
- Summary report (X synced, Y failed, Z skipped)

**Rate Limit Handling**:
- Batch 10-20 timeslips per request (FreeAgent supports bulk creation)
- Add delay between requests if approaching limit
- Respect `Retry-After` header on 429 responses
- Show estimated time remaining

#### 4. Auto-Sync (Background)
- Convex cron job every 10-15 minutes (configurable)
- Only syncs new/updated entries since `lastSyncedAt`
- Configurable interval in settings (5/10/15/30 minutes)
- Option to enable/disable auto-sync
- Background sync indicator (small badge/icon)

**Cron Implementation**:
```typescript
// convex/crons.ts

export default cronJobs;

cronJobs.interval(
  "sync-freeagent",
  { minutes: 10 }, // Configurable per organization
  api.freeagent.autoSyncAll
);
```

#### 5. Two-Way Sync (Optional)
- Pull FreeAgent timeslips → Update iTimedIT entries
- Detect changes made in FreeAgent after sync
- Conflict resolution UI (what happens if edited in both places?)
- Uses polling with `updated_since` filter (FreeAgent has no webhooks)
- Options: FreeAgent wins, iTimedIT wins, ask user

**Polling Strategy**:
```typescript
// Fetch only changed timeslips
GET https://api.freeagent.com/v2/timeslips?updated_since=2025-11-06T10:00:00Z&user={user_url}
```

**Conflict Resolution**:
- Detect conflicts: `lastSyncedAt` < FreeAgent `updated_at`
- Show diff: iTimedIT value vs. FreeAgent value
- Let user choose: Keep iTimedIT, Keep FreeAgent, Merge
- Option to always prefer one source (in settings)

#### 6. Mobile Support
- OAuth flow via `expo-auth-session` (similar to Google OAuth implementation at `apps/mobile/services/googleAuth.ts`)
- FreeAgent settings page in mobile app
- Sync button and status indicator
- Handle deep linking for OAuth callback
- Shared Convex backend (same actions as web)

**Mobile OAuth Flow**:
```typescript
// apps/mobile/services/freeagentAuth.ts

import * as AuthSession from 'expo-auth-session';

const discovery = {
  authorizationEndpoint: 'https://api.freeagent.com/v2/approve_app',
  tokenEndpoint: 'https://api.freeagent.com/v2/token_endpoint',
};

// Use PKCE flow (similar to existing Google OAuth)
```

---

## Phase 3: Advanced Features (Additional 2-3 Weeks)

### 1. Invoice Preview
- "View unbilled time in FreeAgent" section in project view
- Show which timeslips will be included in next invoice
- Calculate potential invoice amount (hours × billing rate)
- Filter: Only billable tasks, only unbilled timeslips
- Deep link to FreeAgent invoice creation page with pre-selected timeslips

**API Endpoint**: `GET https://api.freeagent.com/v2/timeslips?view=unbilled&project={project_url}`

**Features**:
- Group by project/task/date
- Show billing rate per task
- Total hours and amount
- "Create Invoice in FreeAgent" button (opens FreeAgent with parameters)

### 2. Sync Conflict Resolution
- Detect if timeslip was edited in FreeAgent after sync
- Show diff viewer (side-by-side comparison)
- Options: Keep iTimedIT, Keep FreeAgent, Manual merge
- Setting: Auto-resolve conflicts (always prefer one source)
- Lock synced entries option (prevent editing after sync)

**Conflict Detection**:
- Store `lastSyncedAt` per entry
- Compare with FreeAgent `updated_at` timestamp
- Flag entries with `updated_at > lastSyncedAt`

### 3. Multi-Account Support
- Support agencies managing multiple client FreeAgent accounts
- Per-project FreeAgent account assignment
- Multiple OAuth connections per iTimedIT organization
- Project dropdown: "Sync to FreeAgent account: [Client A] [Client B] [None]"

**Use Case**: Agency tracks time in iTimedIT, but different projects bill through different client FreeAgent accounts.

### 4. Advanced Reporting
- Sync status dashboard
- Historical sync metrics (entries synced per day/week/month)
- Error analytics (most common errors)
- Sync performance metrics (average sync time)
- Export sync logs (CSV)

### 5. Budget Sync
- Pull project budgets from FreeAgent
- Sync iTimedIT budget tracking with FreeAgent project budgets
- Alert when approaching FreeAgent project budget limits
- Two-way budget updates (update FreeAgent when iTimedIT budget changes)

**API**: `GET/PUT https://api.freeagent.com/v2/projects/:id` (includes `budget` and `budget_units` fields)

---

## Technical Architecture

### High-Level Architecture

```
iTimedIT (Convex Backend)
  │
  ├─ freeagentIntegrations table (OAuth tokens, settings)
  ├─ freeagentMappings table (entity relationships)
  ├─ freeagentSyncLogs table (audit trail)
  │
  ├─ Convex Actions (OAuth & API calls)
  │  ├─ freeagent.authorize()
  │  ├─ freeagent.handleCallback()
  │  ├─ freeagent.refreshToken()
  │  ├─ freeagent.syncTimeEntry()
  │  ├─ freeagent.syncBulkEntries()
  │  ├─ freeagent.syncRunningTimer()
  │  ├─ freeagent.fetchProjects()
  │  ├─ freeagent.fetchContacts()
  │  ├─ freeagent.fetchTasks()
  │  └─ freeagent.disconnect()
  │
  ├─ Convex Queries
  │  ├─ freeagent.getIntegration()
  │  ├─ freeagent.getMappings()
  │  ├─ freeagent.getSyncStatus()
  │  └─ freeagent.getSyncLogs()
  │
  ├─ Convex Mutations
  │  ├─ freeagent.updateMapping()
  │  ├─ freeagent.updateSettings()
  │  └─ freeagent.createMapping()
  │
  └─ Convex Cron Jobs
     ├─ freeagent.autoSyncAll() (every 10 min)
     └─ freeagent.refreshTokens() (daily, proactive refresh)
```

### Data Flow

#### OAuth Connection Flow:
```
1. User → Click "Connect FreeAgent"
2. iTimedIT → Generate OAuth URL with state
3. Browser → Redirect to FreeAgent
4. User → Approve integration
5. FreeAgent → Redirect to iTimedIT callback with code
6. iTimedIT → Exchange code for tokens
7. iTimedIT → Store tokens (encrypted)
8. iTimedIT → Fetch user/company data
9. iTimedIT → Show "Connected" status
```

#### Time Entry Sync Flow:
```
1. User → Complete time entry in iTimedIT
2. User → Click "Sync to FreeAgent" (manual) OR Cron job triggers (auto)
3. iTimedIT → Check if mapping exists (project, client, category)
4. iTimedIT → Refresh token if expired
5. iTimedIT → Convert duration (seconds → decimal hours)
6. iTimedIT → POST to FreeAgent API (create timeslip)
7. FreeAgent → Return timeslip data with URL
8. iTimedIT → Store FreeAgent URL in time entry
9. iTimedIT → Log sync status (success/error)
10. iTimedIT → Update UI (show sync indicator)
```

#### Running Timer Sync Flow:
```
1. User → Start timer in iTimedIT
2. iTimedIT → Create timeslip in FreeAgent (0 hours)
3. iTimedIT → Start timer in FreeAgent (POST /timeslips/:id/timer)
4. iTimedIT → Store FreeAgent timeslip URL
5. User → Timer runs...
6. User → Stop timer in iTimedIT
7. iTimedIT → Calculate duration
8. iTimedIT → Stop FreeAgent timer (DELETE /timeslips/:id/timer)
9. iTimedIT → Update timeslip hours (PUT /timeslips/:id)
10. iTimedIT → Log sync status
```

---

## Technical Challenges & Solutions

### Challenge 1: No Official Node.js Library
**Problem**: The only Node.js library (`node-freeagent2`) is abandoned and incomplete (only GET methods).

**Solution**: Use `fetch` API directly in Convex actions
- FreeAgent API is simple REST with excellent documentation
- More control and up-to-date implementation
- No dependency on abandoned packages
- Example:
```typescript
"use node";

const response = await fetch("https://api.freeagent.com/v2/timeslips", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ timeslip: {...} }),
});
```

### Challenge 2: No Webhook Support
**Problem**: FreeAgent API has no webhooks for real-time notifications of changes.

**Solution**: Polling with `updated_since` filter
- Cron job every 10-15 minutes (configurable)
- Only fetch changed records: `GET /timeslips?updated_since={lastSyncedAt}`
- Store `lastSyncedAt` timestamp per organization
- Option for manual refresh button
- Future: FreeAgent has indicated interest in webhooks based on developer feedback

### Challenge 3: Token Refresh (Expires Every Hour)
**Problem**: Access tokens expire after 1 hour (3600 seconds), causing API errors.

**Solution**: Automatic refresh on 401/403 errors + proactive refresh
- Catch 401/403 responses, refresh token, retry original request
- Proactive refresh if `tokenExpiresAt` within 5 minutes
- Refresh tokens last ~20 years (631,139,040 seconds)
- Daily cron job to proactively refresh tokens for active integrations
- Example:
```typescript
async function callFreeAgentAPI(url, options, integration) {
  // Check if token expired
  if (Date.now() >= integration.tokenExpiresAt) {
    await refreshToken(integration.organizationId);
    integration = await getIntegration(integration.organizationId);
  }

  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${integration.accessToken}`,
    },
  });

  // If 401/403, refresh and retry once
  if (response.status === 401 || response.status === 403) {
    await refreshToken(integration.organizationId);
    integration = await getIntegration(integration.organizationId);
    response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${integration.accessToken}`,
      },
    });
  }

  return response;
}
```

### Challenge 4: Rate Limits (120 req/min, 3600 req/hour)
**Problem**: Syncing large datasets can hit rate limits, causing 429 errors.

**Solution**: Batching, throttling, and exponential backoff
- Use bulk timeslip creation endpoint (array of timeslips)
- Batch 10-20 timeslips per request
- Add delay between requests if approaching limit
- Respect `Retry-After` header on 429 responses
- Show progress indicator for bulk operations
- Example:
```typescript
// Batch create timeslips
const batches = chunk(timeslips, 20); // 20 per request
for (const batch of batches) {
  await fetch("https://api.freeagent.com/v2/timeslips", {
    method: "POST",
    body: JSON.stringify({ timeslips: batch }),
  });

  // Throttle: max 120/min = 1 request per 0.5 seconds
  await sleep(500);
}
```

### Challenge 5: Projects Require Contacts
**Problem**: iTimedIT allows projects without clients; FreeAgent requires contact per project.

**Solution**: Auto-create default contact or prompt user
- Option 1: Create "General Client" contact in FreeAgent during setup
- Option 2: Prompt user to assign contact during project mapping
- Option 3: Skip syncing projects without clients (with warning)
- Recommended: Option 2 (explicit user choice)

### Challenge 6: Task Retrieval Performance
**Problem**: Tasks cannot be retrieved in bulk; must fetch per-project (many API requests).

**Solution**: Cache tasks, fetch incrementally, show loading
- Fetch tasks for mapped projects only (not all projects)
- Cache tasks in `freeagentMappings` table
- Refresh cache periodically (e.g., daily)
- Show loading spinner during initial fetch
- Example:
```typescript
// Fetch tasks for all mapped projects
const mappedProjects = await ctx.runQuery(api.freeagent.getMappings, {
  organizationId,
  entityType: "project",
});

const tasks = [];
for (const mapping of mappedProjects) {
  const projectTasks = await fetch(
    `https://api.freeagent.com/v2/tasks?project=${mapping.freeAgentUrl}`
  );
  tasks.push(...projectTasks);
  await sleep(100); // Throttle
}
```

### Challenge 7: Duration Format Conversion
**Problem**: iTimedIT stores duration in seconds, FreeAgent expects decimal hours (1.5 = 1:30).

**Solution**: Convert seconds to decimal hours
```typescript
function secondsToDecimalHours(seconds: number): string {
  return (seconds / 3600).toFixed(2);
}

// Example: 5400 seconds (1.5 hours) → "1.50"
```

**Note**: Test thoroughly - some users report numeric hours not importing correctly from certain systems (may need string format).

### Challenge 8: Timeslip Already Billed
**Problem**: Cannot modify/delete timeslip if `billed_on_invoice` field is set.

**Solution**: Check `billed_on_invoice` before update/delete
```typescript
if (timeslip.billed_on_invoice) {
  throw new Error(
    "Cannot modify this time entry - it has been billed in FreeAgent. " +
    "Please edit the invoice in FreeAgent if needed."
  );
}
```
- Show warning badge on billed entries in iTimedIT UI
- Disable editing for billed entries
- Option: Create new timeslip instead of updating

### Challenge 9: Pagination for Large Datasets
**Problem**: Max 100 items per page; large datasets require many requests.

**Solution**: Implement pagination loop with progress tracking
```typescript
async function fetchAllTimeslips(baseUrl: string, accessToken: string) {
  let allTimeslips = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `${baseUrl}?page=${page}&per_page=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const data = await response.json();
    allTimeslips.push(...data.timeslips);

    // Check X-Total-Count header or Link header for pagination
    const totalCount = parseInt(response.headers.get("X-Total-Count") || "0");
    hasMore = allTimeslips.length < totalCount;
    page++;
  }

  return allTimeslips;
}
```

### Challenge 10: Currency Handling
**Problem**: FreeAgent requires currency per project/task (USD/GBP/EUR/etc.).

**Solution**: Store default currency per organization, allow override
- Fetch currency from iTimedIT user settings (already supports USD/EUR/GBP)
- Default to GBP for UK users, EUR for EU users
- Allow per-project currency override in mapping UI
- FreeAgent projects inherit currency from first task created

### Challenge 11: Time Zone Handling
**Problem**: FreeAgent uses dates (YYYY-MM-DD) without time zones; iTimedIT has timestamps.

**Solution**: Convert timestamps to user's local date
```typescript
function timestampToFreeAgentDate(timestamp: number, timezone: string): string {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0]; // "2025-11-06"
}
```
- Use iTimedIT user's timezone setting
- Be careful with entries near midnight (could be wrong date)
- Document timezone behavior for users

### Challenge 12: OAuth State Parameter (CSRF Protection)
**Problem**: OAuth flow needs CSRF protection via state parameter.

**Solution**: Generate random state, store in session/database
```typescript
import { randomBytes } from "crypto";

export const authorize = action({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const state = randomBytes(32).toString("hex");

    // Store state temporarily (with expiry)
    await ctx.runMutation(api.freeagent.storeOAuthState, {
      organizationId: args.organizationId,
      state,
      expiresAt: Date.now() + 600000, // 10 minutes
    });

    const authUrl = new URL("https://api.freeagent.com/v2/approve_app");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", process.env.FREEAGENT_CLIENT_ID!);
    authUrl.searchParams.set("redirect_uri", process.env.FREEAGENT_REDIRECT_URI!);
    authUrl.searchParams.set("state", state);

    return authUrl.toString();
  },
});
```

---

## FreeAgent API Reference

### Base URLs
- **Production**: `https://api.freeagent.com/v2/`
- **Sandbox**: `https://api.sandbox.freeagent.com/v2/` (for testing)

### Authentication
- **Method**: OAuth 2.0 (Authorization Code flow)
- **Access Token Lifetime**: 1 hour (3600 seconds)
- **Refresh Token Lifetime**: ~20 years (631,139,040 seconds)
- **Token Format**: Bearer token in `Authorization` header

### Rate Limits
- **Per User**: 120 requests per minute, 3,600 requests per hour
- **Resets**: At the start of every hour/minute
- **Exceeded Response**: 429 (Too Many Requests)
- **Header**: `Retry-After` (seconds until reset)

### Pagination
- **Default**: 25 items per page
- **Maximum**: 100 items per page
- **Parameters**: `page` (1-indexed), `per_page` (max 100)
- **Response Headers**:
  - `Link`: Pagination URLs (first, prev, next, last)
  - `X-Total-Count`: Total number of entries

### Key Endpoints

#### Timeslips (Time Entries)
```
GET    /v2/timeslips                    # List all timeslips
GET    /v2/timeslips/:id                # Get single timeslip
POST   /v2/timeslips                    # Create timeslip(s)
PUT    /v2/timeslips/:id                # Update timeslip
DELETE /v2/timeslips/:id                # Delete timeslip
POST   /v2/timeslips/:id/timer          # Start timer
DELETE /v2/timeslips/:id/timer          # Stop timer
```

**Filters**:
- `from_date`, `to_date`: Date range (YYYY-MM-DD)
- `updated_since`: Timestamp (ISO 8601)
- `view`: all/unbilled/running
- `user`, `project`, `task`: Filter by resource URL

#### Projects
```
GET    /v2/projects                     # List all projects
GET    /v2/projects/:id                 # Get single project
POST   /v2/projects                     # Create project
PUT    /v2/projects/:id                 # Update project
DELETE /v2/projects/:id                 # Delete project
```

**Filters**:
- `contact`: Filter by contact URL
- `status`: Active/Completed/Cancelled/Hidden

#### Tasks
```
GET    /v2/tasks?project=:project_url   # List tasks for project
POST   /v2/tasks?project=:project_url   # Create task
PUT    /v2/tasks/:id                    # Update task
DELETE /v2/tasks/:id                    # Delete task
```

**Note**: Tasks must be fetched per-project (no bulk endpoint).

#### Contacts (Clients)
```
GET    /v2/contacts                     # List all contacts
GET    /v2/contacts/:id                 # Get single contact
POST   /v2/contacts                     # Create contact
PUT    /v2/contacts/:id                 # Update contact
DELETE /v2/contacts/:id                 # Delete contact
```

**Filters**:
- `view`: clients/suppliers/all

#### Invoices
```
GET    /v2/invoices                     # List all invoices
GET    /v2/invoices/:id                 # Get single invoice
POST   /v2/invoices                     # Create invoice
PUT    /v2/invoices/:id                 # Update invoice
DELETE /v2/invoices/:id                 # Delete invoice
```

### Access Levels (OAuth Scopes)
FreeAgent uses numeric access levels (higher = more permissions):

1. **Time** (Level 1): Timeslips, tasks
2. **My Money** (Level 2): Bank transactions, expenses
3. **Contacts & Projects** (Level 3): Contacts, projects
4. **Invoices, Estimates & Files** (Level 4): Invoices, estimates
5. **Capital Assets** (Level 5): Assets, depreciation
6. **Bills** (Level 6): Bills, bill payments
7. **Full** (Level 7): All data and settings

**Recommended for iTimedIT**: Request Level 4 (Invoices, Estimates & Files) to access timeslips, projects, contacts, tasks, and invoices.

### Documentation
- **Official API Docs**: https://dev.freeagent.com/docs
- **Developer Dashboard**: https://dev.freeagent.com/
- **Developer Forum**: api-discuss.freeagent.com
- **OAuth Playground**: https://dev.freeagent.com/docs/quick_start

---

## Estimated Costs & ROI

### Development Time

**MVP (Phase 1)**:
- OAuth implementation: 1 week (40 hours)
- Database schema: 0.5 week (20 hours)
- Sync logic (one-way): 1.5 weeks (60 hours)
- Settings UI: 1 week (40 hours)
- Testing + documentation: 1 week (40 hours)
- **Total MVP**: 4-6 weeks (160-240 hours)

**Full Integration (Phases 1-2)**:
- MVP: 4-6 weeks
- Data mapping UI: 1 week (40 hours)
- Running timer sync: 1 week (40 hours)
- Bulk sync: 1 week (40 hours)
- Auto-sync + two-way: 2 weeks (80 hours)
- Mobile support: 1 week (40 hours)
- Testing + polish: 1 week (40 hours)
- **Total Full**: 8-13 weeks (320-520 hours)

**Advanced Features (Phase 3)**:
- Invoice preview: 0.5 week (20 hours)
- Conflict resolution: 1 week (40 hours)
- Multi-account: 0.5 week (20 hours)
- Advanced reporting: 0.5 week (20 hours)
- **Total Advanced**: 2-3 weeks (80-120 hours)

### Ongoing Costs

**Infrastructure**:
- FreeAgent API: **Free** (no usage fees, no rate limit charges)
- Convex: Minimal additional cost (function executions for sync actions)
- Estimated: +$5-20/month depending on sync frequency and user count

**Maintenance**:
- Token refresh monitoring: ~1 hour/month
- Bug fixes and user support: ~2-4 hours/month
- API version updates: ~4 hours/year (FreeAgent rarely breaks compatibility)
- **Total Maintenance**: ~3-5 hours/month

### Return on Investment

**Market Opportunity**:
- FreeAgent has 100,000+ businesses (mostly UK/EU)
- Target market: Freelancers, agencies, consultancies tracking billable hours
- Competing time trackers with FreeAgent integration: Toggl, Harvest, Clockify

**Revenue Impact**:
- **Integration as differentiator**: "We integrate with FreeAgent" → Unlock UK/EU market
- **Paid feature**: Offer FreeAgent sync in Pro/Team tier only (not free tier)
- **Reduce churn**: Keep users who need accounting integration (major churn reason)
- **Premium positioning**: Integration = professional tool (justify $7-15/user pricing)

**Estimated Impact** (conservative):
- Gain 50 UK/EU users in Year 1 (via FreeAgent integration marketing)
- Average $10/user/month = $500/month = $6,000/year
- Development cost: $20,000-40,000 (at $50/hour contractor rate)
- **Payback period**: 3-7 years (conservative)

**Optimistic Scenario**:
- Gain 200 users in Year 1 (aggressive marketing + FreeAgent marketplace listing)
- Average $12/user/month = $2,400/month = $28,800/year
- **Payback period**: 0.7-1.4 years

**Strategic Value** (non-revenue):
- **Competitive parity**: Match Toggl/Harvest feature set
- **Market expansion**: Access UK/EU market (high-value, willing to pay for software)
- **User retention**: Prevent "I need accounting integration" churn
- **Ecosystem lock-in**: Users with FreeAgent integration are less likely to switch
- **Future integrations**: OAuth infrastructure reusable for QuickBooks, Xero, etc.

---

## Competitive Analysis

### Existing FreeAgent Integrations

#### 1. Toggl Track
**Integration**:
- Available via Zapier (no native integration)
- Manual setup required (Zapier workflow)
- Limited to one-way sync (Toggl → FreeAgent)

**Weakness**: No native integration (opportunity for iTimedIT)

#### 2. Harvest
**Integration**:
- No direct FreeAgent integration
- Available via Zapier/Make.com
- Manual workflow setup

**Weakness**: Same as Toggl (no native integration)

#### 3. Clockify
**Integration**:
- No direct FreeAgent integration
- Third-party integration via Zapier

**Weakness**: Same pattern (no native integration)

#### 4. Timestamp (Dedicated FreeAgent Time Tracker)
**Integration**:
- **Native FreeAgent integration** (deep integration)
- Syncs all clients, projects, tasks from FreeAgent
- Creates invoices in FreeAgent from timesheets
- Approval workflow (send timesheets to clients for approval)
- Team timesheet approval

**Strengths**:
- Built specifically for FreeAgent users
- Deep integration (best-in-class)
- Approval workflows (unique feature)

**Weaknesses**:
- Less feature-rich timer (no Pomodoro, no interrupts, no budget alerts)
- No mobile app (web only)
- Older UI/UX

**Opportunity**: iTimedIT can offer best-of-both-worlds (advanced timer features + native FreeAgent integration)

### iTimedIT Competitive Advantage

**Unique Combination**:
1. **Server-side timer interrupts** (no competitor has this)
2. **Native FreeAgent integration** (Toggl/Harvest don't have this)
3. **Advanced Pomodoro** with long breaks (better than Clockify's basic Pomodoro)
4. **Real-time budget alerts** (Timestamp doesn't have this)
5. **Mobile + Web** with instant sync (Timestamp is web-only)

**Positioning**:
"The only time tracker with server-side interrupts AND native FreeAgent integration. Perfect for UK agencies that need accurate billing and seamless invoicing."

---

## Marketing Strategy

### Target Audience

**Primary**: UK/EU freelancers and small agencies (2-10 people)
- Currently using FreeAgent for accounting
- Using Toggl/Harvest/manual time tracking (frustrated by lack of integration)
- Billing hourly (need accurate timesheets for invoicing)
- Tech-savvy (comfortable with cloud software)

**Secondary**: UK/EU solopreneurs and consultants
- Using FreeAgent for Making Tax Digital compliance
- Need time tracking for client billing or self-analysis
- Want single platform for time + accounting (reduce tool sprawl)

### Messaging

**Primary Message**:
"iTimedIT integrates natively with FreeAgent, so your time tracking flows seamlessly into invoices. No more manual transfers, no more Zapier subscriptions."

**Supporting Messages**:
- "Server-side interrupts ensure honest billing (never overbill clients by accident)"
- "Real-time budget alerts protect project profitability"
- "Mobile + web with instant sync (track time anywhere, bill in FreeAgent)"
- "One-click sync from timer to invoice"

### Marketing Channels

**1. FreeAgent Marketplace** (if available):
- List iTimedIT as a FreeAgent-integrated app
- Reach FreeAgent's 100,000+ users directly
- Benefit from FreeAgent's trust/credibility

**2. Content Marketing**:
- Blog post: "How to Track Time in FreeAgent (And Why You Need a Better Timer)"
- Blog post: "5 Ways Agencies Overbill Clients (And How to Prevent It)"
- Comparison page: "iTimedIT vs. Toggl for FreeAgent Users"
- Guide: "Complete Guide to Time Tracking + Invoicing for UK Freelancers"

**3. Communities**:
- FreeAgent user forum (api-discuss.freeagent.com)
- /r/freelanceUK (Reddit)
- UK agency communities (Digital Agency Network, Agency Hour podcast)
- LinkedIn groups (UK freelancers, digital agencies)

**4. Partnerships**:
- Reach out to FreeAgent for partnership/integration spotlight
- Partner with UK accounting firms (recommend iTimedIT to their clients)
- Affiliate program for accountants (commission per referral)

**5. SEO**:
- Target keywords: "FreeAgent time tracking", "time tracker for FreeAgent", "FreeAgent integration"
- Rank for "best time tracker for UK freelancers"
- Comparison pages vs. competitors

### Launch Strategy

**Soft Launch** (Week 1-2):
1. Beta test with 10-20 FreeAgent users
2. Collect feedback, fix bugs
3. Create testimonials/case studies

**Public Launch** (Week 3-4):
1. Announce on Product Hunt (UK timezone launch)
2. Post in FreeAgent community forum
3. Publish blog posts and comparison pages
4. Submit to FreeAgent marketplace (if available)
5. Announce on iTimedIT social media

**Follow-Up** (Month 2-3):
1. Create video tutorial: "How to Connect iTimedIT to FreeAgent"
2. Write case study: "How [Agency] Saved 5 Hours/Week with iTimedIT + FreeAgent"
3. Run LinkedIn ads targeting UK agencies using FreeAgent
4. Reach out to UK tech/business publications

---

## Alternative: No-Code Integration (Zapier)

**If you want to validate demand before building custom integration**:

### Quick Zapier Integration (1-2 hours)

**Setup**:
1. Document Zapier workflow: "New iTimedIT time entry → Create FreeAgent timeslip"
2. Create step-by-step guide with screenshots
3. Publish on iTimedIT docs site

**Zap Steps**:
1. **Trigger**: Webhook from iTimedIT (when time entry completed)
2. **Action**: Create timeslip in FreeAgent (via FreeAgent Zapier app)
3. **Mapping**: Map iTimedIT fields to FreeAgent fields

**Pros**:
- Fast to implement (1-2 hours documentation)
- Validates customer demand (how many users set it up?)
- No maintenance burden (Zapier handles API changes)

**Cons**:
- Less seamless UX (users must set up Zapier)
- Additional cost for users ($20-30/month for Zapier)
- Limited customization (no real-time sync, no conflict resolution)
- Requires iTimedIT webhook system (may not exist yet)

**Recommendation**: Use Zapier as validation step (document it now), then build native integration if demand is proven.

---

## Recommended Next Steps

### Immediate Actions (Week 1)

1. **Create FreeAgent Sandbox Account**:
   - Sign up: https://signup.sandbox.freeagent.com/signup
   - Set up test data (contacts, projects, tasks)
   - Familiarize with FreeAgent UI

2. **Register Developer App**:
   - Go to: https://dev.freeagent.com/
   - Create new app
   - Set redirect URI (e.g., `http://localhost:3000/freeagent/callback` for dev)
   - Obtain Client ID and Client Secret
   - Store securely in environment variables

3. **Test OAuth Flow**:
   - Use OAuth Playground: https://dev.freeagent.com/docs/quick_start
   - Manually test authorization URL
   - Test token exchange with curl/Postman
   - Verify access token works for API requests

4. **Prototype Timeslip Creation**:
   - Use Postman/curl to test `POST /v2/timeslips`
   - Test with sandbox data (real project, task, user)
   - Verify response includes timeslip URL
   - Test updating and deleting timeslips

5. **Review iTimedIT Data Model**:
   - Ensure compatibility with FreeAgent structure
   - Identify mapping challenges (clients, projects, categories)
   - Plan database schema changes

### Decision Points

Before starting development, decide:

#### 1. Sync Direction
**Options**:
- **One-way (iTimedIT → FreeAgent)**: Simpler, covers 90% of use cases
- **Two-way (bidirectional)**: More complex, requires conflict resolution

**Recommendation**: Start with one-way (MVP), add two-way in Phase 2 if users request it.

#### 2. Sync Timing
**Options**:
- **Manual only**: User-triggered, no overhead
- **Auto-sync**: Background polling (e.g., every 10 minutes)
- **Real-time**: Sync on every create/update (more API calls)

**Recommendation**: Manual for MVP, add auto-sync in Phase 2.

#### 3. Category Mapping Strategy
**Options**:
- **Auto-create default task**: Create "General Work" task per project
- **Manual mapping UI**: Let users map categories to tasks
- **Hybrid**: Auto-create + allow custom mapping

**Recommendation**: Hybrid approach (auto-create for MVP, add custom mapping in Phase 2).

#### 4. Multi-Account Support
**Options**:
- **Single FreeAgent account** per iTimedIT organization
- **Multiple accounts** (per-project assignment for agencies)

**Recommendation**: Single account for MVP (simpler), add multi-account in Phase 3 if agencies request it.

#### 5. Running Timer Sync
**Options**:
- **Sync on completion only**: Only sync stopped timers
- **Real-time timer sync**: Start/stop timer in FreeAgent when user starts/stops in iTimedIT

**Recommendation**: Sync on completion for MVP (simpler), add real-time in Phase 2.

---

## Success Metrics

### MVP Success (After 3 Months)

**Adoption Metrics**:
- ✅ 50+ users connect FreeAgent account
- ✅ 500+ time entries synced to FreeAgent
- ✅ 10+ users sync daily (high engagement)

**Quality Metrics**:
- ✅ < 5% sync error rate (95%+ success rate)
- ✅ < 2 support tickets per week (low friction)
- ✅ Average sync time < 3 seconds per entry

**Business Metrics**:
- ✅ 20+ users upgrade to paid tier for FreeAgent integration
- ✅ 10% reduction in churn (users stay for integration)
- ✅ 3+ testimonials mentioning FreeAgent integration

### Full Integration Success (After 6 Months)

**Adoption Metrics**:
- ✅ 200+ users with FreeAgent connected
- ✅ 5,000+ time entries synced
- ✅ 50+ users with auto-sync enabled

**Quality Metrics**:
- ✅ < 2% sync error rate
- ✅ < 1 support ticket per week
- ✅ 4+ star rating in feedback

**Business Metrics**:
- ✅ FreeAgent integration drives 25% of new signups (UK/EU market)
- ✅ 50+ paid users attributable to FreeAgent integration
- ✅ Featured in FreeAgent marketplace (if available)

---

## Risks & Mitigation

### Risk 1: FreeAgent API Changes
**Impact**: Integration breaks, sync errors
**Likelihood**: Low (FreeAgent maintains v2 API stability)
**Mitigation**:
- Monitor FreeAgent developer forum for announcements
- Use versioned API endpoints
- Test with sandbox before production updates
- Build error handling for API changes

### Risk 2: Low User Adoption
**Impact**: Integration unused, wasted development time
**Likelihood**: Medium (depends on market fit)
**Mitigation**:
- Validate demand first (Zapier documentation + user survey)
- Soft launch with beta users (gather feedback early)
- Market heavily in UK/EU communities
- Partner with FreeAgent for promotion

### Risk 3: Token Refresh Failures
**Impact**: Users disconnected, sync stops
**Likelihood**: Medium (tokens expire, edge cases)
**Mitigation**:
- Implement proactive token refresh (cron job)
- Alert users when token refresh fails
- Provide clear reconnection flow
- Monitor token expiry metrics

### Risk 4: Rate Limit Issues
**Impact**: Sync delays, 429 errors
**Likelihood**: Low (120/min is generous)
**Mitigation**:
- Implement batching (10-20 entries per request)
- Add throttling and backoff
- Queue sync requests (process asynchronously)
- Monitor API usage metrics

### Risk 5: Data Mapping Confusion
**Impact**: Users map incorrectly, sync wrong data
**Likelihood**: Medium (complex data relationships)
**Mitigation**:
- Auto-suggest mappings by name
- Show preview before sync ("This will create X timeslips")
- Provide clear mapping documentation
- Add "Test sync" button (dry run without creating data)

### Risk 6: FreeAgent Blocks iTimedIT
**Impact**: Integration disabled, users cannot connect
**Likelihood**: Very Low (FreeAgent encourages integrations)
**Mitigation**:
- Follow FreeAgent API best practices
- Respect rate limits
- Apply for official partnership (if available)
- Maintain good relationship with FreeAgent developer relations

---

## Documentation Needed

### User Documentation

1. **Getting Started Guide**: "How to Connect iTimedIT to FreeAgent"
   - Prerequisites (FreeAgent account, iTimedIT account)
   - Step-by-step OAuth connection flow
   - Screenshots of each step
   - Troubleshooting common issues

2. **Data Mapping Guide**: "Understanding FreeAgent Integration"
   - Explain FreeAgent data hierarchy (contact → project → task → timeslip)
   - How iTimedIT entities map to FreeAgent (client → contact, project → project, etc.)
   - How to create mappings
   - What happens if mapping doesn't exist

3. **Sync Guide**: "Syncing Time Entries to FreeAgent"
   - Manual sync instructions
   - Auto-sync configuration
   - Understanding sync status (synced/pending/error)
   - How to fix sync errors

4. **Invoicing Guide**: "Creating Invoices from iTimedIT Time"
   - How to view unbilled time
   - Creating invoices in FreeAgent (link to FreeAgent docs)
   - Understanding billable vs. unbillable tasks
   - Best practices for accurate billing

5. **Troubleshooting Guide**: "Common FreeAgent Integration Issues"
   - "Token expired" error → How to reconnect
   - "Project not found" error → Check mapping
   - "Timeslip already billed" → Cannot modify
   - Sync taking too long → Rate limits, large dataset

### Developer Documentation

1. **Integration Architecture**: Technical overview
   - Database schema (tables, fields, indexes)
   - API endpoints used
   - OAuth flow diagram
   - Sync flow diagram

2. **OAuth Implementation**: Code walkthrough
   - Authorization flow
   - Token exchange
   - Token refresh logic
   - Error handling

3. **Sync Logic**: Implementation details
   - Data conversion (seconds → decimal hours)
   - Mapping resolution
   - Bulk sync algorithm
   - Rate limit handling

4. **Testing Guide**: How to test integration
   - Sandbox account setup
   - Test cases (happy path, error cases)
   - Mock FreeAgent API responses
   - Integration test suite

---

## Timeline Summary

### MVP Timeline (4-6 Weeks)

**Week 1: Setup & OAuth**
- Day 1-2: FreeAgent sandbox setup, developer app registration
- Day 3-5: Implement OAuth flow (authorization, callback, token storage)
- Day 6-7: Implement token refresh logic

**Week 2: Database & Mapping**
- Day 1-3: Create Convex tables (integrations, mappings, logs)
- Day 4-5: Implement data fetching (projects, contacts, tasks)
- Day 6-7: Build basic mapping UI

**Week 3: Sync Logic**
- Day 1-3: Implement time entry → timeslip conversion
- Day 4-5: Build sync action (POST to FreeAgent)
- Day 6-7: Add error handling and retry logic

**Week 4: UI & Settings**
- Day 1-3: Build settings page (connect/disconnect, status)
- Day 4-5: Add manual sync button and status indicators
- Day 6-7: Create sync logs viewer

**Week 5: Testing**
- Day 1-3: Test with sandbox account (all happy paths)
- Day 4-5: Test error cases (expired token, missing mapping, rate limit)
- Day 6-7: Test with real FreeAgent account (beta users)

**Week 6: Documentation & Launch**
- Day 1-3: Write user documentation (guides, troubleshooting)
- Day 4-5: Create video tutorial
- Day 6-7: Soft launch to beta users, collect feedback

### Full Integration Timeline (Additional 4-7 Weeks)

**Weeks 7-8: Data Mapping UI**
- Advanced mapping page (tabs, auto-suggest, bulk actions)
- Create entities in FreeAgent from iTimedIT
- Mapping conflict resolution

**Weeks 9-10: Running Timer & Bulk Sync**
- Real-time timer sync (start/stop API calls)
- Bulk sync with date range selector
- Progress indicators and batching

**Weeks 11-13: Auto-Sync & Two-Way**
- Convex cron job for auto-sync
- Polling for FreeAgent changes (two-way sync)
- Conflict detection and resolution UI

**Week 14: Mobile Support**
- Expo OAuth flow implementation
- Mobile settings page
- Sync status in mobile app

**Week 15: Testing & Polish**
- End-to-end testing (all features)
- Performance optimization
- Bug fixes and edge cases

### Advanced Features Timeline (Additional 2-3 Weeks)

**Week 16: Invoice Preview**
- Fetch unbilled timeslips
- Calculate invoice amount
- Deep link to FreeAgent invoice creation

**Week 17: Conflict Resolution**
- Detect sync conflicts
- Build diff viewer UI
- Implement merge strategies

**Week 18: Multi-Account & Reporting**
- Support multiple FreeAgent accounts
- Advanced sync analytics
- Export sync logs

---

## Conclusion

FreeAgent integration is **highly feasible** and would provide significant value to iTimedIT users in the UK/EU market. The FreeAgent API is well-designed, thoroughly documented, and provides all necessary endpoints for time tracking, project management, and invoicing workflows.

### Key Takeaways

1. **Estimated Effort**:
   - MVP: 4-6 weeks (160-240 hours)
   - Full Integration: 8-13 weeks (320-520 hours)
   - Advanced Features: 10-16 weeks (400-640 hours)

2. **Technical Complexity**: Medium
   - OAuth2 implementation (standard but requires care)
   - REST API integration (straightforward with good docs)
   - Polling for two-way sync (no webhooks available)
   - Data mapping (requires thoughtful UX)

3. **Main Challenges**:
   - No webhooks (requires polling for FreeAgent → iTimedIT sync)
   - No maintained Node.js library (must implement from scratch)
   - Token refresh logic (access tokens expire every hour)
   - Rate limit handling (120 req/min, batching required for bulk operations)

4. **Recommended Approach**:
   - Custom implementation using Convex actions with direct HTTP requests (`fetch` API)
   - Start with MVP (one-way sync, manual trigger)
   - Validate user adoption before building Phase 2
   - Consider Zapier documentation as initial validation step

5. **Value Proposition**:
   - Seamless time-to-invoice workflow for UK/EU freelancers and agencies
   - Differentiator vs. competitors (Toggl/Harvest don't have native FreeAgent integration)
   - Unlocks 100,000+ FreeAgent users as potential customers
   - Reduces churn (users stay for integration)
   - Justifies premium pricing (integration = professional feature)

6. **Strategic Importance**:
   - **Competitive parity**: Match time tracking leaders (Harvest, Toggl)
   - **Market expansion**: Access high-value UK/EU market
   - **Ecosystem lock-in**: Users with integrations rarely switch
   - **Infrastructure reuse**: OAuth system reusable for QuickBooks, Xero, etc.

### Final Recommendation

**Build the MVP** (4-6 weeks) because:
- FreeAgent integration is **table-stakes** for UK/EU time tracking software
- API is well-documented and low technical risk
- Differentiates iTimedIT from free time trackers (integration = paid feature)
- Opens new market (100,000+ FreeAgent businesses)
- Complements unique features (server-side interrupts + accounting integration = powerful combination)

**Success depends on**:
1. Validating demand first (survey users, document Zapier workflow)
2. Excellent onboarding (clear docs, video tutorials)
3. Marketing to UK/EU audience (FreeAgent marketplace, communities, SEO)
4. Iteration based on user feedback (add Phase 2 features if requested)

The integration would position iTimedIT as a comprehensive time tracking solution for UK/EU freelancers and small businesses who use FreeAgent for accounting, filling a gap that major competitors (Toggl, Harvest) have not addressed with native integrations.
