// Dynamic favicon generation with timer visualization

export type FaviconState = 'normal' | 'warning' | 'interrupt';

interface FaviconOptions {
  progress?: number; // 0-1 for circular progress
  state?: FaviconState;
  text?: string; // Optional text overlay (e.g., countdown seconds)
}

let originalFavicon: string | null = null;
let faviconLink: HTMLLinkElement | null = null;

// Initialize and cache the original favicon
function initializeFavicon(): void {
  if (faviconLink) return;

  // Find existing favicon link or create one
  faviconLink = document.querySelector('link[rel*="icon"]');

  if (!faviconLink) {
    faviconLink = document.createElement('link');
    faviconLink.rel = 'icon';
    document.head.appendChild(faviconLink);
  }

  // Store original href
  if (faviconLink.href && !originalFavicon) {
    originalFavicon = faviconLink.href;
  }
}

// Get color based on state
function getStateColor(state: FaviconState): string {
  switch (state) {
    case 'normal':
      return '#22c55e'; // green
    case 'warning':
      return '#f59e0b'; // orange
    case 'interrupt':
      return '#ef4444'; // red
    default:
      return '#8b5cf6'; // purple (default)
  }
}

// Generate favicon with timer visualization
export function generateTimerFavicon(options: FaviconOptions): string {
  const canvas = document.createElement('canvas');
  const size = 32;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return '';
  }

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 2;

  // Clear canvas
  ctx.clearRect(0, 0, size, size);

  // Background circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.fillStyle = '#1f2937'; // dark gray background
  ctx.fill();

  // Progress arc
  if (options.progress !== undefined && options.progress > 0) {
    const startAngle = -Math.PI / 2; // Start at top
    const endAngle = startAngle + (2 * Math.PI * options.progress);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 2, startAngle, endAngle);
    ctx.strokeStyle = getStateColor(options.state || 'normal');
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();
  } else {
    // Full circle for timer without known end time
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 2, 0, 2 * Math.PI);
    ctx.strokeStyle = getStateColor(options.state || 'normal');
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Optional text overlay
  if (options.text) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(options.text, centerX, centerY);
  }

  return canvas.toDataURL('image/png');
}

// Update the favicon
export function updateFavicon(dataUrl: string): void {
  initializeFavicon();

  if (faviconLink) {
    faviconLink.href = dataUrl;
  }
}

// Reset to original favicon
export function resetFavicon(): void {
  initializeFavicon();

  if (faviconLink && originalFavicon) {
    faviconLink.href = originalFavicon;
  }
}

// Update timer favicon with current state
export interface TimerFaviconOptions {
  elapsedMs: number;
  totalMs?: number; // For progress calculation (optional)
  state: FaviconState;
  showSeconds?: boolean; // Show countdown seconds for interrupts
  secondsLeft?: number;
}

export function updateTimerFavicon(options: TimerFaviconOptions): void {
  let progress: number | undefined;
  let text: string | undefined;

  // Calculate progress if total time is known
  if (options.totalMs && options.totalMs > 0) {
    progress = Math.min(1, options.elapsedMs / options.totalMs);
  }

  // Show countdown seconds for interrupts
  if (options.showSeconds && options.secondsLeft !== undefined) {
    if (options.secondsLeft < 60) {
      text = options.secondsLeft.toString();
    }
  }

  const dataUrl = generateTimerFavicon({
    progress,
    state: options.state,
    text,
  });

  updateFavicon(dataUrl);
}

// Clear timer favicon and restore original
export function clearTimerFavicon(): void {
  resetFavicon();
}
