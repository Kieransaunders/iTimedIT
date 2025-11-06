# Recurring Monthly Projects - Test Plan

## Overview
This document outlines how to test the new recurring monthly projects feature.

## What Was Implemented

### 1. Database Schema Changes (`apps/web/convex/schema.ts`)
- ✅ Added `isTemplate` field to mark project templates
- ✅ Added `parentTemplateId` to link projects created from templates
- ✅ Added `recurringConfig` object with:
  - `enabled`: Auto-creation toggle
  - `frequency`: Monthly recurrence
  - `nextCreationDate`: When to create next project
  - `namePattern`: Template for auto-naming (e.g., "Acme Retainer - {month} {year}")
  - `preserveClientId`: Whether to copy client to new projects
  - `notifyOnCreation`: Send push notification when created
- ✅ Added `billingPeriod` object with start/end dates and label
- ✅ Added indexes: `byTemplate` and `byParentTemplate`

### 2. Backend Functions (`apps/web/convex/projects.ts`)
- ✅ `createTemplate` - Create a new project template
- ✅ `duplicateFromTemplate` - Manually create a project from a template
- ✅ `listTemplates` - Query all templates
- ✅ `listByTemplate` - Get all projects created from a specific template
- ✅ `updateTemplate` - Update template settings

### 3. Cron Job (`apps/web/convex/crons.ts`)
- ✅ Daily cron job (runs at midnight UTC)
- ✅ Finds templates with `enabled: true` and due date <= now
- ✅ Creates new projects automatically
- ✅ Updates template's `nextCreationDate` to next month
- ✅ Sends push notification if enabled
- ✅ Comprehensive logging for debugging

### 4. UI Components
- ✅ **New Component**: `ProjectTemplatesPage.tsx` - Full template management UI
- ✅ **Updated**: `ProjectsPage.tsx` - Shows billing period labels on recurring projects
- ✅ Templates excluded from regular projects list

## Testing Instructions

### Step 1: Start Convex Dev Server
```bash
cd apps/web
npx convex dev
```

### Step 2: Test Template Creation via Convex Dashboard

1. Open Convex Dashboard: https://dashboard.convex.dev
2. Navigate to your project → Functions
3. Run `projects:createTemplate` with these args:

```json
{
  "name": "Acme Marketing Retainer",
  "hourlyRate": 100,
  "budgetType": "hours",
  "budgetHours": 10,
  "recurringConfig": {
    "enabled": true,
    "namePattern": "Acme Marketing - {month} {year}",
    "preserveClientId": false,
    "notifyOnCreation": true
  }
}
```

4. Verify in the `projects` table that a new project exists with:
   - `isTemplate: true`
   - `recurringConfig.nextCreationDate` set to 1st of next month
   - All other fields populated correctly

### Step 3: Test Manual Project Creation

1. In Convex Dashboard, run `projects:duplicateFromTemplate`:

```json
{
  "templateId": "YOUR_TEMPLATE_ID_HERE"
}
```

2. Check the `projects` table - you should see a new project with:
   - `isTemplate: false`
   - `parentTemplateId`: Links to your template
   - `billingPeriod.label`: "November 2025" (or current month)
   - `name`: "Acme Marketing - November 2025"
   - Same budget/rate as template

### Step 4: Test Cron Job (Manual Trigger)

**Option A: Modify nextCreationDate to trigger immediately**

1. In Convex Dashboard, find your template in the `projects` table
2. Click "Edit document"
3. Change `recurringConfig.nextCreationDate` to a timestamp in the past (e.g., `1730000000000`)
4. Save
5. In Functions tab, manually run `crons:createRecurringProjects` with empty args: `{}`
6. Check logs - should see "Created recurring project: Acme Marketing - November 2025"
7. Verify new project exists in `projects` table
8. Verify template's `nextCreationDate` was updated to next month

**Option B: Wait for daily cron (midnight UTC)**

1. Set `recurringConfig.nextCreationDate` to tomorrow's date
2. Wait for cron to run automatically
3. Check Convex logs the next day

