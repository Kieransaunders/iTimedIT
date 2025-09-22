// Service Worker for Web Push Notifications
self.addEventListener('install', event => {
  console.log('Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker activating');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
  console.log('Push received:', event);
  
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    console.error('Failed to parse push data:', e);
    data = {
      title: 'Timer Alert',
      body: event.data.text() || 'Time to check your timer!',
      actions: []
    };
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/timer.svg',
    badge: data.badge || '/icons/badge.svg',
    tag: 'timer-alert',
    requireInteraction: true,
    data: data.data || {},
    actions: normalizeActions(data.actions),
    vibrate: data.vibrate || [200, 100, 200],
    timestamp: Date.now()
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Timer Alert', options)
  );
});

function normalizeActions(rawActions) {
  if (Array.isArray(rawActions) && rawActions.length > 0) {
    return rawActions;
  }

  return [
      {
        action: 'stop',
        title: 'Stop Timer',
        icon: '/icons/stop.svg'
      },
      {
        action: 'snooze',
        title: 'Snooze 5min',
        icon: '/icons/snooze.svg'
      },
      {
        action: 'switch',
        title: 'Switch Project',
        icon: '/icons/switch.svg'
      }
    ];
}

self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  // Handle notification actions
  if (action === 'stop') {
    // Focus the app and send stop action
    event.waitUntil(
      focusOrOpenApp('/').then(client => {
        if (client) {
          client.postMessage({
            type: 'TIMER_ACTION',
            action: 'stop',
            data: data
          });
        }
      })
    );
  } else if (action === 'snooze') {
    // Focus the app and send snooze action
    event.waitUntil(
      focusOrOpenApp('/').then(client => {
        if (client) {
          client.postMessage({
            type: 'TIMER_ACTION',
            action: 'snooze',
            data: data
          });
        }
      })
    );
  } else if (action === 'switch') {
    // Focus the app and send switch action
    event.waitUntil(
      focusOrOpenApp('/').then(client => {
        if (client) {
          client.postMessage({
            type: 'TIMER_ACTION',
            action: 'switch',
            data: data
          });
        }
      })
    );
  } else if (action === 'continue') {
    // Backwards compatibility for older notifications using continue
    event.waitUntil(
      focusOrOpenApp('/').then(client => {
        if (client) {
          client.postMessage({
            type: 'TIMER_ACTION',
            action: 'continue',
            data: data
          });
        }
      })
    );
  } else {
    // Default click - just focus the app
    event.waitUntil(focusOrOpenApp('/'));
  }
});

self.addEventListener('notificationclose', event => {
  console.log('Notification closed:', event);
  // Track notification dismissal for analytics if needed
});

async function focusOrOpenApp(url = '/') {
  const urlToOpen = new URL(url, self.location.origin).href;

  // Get all clients (open tabs/windows)
  const allClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });

  // Check if the app is already open
  let clientToFocus = null;
  for (const client of allClients) {
    if (client.url === urlToOpen || client.url.startsWith(self.location.origin)) {
      clientToFocus = client;
      break;
    }
  }

  if (clientToFocus) {
    // Focus existing client
    if (clientToFocus.focus) {
      await clientToFocus.focus();
    }
    if (clientToFocus.navigate && clientToFocus.url !== urlToOpen) {
      await clientToFocus.navigate(urlToOpen);
    }
    return clientToFocus;
  } else {
    // Open new window/tab
    const newClient = await self.clients.openWindow(urlToOpen);
    return newClient;
  }
}

// Handle messages from the main app
self.addEventListener('message', event => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
