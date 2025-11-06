import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getPermissionTroubleshootingInfo, ensurePushSubscription } from '@/lib/push';

export function NotificationDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    updateDebugInfo();
  }, []);

  const updateDebugInfo = () => {
    const info = getPermissionTroubleshootingInfo();
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

    setDebugInfo({
      ...info,
      vapidConfigured: !!vapidKey,
      vapidKeyPrefix: vapidKey ? vapidKey.substring(0, 10) + '...' : 'NOT SET',
      serviceWorkerSupported: 'serviceWorker' in navigator,
      pushManagerSupported: 'PushManager' in window,
    });
  };

  const testNotificationPermission = async () => {
    setTesting(true);
    try {
      console.log('Testing notification permission request...');
      const subscription = await ensurePushSubscription({ requestPermission: true });
      console.log('Subscription result:', subscription);
      updateDebugInfo();
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setTesting(false);
    }
  };

  if (!debugInfo) {
    return null;
  }

  return (
    <Card className="p-6 mb-6 bg-yellow-50 border-yellow-200">
      <h3 className="font-bold text-lg mb-4">🔍 Notification Debug Info</h3>

      <div className="space-y-2 text-sm mb-4">
        <div><strong>Permission:</strong> {debugInfo.permission}</div>
        <div><strong>Browser Support:</strong> {debugInfo.browserSupported ? '✅ Yes' : '❌ No'}</div>
        <div><strong>Secure Context (HTTPS):</strong> {debugInfo.isSecureContext ? '✅ Yes' : '❌ No'}</div>
        <div><strong>Service Worker:</strong> {debugInfo.serviceWorkerSupported ? '✅ Yes' : '❌ No'}</div>
        <div><strong>Push Manager:</strong> {debugInfo.pushManagerSupported ? '✅ Yes' : '❌ No'}</div>
        <div><strong>VAPID Key:</strong> {debugInfo.vapidConfigured ? `✅ ${debugInfo.vapidKeyPrefix}` : '❌ NOT CONFIGURED'}</div>
        <div><strong>Can Request:</strong> {debugInfo.canRequest ? '✅ Yes' : '❌ No'}</div>
      </div>

      {debugInfo.troubleshootingSteps.length > 0 && (
        <div className="mb-4">
          <strong className="block mb-2">Troubleshooting:</strong>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {debugInfo.troubleshootingSteps.map((step: string, i: number) => (
              <li key={i}>{step}</li>
            ))}
          </ul>
        </div>
      )}

      <Button
        onClick={testNotificationPermission}
        disabled={testing || !debugInfo.canRequest}
        className="w-full"
      >
        {testing ? 'Testing...' : 'Test Permission Request'}
      </Button>
    </Card>
  );
}
