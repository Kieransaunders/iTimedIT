import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user has previously dismissed the prompt
    const dismissedTime = localStorage.getItem('pwa-install-dismissed');
    if (dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        // Don't show again for 7 days
        return;
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      // Show prompt after a short delay to avoid being intrusive
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Track successful installations
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      localStorage.removeItem('pwa-install-dismissed');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }

      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Error showing install prompt:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  const handleRemindLater = () => {
    setShowPrompt(false);
    // Don't set localStorage, so it can show again in the same session
  };

  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-5">
      <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-2xl border-none">
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <img src="/icon.png" alt="iTimedIT" className="w-10 h-10 rounded-lg" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Install iTimedIT</h3>
                <p className="text-sm text-orange-100">Get the full app experience</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="text-white hover:bg-orange-700 -mr-2 -mt-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ul className="space-y-2 mb-4 text-sm text-orange-50">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
              Works offline with your data
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
              Faster than the web version
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
              App icon on your home screen
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
              Timer notifications even when closed
            </li>
          </ul>

          <div className="flex gap-2">
            <Button
              onClick={handleInstall}
              className="flex-1 bg-white text-orange-600 hover:bg-orange-50 font-semibold"
            >
              <Download className="h-4 w-4 mr-2" />
              Install Now
            </Button>
            <Button
              onClick={handleRemindLater}
              variant="ghost"
              className="text-white hover:bg-orange-700"
            >
              Later
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
