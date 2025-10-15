import { WORKSPACE_COLORS, type WorkspaceColor } from "../../lib/workspace-colors";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  helpText?: string;
  showCustomInput?: boolean;
}

export function ColorPicker({
  value,
  onChange,
  label = "Color",
  helpText = "Pick a color to help identify your workspace",
  showCustomInput = true,
}: ColorPickerProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
        {label}
      </label>
      <div className="flex items-center gap-3 flex-wrap">
        {/* Color swatch buttons */}
        <div className="flex gap-2">
          {WORKSPACE_COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => onChange(color.value)}
              className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 relative ${
                value === color.value
                  ? 'border-gray-900 dark:border-white ring-2 ring-offset-2 ring-gray-900 dark:ring-white'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              style={{ backgroundColor: color.value }}
              title={`${color.name} ${color.emoji || ''}`}
            >
              {value === color.value && (
                <span className="absolute inset-0 flex items-center justify-center text-white text-lg">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Custom color inputs */}
        {showCustomInput && (
          <>
            <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-10 h-10 rounded border border-gray-300 dark:border-gray-700 cursor-pointer"
              title="Custom color picker"
            />
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#8b5cf6"
              className="px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary w-28"
            />
          </>
        )}
      </div>
      {helpText && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {helpText}
        </p>
      )}
    </div>
  );
}
