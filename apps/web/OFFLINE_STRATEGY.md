# Offline Data Strategy for iTimedIT PWA

## Overview

iTimedIT now supports Progressive Web App (PWA) capabilities with intelligent offline functionality. This document outlines the caching strategies, offline behavior, and future improvements for full offline data support.

## Current Implementation (Phase 1)

### ✅ What's Working Now

#### 1. **App Shell Caching**
- All static assets (HTML, CSS, JS) are precached by Workbox
- App loads instantly from cache, even offline
- Updates automatically when new versions are deployed

#### 2. **Asset Caching**
- **Static Resources** (CacheFirst, 30 days):
  - JavaScript bundles
  - CSS stylesheets
  - Web fonts (woff2)
- **Images** (StaleWhileRevalidate, 7 days):
  - Icons, logos, UI images
  - Shows cached version immediately, updates in background
- **Audio** (CacheFirst, 30 days):
  - Timer sound effects
  - Notification sounds

#### 3. **Convex API Caching**
- **Strategy**: NetworkFirst with 10-second timeout
- **Behavior**:
  - Tries network first for fresh data
  - Falls back to cache if network is slow/unavailable
  - Cache stays valid for offline sessions
- **Cached Queries**:
  - Projects list
  - Clients list
  - Time entries
  - Timer state
  - User settings

#### 4. **Push Notifications (Offline)**
- Service worker continues to receive push notifications even when app is closed
- Notifications show timer alerts, budget warnings, and interrupts
- Badge API shows notification count on app icon

### ⚠️ Current Limitations

1. **Read-Only Offline Mode**
   - Can view cached data (projects, entries, clients)
   - Cannot create/edit/delete while offline
   - Mutations require active network connection

2. **No Offline Queue**
   - Actions performed offline are lost
   - User must retry when back online

3. **Cache Invalidation**
   - Cached data may become stale if offline for extended periods
   - No automatic background sync

## Offline Behavior by Feature

| Feature | Online | Offline |
|---------|--------|---------|
| **View Projects** | ✅ Fresh data | ✅ Cached data |
| **View Clients** | ✅ Fresh data | ✅ Cached data |
| **View Entries** | ✅ Fresh data | ✅ Cached data |
| **Start Timer** | ✅ Works | ❌ Requires network |
| **Stop Timer** | ✅ Works | ❌ Requires network |
| **Create Project** | ✅ Works | ❌ Requires network |
| **Edit Entry** | ✅ Works | ❌ Requires network |
| **Push Notifications** | ✅ Works | ✅ Works |
| **App Install** | ✅ Works | ✅ Works from cache |

## Network Error Handling

### User Feedback
When offline mutations are attempted:
1. Convex client automatically detects network failure
2. Error is caught and displayed as a toast notification
3. User is informed to retry when online

### Recommended UX Pattern
```typescript
try {
  await createProjectMutation({ name, clientId });
  toast.success("Project created!");
} catch (error) {
  if (error.message.includes("network")) {
    toast.error("You're offline. Please try again when connected.");
  } else {
    toast.error("Failed to create project");
  }
}
```

## Future Enhancements (Phase 2)

### 🚀 Planned Improvements

#### 1. **Offline Mutation Queue**
- Store mutations in IndexedDB when offline
- Automatically sync when connection returns
- Show sync status indicator

**Implementation Approach:**
```typescript
interface QueuedMutation {
  id: string;
  timestamp: number;
  type: 'timer.start' | 'timer.stop' | 'entries.create' | ...;
  args: Record<string, any>;
  retryCount: number;
}

// Store in IndexedDB
const offlineQueue = new IndexedDBQueue('mutations');

// On reconnection
window.addEventListener('online', async () => {
  const pending = await offlineQueue.getAll();
  for (const mutation of pending) {
    await retryMutation(mutation);
  }
});
```

#### 2. **Conflict Resolution**
For scenarios where data changes while offline:
- Timestamp-based resolution (last write wins)
- Merge strategies for non-conflicting changes
- User prompt for conflicts requiring manual resolution

#### 3. **Background Sync**
- Use Service Worker Background Sync API
- Automatically sync queued mutations
- Works even if app is closed

