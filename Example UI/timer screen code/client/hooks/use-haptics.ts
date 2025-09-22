import { useCallback } from "react";

export function useHaptics() {
  const impact = useCallback((pattern: number | number[] = 15) => {
    try {
      if (navigator && "vibrate" in navigator) {
        // @ts-expect-error - vibrate may not exist in all browsers
        navigator.vibrate(pattern);
      }
    } catch {}
  }, []);

  const success = useCallback(() => impact([10, 20, 10]), [impact]);
  const warning = useCallback(() => impact([30, 30, 30]), [impact]);
  const light = useCallback(() => impact(10), [impact]);

  return { impact, success, warning, light };
}
