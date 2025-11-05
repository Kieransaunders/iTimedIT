import React, { useRef, useImperativeHandle } from "react";
import ConfettiCannon from "react-native-confetti-cannon";
import { heavyTap } from "./haptics";

/**
 * Celebration handle for imperative API
 */
export interface CelebrationHandle {
  celebrate: () => void;
}

/**
 * Props for CelebrationComponent
 */
export interface CelebrationComponentProps {
  colors?: string[];
  count?: number;
  duration?: number;
  explosionSpeed?: number;
}

/**
 * Celebration Component
 *
 * Displays confetti cannon with haptic feedback for celebrations
 * Use with ref to trigger celebrations imperatively
 *
 * @example
 * const celebrationRef = useRef<CelebrationHandle>(null);
 * celebrationRef.current?.celebrate();
 */
export const CelebrationComponent = React.forwardRef<CelebrationHandle, CelebrationComponentProps>(
  ({ colors, count = 100, duration = 2000, explosionSpeed = 350 }, ref) => {
    const confettiRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      celebrate: () => {
        // Trigger haptic feedback
        heavyTap();
        // Trigger confetti
        if (confettiRef.current) {
          confettiRef.current.start();
        }
      },
    }));

    return (
      <ConfettiCannon
        ref={confettiRef}
        count={count}
        origin={{ x: -10, y: 0 }}
        autoStart={false}
        fadeOut={true}
        explosionSpeed={explosionSpeed}
        fallSpeed={2000}
        colors={colors || ["#a855f7", "#ec4899", "#f59e0b", "#22c55e", "#3b82f6"]}
      />
    );
  }
);

CelebrationComponent.displayName = "CelebrationComponent";

/**
 * Trigger a celebration with confetti and haptic feedback
 *
 * This is a simpler alternative to using CelebrationComponent with a ref.
 * Note: This only triggers haptics since confetti requires a component.
 */
export function triggerCelebration(): void {
  heavyTap();
}
