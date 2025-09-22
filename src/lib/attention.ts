// In-app attention utilities for badging, sound, vibration, and wake lock

let wakeLock: WakeLockSentinel | null = null;
let originalTitle = document.title;
let titleBlinkInterval: NodeJS.Timeout | null = null;

export interface AttentionOptions {
  badge?: number;
  sound?: boolean;
  vibration?: boolean;
  wakeLock?: boolean;
  titleBlink?: boolean;
}

// App Badge API
export async function setAppBadge(count: number): Promise<boolean> {
  if ('setAppBadge' in navigator) {
    try {
      await navigator.setAppBadge(count);
      return true;
    } catch (error) {
      console.warn('Failed to set app badge:', error);
    }
  }
  
  // Fallback to title blinking for browsers without badge support
  if (count > 0) {
    startTitleBlink(`(${count}) ${originalTitle}`);
  } else {
    stopTitleBlink();
  }
  
  return false;
}

export async function clearAppBadge(): Promise<boolean> {
  if ('clearAppBadge' in navigator) {
    try {
      await navigator.clearAppBadge();
      stopTitleBlink();
      return true;
    } catch (error) {
      console.warn('Failed to clear app badge:', error);
    }
  }
  
  stopTitleBlink();
  return false;
}

export function isBadgeSupported(): boolean {
  return 'setAppBadge' in navigator;
}

// Title blinking fallback
function startTitleBlink(alertTitle: string) {
  if (titleBlinkInterval) {
    clearInterval(titleBlinkInterval);
  }
  
  let isAlert = false;
  titleBlinkInterval = setInterval(() => {
    document.title = isAlert ? originalTitle : alertTitle;
    isAlert = !isAlert;
  }, 1000);
}

function stopTitleBlink() {
  if (titleBlinkInterval) {
    clearInterval(titleBlinkInterval);
    titleBlinkInterval = null;
  }
  document.title = originalTitle;
}

// Sound notifications
export function playAlertSound(soundType: 'subtle' | 'urgent' = 'subtle'): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configure sound based on type
      if (soundType === 'subtle') {
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } else {
        // Urgent: Two-tone beep
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      }
      
      oscillator.onended = () => {
        audioContext.close();
        resolve(true);
      };
    } catch (error) {
      console.warn('Failed to play alert sound:', error);
      resolve(false);
    }
  });
}

export function isSoundSupported(): boolean {
  return 'AudioContext' in window || 'webkitAudioContext' in window;
}

// Vibration
export function vibrateDevice(pattern: number | number[] = [200, 100, 200]): boolean {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
      return true;
    } catch (error) {
      console.warn('Failed to vibrate device:', error);
    }
  }
  return false;
}

export function isVibrationSupported(): boolean {
  return 'vibrate' in navigator;
}

// Wake Lock
export async function requestWakeLock(): Promise<boolean> {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      
      wakeLock.addEventListener('release', () => {
        console.log('Wake lock was released');
        wakeLock = null;
      });
      
      console.log('Wake lock is active');
      return true;
    } catch (error) {
      console.warn('Failed to request wake lock:', error);
    }
  }
  return false;
}

export async function releaseWakeLock(): Promise<boolean> {
  if (wakeLock) {
    try {
      await wakeLock.release();
      wakeLock = null;
      console.log('Wake lock released');
      return true;
    } catch (error) {
      console.warn('Failed to release wake lock:', error);
    }
  }
  return false;
}

export function isWakeLockActive(): boolean {
  return wakeLock !== null && !wakeLock.released;
}

export function isWakeLockSupported(): boolean {
  return 'wakeLock' in navigator;
}

// Combined attention grabber
export async function grabAttention(options: AttentionOptions): Promise<void> {
  const promises: Promise<any>[] = [];
  
  // Badge
  if (options.badge !== undefined) {
    promises.push(setAppBadge(options.badge));
  }
  
  // Sound
  if (options.sound && isSoundSupported()) {
    promises.push(playAlertSound());
  }
  
  // Vibration
  if (options.vibration && isVibrationSupported()) {
    vibrateDevice();
  }
  
  // Wake lock
  if (options.wakeLock && isWakeLockSupported() && !isWakeLockActive()) {
    promises.push(requestWakeLock());
  }
  
  // Title blink
  if (options.titleBlink && options.badge === undefined) {
    startTitleBlink('⚠️ Timer Alert');
  }
  
  await Promise.allSettled(promises);
}

export function clearAttention(): void {
  clearAppBadge();
  stopTitleBlink();
}

// Visibility change handling
export function setupVisibilityChangeHandling() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // User returned to the app, clear attention grabbers
      clearAttention();
    }
  });
}

// Focus change handling
export function setupFocusChangeHandling() {
  window.addEventListener('focus', () => {
    clearAttention();
  });
  
  window.addEventListener('blur', () => {
    // App lost focus - could trigger attention if needed
  });
}