#### 4. **Optimistic UI Updates**
- Show immediate feedback for offline actions
- Mark as "pending sync"
- Rollback on failure

#### 5. **Smart Cache Invalidation**
- Invalidate cache after X hours offline
- Show "data may be outdated" warning
- Force refresh option

## Architecture Details

### Service Worker Structure
```
/public/sw.js
├── Workbox precaching (app shell)
├── Push notification handlers
├── Runtime caching strategies
└── Custom offline fallback
```

### Caching Configuration
```javascript
// vite.config.ts - Workbox configuration
workbox: {
  runtimeCaching: [
    // Convex API - NetworkFirst
    {
      urlPattern: /^https:\/\/.*\.convex\.cloud\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "convex-api-cache",
        networkTimeoutSeconds: 10,
      }
    },
    // Static assets - CacheFirst
    // Images - StaleWhileRevalidate
    // Audio - CacheFirst
  ]
}
```

## Testing Offline Functionality

### Manual Testing
1. **Install the PWA**
   ```bash
   npm run build --workspace=@itimedit/web
   npx serve dist
   ```
   Visit `http://localhost:3000` and install from browser

2. **Simulate Offline**
   - Chrome DevTools → Network tab → "Offline" checkbox
   - Or: Application tab → Service Workers → "Offline"

3. **Test Scenarios**
   - Load app offline (should work from cache)
   - View projects/entries offline (should show cached data)
   - Try to start timer offline (should show error)
   - Receive push notification while offline (should work)

### Automated Testing
```bash
# Using Playwright or Cypress
test('app works offline', async ({ page, context }) => {
  await context.setOffline(true);
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('iTimedIT');
  await expect(page.locator('.project-list')).toBeVisible();
});
```

## Cache Storage Limits

### Browser Limits
- Chrome/Edge: ~60% of available disk space
- Safari: 1GB per origin
- Firefox: 10% of available disk space (up to 2GB)

### Current Usage Estimate
- App shell: ~2-5 MB
- Convex API cache: ~1-10 MB (varies by user data)
- Images/icons: ~500 KB
- Audio files: ~1-2 MB
- **Total**: ~5-20 MB typical usage

### Cache Eviction
- Browsers use LRU (Least Recently Used) eviction
- PWA data is persistent storage (less likely to be evicted)
- Service worker updates clear old precache automatically

## Monitoring & Debugging

### Service Worker Logs
```javascript
// In service worker context
console.log('Cache hit:', event.request.url);
console.log('Network fetch:', event.request.url);
```

### Chrome DevTools
- **Application** → Service Workers: View registration status
- **Application** → Cache Storage: Inspect cached resources
- **Network** → Filter by service worker: See SW intercepted requests

### Convex Dashboard
- Monitor query/mutation success rates
- Track offline error patterns
- Analyze network timeouts

## Security Considerations

1. **HTTPS Required**
   - Service workers only work on HTTPS (or localhost)
   - Production: https://itimedit.netlify.app

2. **Cache Validation**
   - Service worker validates cached responses
   - Convex auth tokens refresh automatically
   - Expired cache cleared on update

3. **Sensitive Data**
   - Timer data cached locally (encrypted by browser)
   - Push subscription keys stored securely
   - Clear cache on sign-out

## Performance Impact

### Metrics
- **First Load** (online): +200-500ms (SW registration)
- **Subsequent Loads** (online): -500-1000ms (cached shell)
- **Offline Load**: ~100-300ms (instant from cache)
- **Network Timeout**: 10s before fallback to cache

### Optimization Tips
1. Keep precache small (only essential assets)
2. Use runtime caching for large resources
3. Set appropriate cache expiration
4. Monitor cache hit rates

## Migration Path

### From Current → Full Offline Support

**Step 1**: Add offline indicator UI
```typescript
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

**Step 2**: Implement IndexedDB queue (see Phase 2)

**Step 3**: Add Background Sync API

**Step 4**: Implement conflict resolution

## Resources

- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [PWA Best Practices](https://web.dev/pwa/)

## Support

For issues or questions about offline functionality:
1. Check browser console for service worker logs
2. Inspect Application → Cache Storage in DevTools
3. Test with "Offline" mode in DevTools
4. Review Convex dashboard for API errors
