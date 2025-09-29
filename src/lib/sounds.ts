// Sound utility for Pomodoro timer notifications

class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled = false;

  constructor() {
    // Initialize audio context on user interaction
    this.initializeAudioContext();
  }

  private initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Audio context not supported:', error);
    }
  }

  public enable() {
    this.enabled = true;
    // Resume audio context if it was suspended
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public disable() {
    this.enabled = false;
  }

  public isEnabled() {
    return this.enabled && this.audioContext && this.audioContext.state === 'running';
  }

  // Create a gentle bell sound for break notifications
  private createBellSound(frequency: number = 800, duration: number = 0.5) {
    if (!this.audioContext || !this.enabled) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    oscillator.type = 'sine';

    // Create a gentle envelope
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // Play break start sound - gentle chime
  public playBreakStart() {
    if (!this.isEnabled()) return;
    
    // Two gentle tones
    this.createBellSound(600, 0.4);
    setTimeout(() => this.createBellSound(800, 0.4), 150);
  }

  // Play break end sound - more upbeat
  public playBreakEnd() {
    if (!this.isEnabled()) return;
    
    // Three ascending tones
    this.createBellSound(600, 0.3);
    setTimeout(() => this.createBellSound(800, 0.3), 100);
    setTimeout(() => this.createBellSound(1000, 0.4), 200);
  }

  // Play cycle complete sound - celebratory
  public playCycleComplete() {
    if (!this.isEnabled()) return;
    
    // Success chord progression
    const notes = [523, 659, 784, 1047]; // C, E, G, C (major chord)
    notes.forEach((freq, index) => {
      setTimeout(() => this.createBellSound(freq, 0.6), index * 100);
    });
  }

  // Test sound to check if audio is working
  public playTestSound() {
    if (!this.audioContext) {
      this.initializeAudioContext();
    }
    
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
    
    this.enabled = true;
    this.createBellSound(800, 0.3);
  }
}

// Create singleton instance
export const soundManager = new SoundManager();

// Helper functions for easier usage
export const enableSounds = () => soundManager.enable();
export const disableSounds = () => soundManager.disable();
export const isSoundEnabled = () => soundManager.isEnabled();
export const playBreakStartSound = () => soundManager.playBreakStart();
export const playBreakEndSound = () => soundManager.playBreakEnd();
export const playCycleCompleteSound = () => soundManager.playCycleComplete();
export const playTestSound = () => soundManager.playTestSound();