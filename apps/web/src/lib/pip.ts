// Picture-in-Picture utilities for floating timer display

let pipWindow: Window | null = null;
let pipVideo: HTMLVideoElement | null = null;
let pipCanvas: HTMLCanvasElement | null = null;
let pipAnimationFrame: number | null = null;

export interface PiPTimerState {
  elapsedMs: number;
  projectName: string;
  clientName?: string;
  isRunning: boolean;
  isInterrupt?: boolean;
  interruptSecondsLeft?: number;
  isBudgetWarning?: boolean;
  isBudgetOverrun?: boolean;
  projectColor?: string;
  isBreakTimer?: boolean;
  breakTimeRemaining?: number;
}

/**
 * Check if Picture-in-Picture is supported by the browser
 */
export function isPiPSupported(): boolean {
  return (
    document.pictureInPictureEnabled &&
    'requestPictureInPicture' in HTMLVideoElement.prototype
  );
}

/**
 * Format milliseconds to HH:MM:SS or MM:SS
 */
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Draw timer state to canvas
 */
function drawTimerToCanvas(ctx: CanvasRenderingContext2D, state: PiPTimerState) {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Determine background color based on state
  let bgColor = '#1a1a1a'; // dark background
  if (state.isBreakTimer) {
    bgColor = '#10b981'; // green for break timer
  } else if (state.isInterrupt) {
    bgColor = '#dc2626'; // red for interrupt
  } else if (state.isBudgetOverrun) {
    bgColor = '#dc2626'; // red for overrun
  } else if (state.isBudgetWarning) {
    bgColor = '#f59e0b'; // amber for warning
  } else if (state.projectColor) {
    bgColor = state.projectColor;
  }

  // Draw background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Draw timer text
  // Use break time remaining if in break mode, otherwise use elapsed time
  const timeStr = state.isBreakTimer && state.breakTimeRemaining !== undefined
    ? formatTime(state.breakTimeRemaining)
    : formatTime(state.elapsedMs);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 120px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(timeStr, width / 2, height / 2 - 30);

  // Draw project name
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(state.projectName, width / 2, height / 2 + 60);

  // Draw client name if available
  if (state.clientName) {
    ctx.font = '20px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`– ${state.clientName}`, width / 2, height / 2 + 90);
  }

  // Draw status text
  if (state.isBreakTimer) {
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('☕ Break Time!', width / 2, height / 2 + 130);
  } else if (state.isInterrupt && state.interruptSecondsLeft !== undefined) {
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#ffffff';
    const minutes = Math.floor(state.interruptSecondsLeft / 60);
    const seconds = state.interruptSecondsLeft % 60;
    const countdown = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    ctx.fillText(`⚠️ Respond in ${countdown}`, width / 2, height / 2 + 130);
  } else if (state.isBudgetOverrun) {
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('⚠️ Budget Exceeded', width / 2, height / 2 + 130);
  } else if (state.isBudgetWarning) {
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('⚠️ Approaching Budget Limit', width / 2, height / 2 + 130);
  } else if (!state.isRunning) {
    ctx.font = '20px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('Timer Stopped', width / 2, height / 2 + 130);
  }

  // Draw iTimedIT branding
  ctx.font = '16px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText('iTimedIT', width / 2, height - 20);
}

/**
 * Animation loop to update canvas
 */
function animatePiP(state: PiPTimerState) {
  if (!pipCanvas) return;

  const ctx = pipCanvas.getContext('2d');
  if (!ctx) return;

  drawTimerToCanvas(ctx, state);
}

/**
 * Open Picture-in-Picture window with timer
 */
export async function openPiPTimer(initialState: PiPTimerState): Promise<boolean> {
  if (!isPiPSupported()) {
    console.warn('Picture-in-Picture is not supported');
    return false;
  }

  try {
    // Create canvas element
    pipCanvas = document.createElement('canvas');
    pipCanvas.width = 640;
    pipCanvas.height = 360;

    // Draw initial state
    const ctx = pipCanvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to get canvas context');
      return false;
    }
    drawTimerToCanvas(ctx, initialState);

    // Create video element
    pipVideo = document.createElement('video');
    pipVideo.muted = true;
    pipVideo.playsInline = true;
    pipVideo.autoplay = true;

    // Capture canvas stream
    const stream = pipCanvas.captureStream(30); // 30 FPS
    pipVideo.srcObject = stream;

    // Wait for video to be ready
    await pipVideo.play();

    // Request Picture-in-Picture
    pipWindow = await pipVideo.requestPictureInPicture();

    // Handle PiP close
    pipVideo.addEventListener('leavepictureinpicture', () => {
      closePiPTimer();
    });

    console.log('Picture-in-Picture timer opened');
    return true;
  } catch (error) {
    console.error('Failed to open Picture-in-Picture:', error);
    closePiPTimer();
    return false;
  }
}

/**
 * Update timer state in PiP window
 */
export function updatePiPTimer(state: PiPTimerState): void {
  if (!pipCanvas || !pipWindow) {
    return;
  }

  animatePiP(state);
}

/**
 * Close Picture-in-Picture window
 */
export function closePiPTimer(): void {
  if (pipAnimationFrame !== null) {
    cancelAnimationFrame(pipAnimationFrame);
    pipAnimationFrame = null;
  }

  if (document.pictureInPictureElement) {
    document.exitPictureInPicture().catch(console.error);
  }

  if (pipVideo) {
    pipVideo.srcObject = null;
    pipVideo = null;
  }

  pipCanvas = null;
  pipWindow = null;

  console.log('Picture-in-Picture timer closed');
}

/**
 * Check if PiP is currently active
 */
export function isPiPActive(): boolean {
  return pipWindow !== null && document.pictureInPictureElement !== null;
}
