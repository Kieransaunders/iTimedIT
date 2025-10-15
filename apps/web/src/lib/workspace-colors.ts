export interface WorkspaceColor {
  name: string;
  value: string;
  emoji?: string;
}

export const WORKSPACE_COLORS: WorkspaceColor[] = [
  { name: "Lavender", value: "#8b5cf6", emoji: "💜" },
  { name: "Ocean", value: "#06b6d4", emoji: "🌊" },
  { name: "Forest", value: "#22c55e", emoji: "🌲" },
  { name: "Sunset", value: "#f59e0b", emoji: "🌅" },
  { name: "Ruby", value: "#ef4444", emoji: "💎" },
  { name: "Sky", value: "#3b82f6", emoji: "☁️" },
  { name: "Tangerine", value: "#f97316", emoji: "🍊" },
  { name: "Rose", value: "#ec4899", emoji: "🌹" },
];

export const DEFAULT_WORKSPACE_COLOR = WORKSPACE_COLORS[0].value;

export function getColorName(hexValue: string): string {
  const color = WORKSPACE_COLORS.find(c => c.value.toLowerCase() === hexValue.toLowerCase());
  return color?.name ?? "Custom";
}

export function getColorEmoji(hexValue: string): string | undefined {
  const color = WORKSPACE_COLORS.find(c => c.value.toLowerCase() === hexValue.toLowerCase());
  return color?.emoji;
}
