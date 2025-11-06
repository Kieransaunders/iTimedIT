// Sound Manager for Timer Alerts in React Native
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Built-in sound files
export const BUILT_IN_SOUNDS = [
  {
    id: 'powerful-voice',
    name: 'You Shall Not Pass',
    file: require('../assets/sounds/a-powerful-voice-declaring-you-shall-not-pass_v1.mp3'),
  },
  {
    id: 'great-scott',
    name: 'Great Scott!',
    file: require('../assets/sounds/a-loud-and-surprised-exclamation-of-great-scott_v4.mp3'),
  },
  {
    id: 'merlins-beard',
    name: "Merlin's Beard",
    file: require('../assets/sounds/a-surprised-wizard-exclaiming-merlins-beard_v2.mp3'),
  },
  {
    id: 'mischief',
    name: 'Mischief Fading Away',
    file: require('../assets/sounds/the-sound-of-mischief-fading-away_v2.mp3'),
  },
  {
    id: 'nailed-it',
    name: 'You Nailed It!',
    file: require('../assets/sounds/a-woman-shouting-you-nailed-it_v4.mp3'),
  },
  {
    id: 'times-up',
    name: "Time's Up Now",
    file: require('../assets/sounds/a-loud-voice-yelling-times-up-now_v1.mp3'),
  },
  {
    id: 'heartbeat-v4',
    name: 'Gentle Heartbeat Pulse (v4)',
    file: require('../assets/sounds/a-gentle-whoosh-followed-by-a-soft-heartbeat-like-pulse_v4.mp3'),
  },
  {
    id: 'heartbeat-v3',
    name: 'Gentle Heartbeat Pulse (v3)',
    file: require('../assets/sounds/a-gentle-whoosh-followed-by-a-soft-heartbeat-like-pulse_v3.mp3'),
  },
  {
    id: 'done',
    name: 'And You Are Done',
    file: require('../assets/sounds/a-person-shouting-and-you-are-done_v3.mp3'),
  },
  {
    id: 'typewriter',
    name: 'Typewriter Bell',
    file: require('../assets/sounds/a-soft-mechanical-click-followed-by-a-gentle-ding-reminiscent-of-an-old-typewriter-bell-or-a-camera-shutter-finishing-its-motion-creating-a-nostalgic-and-satisfying-tactile-sound_v4.mp3'),
  },
  {
    id: 'marimba',
    name: 'Playful Marimba',
    file: require('../assets/sounds/two-playful-marimba-notes-ascending_v1.mp3'),
  },
  {
    id: 'tok-v4',
    name: 'Wooden Tok (v4)',
    file: require('../assets/sounds/a-crisp-wooden-tok-percussion-sound_v4.mp3'),
  },
  {
    id: 'tok-v2',
    name: 'Wooden Tok (v2)',
    file: require('../assets/sounds/a-crisp-wooden-tok-percussion-sound_v2.mp3'),
  },
  {
    id: 'synth-rising',
    name: 'Uplifting Synth Melody',
    file: require('../assets/sounds/a-gentle-uplifting-synth-melody-rising_v1.mp3'),
  },
  {
    id: 'alert',
    name: 'Sharp Alert',
    file: require('../assets/sounds/a-sharp-and-abrupt-alert-sound_v2.mp3'),
  },
];

const STORAGE_KEY = '@sound_preferences';
const CUSTOM_SOUNDS_KEY = '@custom_sounds';
const CUSTOM_SOUNDS_DIR = `${FileSystem.documentDirectory}sounds/`;

export interface SoundPreferences {
  enabled: boolean;
  timerAlertSound: string; // Used for both interrupts and break start
  breakEndSound: string;   // Only used when Pomodoro is enabled
  overrunSound: string;    // Used for budget overrun alerts
}

export interface CustomSound {
  id: string;
  name: string;
  uri: string;
}

