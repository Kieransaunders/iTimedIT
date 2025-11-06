import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCw, X, Loader2 } from 'lucide-react';

export function PWAUpdatePrompt() {
  const [showReload, setShowReload] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('SW Registered:', registration);
      // Check for updates every hour
      if (registration) {
        setInterval(() => {
          console.log('Checking for SW updates...');
          registration.update();
        }, 60 * 60 * 1000); // Every 1 hour
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
    onNeedRefresh() {
      console.log('New content available, showing update prompt');
      setShowReload(true);
      setIsUpdating(false); // Reset if shown again
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    },
  });

  const handleUpdate = async () => {
    console.log('User clicked update, initiating update process...');
    setIsUpdating(true);

    try {
      // This will send SKIP_WAITING message to service worker
      await updateServiceWorker(true);

      // Give the service worker time to activate
      setTimeout(() => {
        console.log('Reloading page to apply update...');
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Error during service worker update:', error);
      // Force reload anyway to clear stuck state
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    console.log('User dismissed update prompt');
    setShowReload(false);
    setNeedRefresh(false);
    setIsUpdating(false);
  };

  if (!showReload) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-top-5">
      <Card className="bg-blue-600 text-white shadow-2xl border-none">
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold">Update Available</h3>
                <p className="text-sm text-blue-100">A new version of iTimedIT is ready</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="text-white hover:bg-blue-700 -mr-2 -mt-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="flex-1 bg-white text-blue-600 hover:bg-blue-50 font-semibold disabled:opacity-50"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Update Now
                </>
              )}
            </Button>
            <Button
              onClick={handleDismiss}
              disabled={isUpdating}
              variant="ghost"
              className="text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Later
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
