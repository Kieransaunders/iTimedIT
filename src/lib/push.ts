// Push notification client-side utilities

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

declare const __APP_VERSION__: string;

let swRegistration: ServiceWorkerRegistration | null = null;
let cachedSubscription: PushSubscriptionData | null = null;

export async function initializePushNotifications(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported');
    return false;
  }

  try {
    const versionSuffix = import.meta.env.DEV
      ? `dev-${Date.now()}`
      : __APP_VERSION__;
    const swUrl = `/sw.js?v=${versionSuffix}`;

    // Register service worker
    swRegistration = await navigator.serviceWorker.register(swUrl, {
      scope: '/'
    });

    console.log('Service Worker registered:', swRegistration);

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    return true;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return false;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported in this browser');
    return 'denied';
  }

  // Check current permission state
  const currentPermission = Notification.permission;
  console.log('Current notification permission:', currentPermission);

  if (currentPermission === 'granted') {
    return 'granted';
  }

  if (currentPermission === 'denied') {
    console.warn('Notification permission was previously denied. User must manually enable in browser settings.');
    return 'denied';
  }

  // Permission is 'default', so we can request it
  try {
    const permission = await Notification.requestPermission();
    console.log('Notification permission result:', permission);
    
    if (permission === 'denied') {
      console.warn('User denied notification permission');
    } else if (permission === 'granted') {
      console.log('User granted notification permission');
    }
    
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

export async function subscribeToPush(): Promise<PushSubscriptionData | null> {
  if (!swRegistration) {
    console.error('Service Worker not registered');
    return null;
  }

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.error('VAPID public key not configured');
    return null;
  }

  try {
    // Check if already subscribed
    let subscription = await swRegistration.pushManager.getSubscription();

    if (!subscription) {
      // Create new subscription
      subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
    }

    if (!subscription) {
      console.error('Failed to create push subscription');
      return null;
    }

    // Convert to our format
    const p256dh = subscription.getKey('p256dh');
    const auth = subscription.getKey('auth');

    if (!p256dh || !auth) {
      console.error('Invalid subscription keys');
      return null;
    }

    const result: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(p256dh),
        auth: arrayBufferToBase64(auth)
      }
    };
    cachedSubscription = result;
    return result;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return null;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!swRegistration) {
    return false;
  }

  try {
    const subscription = await swRegistration.pushManager.getSubscription();
    if (subscription) {
      const success = await subscription.unsubscribe();
      console.log('Push unsubscription successful:', success);
      if (success) {
        cachedSubscription = null;
      }
      return success;
    }
    return true;
  } catch (error) {
    console.error('Push unsubscription failed:', error);
    return false;
  }
}

export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

export function getPermissionTroubleshootingInfo(): {
  permission: NotificationPermission;
  canRequest: boolean;
  browserSupported: boolean;
  isSecureContext: boolean;
  troubleshootingSteps: string[];
} {
  const browserSupported = 'Notification' in window;
  const permission = browserSupported ? Notification.permission : 'denied';
  const canRequest = permission === 'default';
  const isSecureContext = window.isSecureContext;
  
  const troubleshootingSteps: string[] = [];
  
  if (!browserSupported) {
    troubleshootingSteps.push('Your browser does not support notifications');
  }
  
  if (!isSecureContext) {
    troubleshootingSteps.push('Notifications require HTTPS or localhost');
  }
  
  if (permission === 'denied') {
    troubleshootingSteps.push('Permission was denied. Reset in browser settings:');
    troubleshootingSteps.push('Chrome: Address bar → Lock icon → Notifications → Allow');
    troubleshootingSteps.push('Firefox: Address bar → Shield icon → Notifications → Allow');
    troubleshootingSteps.push('Safari: Safari menu → Settings → Websites → Notifications');
  }
  
  if (permission === 'default') {
    troubleshootingSteps.push('Click "Enable push notifications" to request permission');
  }
  
  return {
    permission,
    canRequest,
    browserSupported,
    isSecureContext,
    troubleshootingSteps
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Listen for messages from service worker
export function setupPushMessageListener(
  onTimerAction: (action: string, data: any) => void
) {
  if (!('serviceWorker' in navigator)) {
    return () => {};
  }

  const handler = (event: MessageEvent) => {
    if (event.data && event.data.type === 'TIMER_ACTION') {
      onTimerAction(event.data.action, event.data.data);
    }
  };

  navigator.serviceWorker.addEventListener('message', handler);
  return () => navigator.serviceWorker.removeEventListener('message', handler);
}

export async function ensurePushSubscription(options: {
  requestPermission?: boolean;
} = {}): Promise<PushSubscriptionData | null> {
  if (!isPushSupported()) {
    return null;
  }

  if (!swRegistration) {
    const initialized = await initializePushNotifications();
    if (!initialized) {
      return null;
    }
  }

  let permission = getNotificationPermission();

  if (permission === 'default' && options.requestPermission) {
    permission = await requestNotificationPermission();
  }

  if (permission !== 'granted') {
    return null;
  }

  if (cachedSubscription) {
    return cachedSubscription;
  }

  return await subscribeToPush();
}