class SoundManager {
  private player: AudioPlayer | null = null;
  private preferences: SoundPreferences = {
    enabled: true,
    timerAlertSound: 'times-up',
    breakEndSound: 'nailed-it',
    overrunSound: 'alert',
  };
  private customSounds: CustomSound[] = [];

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // Set audio mode for proper playback
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionModeAndroid: 'duckOthers',
      });

      // Create custom sounds directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(CUSTOM_SOUNDS_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CUSTOM_SOUNDS_DIR, { intermediates: true });
      }

      // Load preferences and custom sounds
      await this.loadPreferences();
      await this.loadCustomSounds();
    } catch (error) {
      console.error('Failed to initialize SoundManager:', error);
    }
  }

  // Load preferences from storage
  async loadPreferences(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);

        // Migrate from old format (breakStartSound + interruptSound) to new format (timerAlertSound)
        if ('breakStartSound' in parsed || 'interruptSound' in parsed) {
          this.preferences = {
            enabled: parsed.enabled ?? true,
            timerAlertSound: parsed.interruptSound || parsed.breakStartSound || 'times-up',
            breakEndSound: parsed.breakEndSound || 'nailed-it',
            overrunSound: parsed.overrunSound || 'alert',
          };
          // Save migrated preferences
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
        } else {
          this.preferences = parsed;
        }
      }
    } catch (error) {
      console.error('Failed to load sound preferences:', error);
    }
  }

  // Save preferences to storage
  async savePreferences(preferences: Partial<SoundPreferences>): Promise<void> {
    try {
      this.preferences = { ...this.preferences, ...preferences };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Failed to save sound preferences:', error);
    }
  }

  // Get current preferences
  getPreferences(): SoundPreferences {
    return { ...this.preferences };
  }

  // Load custom sounds from storage
  async loadCustomSounds(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(CUSTOM_SOUNDS_KEY);
      if (stored) {
        this.customSounds = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load custom sounds:', error);
    }
  }

  // Save custom sounds to storage
  private async saveCustomSounds(): Promise<void> {
    try {
      await AsyncStorage.setItem(CUSTOM_SOUNDS_KEY, JSON.stringify(this.customSounds));
    } catch (error) {
      console.error('Failed to save custom sounds:', error);
    }
  }

  // Get all custom sounds
  getCustomSounds(): CustomSound[] {
    return [...this.customSounds];
  }

  // Add a custom sound file
  async addCustomSound(uri: string, name: string): Promise<string> {
    try {
      const id = `custom-${Date.now()}`;
      // Safely extract file extension (avoid Hermes string operation bugs)
      let fileExtension = 'mp3';
      try {
        const match = uri.match(/\.([^.]+)$/);
        if (match && match[1]) {
          fileExtension = match[1];
        }
      } catch (error) {
        console.warn('Failed to extract file extension, using default:', error);
      }
      const newUri = `${CUSTOM_SOUNDS_DIR}${id}.${fileExtension}`;

      // Copy file to app's document directory
      await FileSystem.copyAsync({
        from: uri,
        to: newUri,
      });

      // Add to custom sounds list
      const customSound: CustomSound = { id, name, uri: newUri };
      this.customSounds.push(customSound);
      await this.saveCustomSounds();

      return id;
    } catch (error) {
      console.error('Failed to add custom sound:', error);
      throw error;
    }
  }

  // Delete a custom sound
  async deleteCustomSound(id: string): Promise<void> {
    try {
      const sound = this.customSounds.find(s => s.id === id);
      if (!sound) return;

      // Delete file
      await FileSystem.deleteAsync(sound.uri, { idempotent: true });

      // Remove from list
      this.customSounds = this.customSounds.filter(s => s.id !== id);
      await this.saveCustomSounds();

      // If this sound was selected in preferences, reset to default
      const prefs = this.getPreferences();
      const updates: Partial<SoundPreferences> = {};
      if (prefs.timerAlertSound === id) updates.timerAlertSound = 'times-up';
      if (prefs.breakEndSound === id) updates.breakEndSound = 'nailed-it';
      if (prefs.overrunSound === id) updates.overrunSound = 'alert';

      if (Object.keys(updates).length > 0) {
        await this.savePreferences(updates);
      }
    } catch (error) {
      console.error('Failed to delete custom sound:', error);
      throw error;
    }
  }

  // Get sound source by ID (built-in or custom)
  private getSoundSource(soundId: string): number | string | null {
    // Check built-in sounds
    const builtIn = BUILT_IN_SOUNDS.find(s => s.id === soundId);
    if (builtIn) return builtIn.file;

    // Check custom sounds
    const custom = this.customSounds.find(s => s.id === soundId);
    if (custom) return custom.uri;

    return null;
  }

  // Play a sound by ID
  async playSound(soundId: string): Promise<void> {
    if (!this.preferences.enabled) return;

    try {
      // Remove previous player
      if (this.player) {
        this.player.remove();
        this.player = null;
      }

      const source = this.getSoundSource(soundId);
      if (!source) {
        console.warn(`Sound not found: ${soundId}`);
        return;
      }

      // Create new audio player
      this.player = createAudioPlayer(
        typeof source === 'string' ? { uri: source } : source
      );

      // Play the sound
      this.player.play();

      // Listen for playback completion to auto-cleanup
      this.player.addListener('playbackStatusUpdate', (status) => {
        if (status.isLoaded && status.didJustFinish) {
          if (this.player) {
            this.player.remove();
            this.player = null;
          }
        }
      });
    } catch (error) {
      console.error('Failed to play sound:', error);
    }
  }

  // Play break start sound (uses timer alert sound)
  async playBreakStart(): Promise<void> {
    await this.playSound(this.preferences.timerAlertSound);
  }

  // Play break end sound
  async playBreakEnd(): Promise<void> {
    await this.playSound(this.preferences.breakEndSound);
  }

  // Play interrupt sound (uses timer alert sound)
  async playInterrupt(): Promise<void> {
    await this.playSound(this.preferences.timerAlertSound);
  }

  // Play overrun sound
  async playOverrun(): Promise<void> {
    await this.playSound(this.preferences.overrunSound);
  }

  // Enable/disable all sounds
  async setSoundEnabled(enabled: boolean): Promise<void> {
    await this.savePreferences({ enabled });
  }

  // Check if sounds are enabled
  isSoundEnabled(): boolean {
    return this.preferences.enabled;
  }

  // Cleanup
  async cleanup(): Promise<void> {
    if (this.player) {
      this.player.remove();
      this.player = null;
    }
  }
}

// Lazy singleton instance to prevent Hermes crash during module load in release builds
let _soundManager: SoundManager | null = null;

function getSoundManager(): SoundManager {
  if (!_soundManager) {
    try {
      _soundManager = new SoundManager();
    } catch (error) {
      console.error("Failed to initialize SoundManager:", error);
      throw error;
    }
  }
  return _soundManager;
}

// Create singleton instance (lazy-loaded)
export const soundManager = getSoundManager();

// Export convenience functions (lazy-loaded)
export const playBreakStartSound = () => getSoundManager().playBreakStart();
export const playBreakEndSound = () => getSoundManager().playBreakEnd();
export const playInterruptSound = () => getSoundManager().playInterrupt();
export const playOverrunSound = () => getSoundManager().playOverrun();
export const playTestSound = (soundId: string) => getSoundManager().playSound(soundId);