### Step 5: Test Template Management UI

1. Start the web app: `npm run dev:web`
2. Navigate to the Projects page
3. You should see templates excluded from the regular projects list
4. Access the `ProjectTemplatesPage` component (you'll need to add a route or navigation link)
5. Test:
   - Creating a template via the form
   - Editing a template
   - Clicking "Create project for this month" button
   - Deleting a template
   - Toggling auto-create on/off

### Step 6: Verify Billing Period Display

1. In the regular Projects page, find a project created from a template
2. Under the project name, you should see: "📅 November 2025" (or current month)

### Step 7: Test Edge Cases

**Test 1: Disabled auto-creation**
- Create template with `recurringConfig.enabled: false`
- Verify cron job skips it (check logs)

**Test 2: Client preservation**
- Create a template with a client assigned
- Set `preserveClientId: true`
- Duplicate from template
- Verify new project has the same client

**Test 3: Custom billing period**
- Call `duplicateFromTemplate` with:
```json
{
  "templateId": "YOUR_TEMPLATE_ID",
  "billingPeriodStart": 1735689600000  // Jan 1, 2025 00:00:00 UTC
}
```
- Verify project has billing period for January 2025

**Test 4: Multiple templates**
- Create 3 templates with different names
- Set all to auto-create next month
- Verify cron creates all 3 projects

## Integration Points

### To Add Navigation to Template Page
Add to your routing config (e.g., `App.tsx`):

```typescript
import { ProjectTemplatesPage } from "./components/ProjectTemplatesPage";

// In your router:
<Route path="/project-templates" element={<ProjectTemplatesPage />} />
```

### To Add Menu Link
In your navigation component:

```typescript
<Link to="/project-templates">
  Project Templates
</Link>
```

## Monitoring & Debugging

### Useful Convex Queries

**List all templates:**
```javascript
ctx.db.query("projects").filter(q => q.eq(q.field("isTemplate"), true)).collect()
```

**Find projects from a template:**
```javascript
ctx.db.query("projects")
  .filter(q => q.eq(q.field("parentTemplateId"), "YOUR_TEMPLATE_ID"))
  .collect()
```

**Check next cron execution:**
Look for "create recurring projects" in Convex Dashboard → Crons tab

### Logs to Watch

In Convex Dashboard → Logs:
- `🔄 Recurring Projects Cron: Found N templates`
- `✅ Created recurring project: [name]`
- `📅 Updated template next creation date`
- `🔔 Notification scheduled`
- `❌ Failed to create project` (errors)

## Rollback Plan

If you need to remove this feature:

1. Remove cron job from `apps/web/convex/crons.ts` (line 11)
2. Delete new functions from `apps/web/convex/projects.ts` (lines 403-633)
3. Delete `ProjectTemplatesPage.tsx`
4. Revert schema changes in `apps/web/convex/schema.ts`
5. Redeploy Convex backend

Existing projects will not be affected - new fields are optional.

## Production Deployment

1. ✅ Run tests in development
2. ✅ Verify cron job works correctly
3. ✅ Push changes to git
4. ✅ Deploy Convex backend: `npx convex deploy` (from apps/web/)
5. ✅ Deploy web app (Netlify auto-deploys on push)
6. ✅ Monitor logs for first month's automated creation

## Known Limitations

1. **Frequency**: Only monthly recurrence supported (can add quarterly/yearly later)
2. **Time zone**: Cron runs at midnight UTC (not user's local time)
3. **Archiving**: Templates and generated projects must be manually archived
4. **Editing past projects**: Editing template doesn't update already-created projects
5. **Billing period validation**: No checks to prevent creating duplicate projects for same month

## Future Enhancements

- [ ] Quarterly and yearly frequencies
- [ ] Auto-archive projects older than X months
- [ ] Bulk operations (pause all templates, create for specific month)
- [ ] Email digest when projects are created
- [ ] Template usage analytics
- [ ] Project chain view (see all projects from a template)
- [ ] Prevent duplicate creation for same billing period
