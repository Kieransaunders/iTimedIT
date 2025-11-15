/**
 * PictureInPictureTimer - Floating timer window component
 *
 * Provides a button to open/close a Picture-in-Picture window with the running timer.
 * The PiP window stays on top of all applications, making it easy to see the timer
 * when working in other apps (Word, Excel, etc.).
 */

import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Maximize2, Minimize2 } from "lucide-react";
import {
  isPiPSupported,
  isPiPActive,
  openPiPTimer,
  closePiPTimer,
  updatePiPTimer,
  type PiPTimerState
} from "../lib/pip";
import { toast } from "sonner";

interface PictureInPictureTimerProps {
  timerState: PiPTimerState;
  disabled?: boolean;
}

export function PictureInPictureTimer({ timerState, disabled }: PictureInPictureTimerProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);

  // Check browser support on mount
  useEffect(() => {
    setIsSupported(isPiPSupported());
  }, []);

  // Update PiP window when timer state changes
  useEffect(() => {
    if (isActive) {
      updatePiPTimer(timerState);
    }
  }, [
    isActive,
    timerState.isBreakTimer,
    timerState.breakTimeRemaining,
    timerState.elapsedMs,
    timerState.isRunning,
    timerState.isInterrupt,
    timerState
  ]);

  // Check if PiP is still active (user might close it externally)
  useEffect(() => {
    const checkInterval = setInterval(() => {
      setIsActive(isPiPActive());
    }, 1000);

    return () => clearInterval(checkInterval);
  }, []);

  const handleTogglePiP = async () => {
    if (isActive) {
      // Close PiP
      closePiPTimer();
      setIsActive(false);
      toast.info("Floating timer closed");
    } else {
      // Open PiP
      const success = await openPiPTimer(timerState);
      if (success) {
        setIsActive(true);
        toast.success("Floating timer opened - stays on top of all windows!");
      } else {
        toast.error("Failed to open floating timer. Your browser might not support this feature.");
      }
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleTogglePiP}
      disabled={disabled || !isSupported}
      className="gap-2"
      title={
        !isSupported
          ? "Picture-in-Picture not supported in your browser"
          : isActive
            ? "Close floating timer"
            : "Open floating timer window"
      }
    >
      {isActive ? (
        <>
          <Minimize2 className="w-4 h-4" />
          Close Float
        </>
      ) : (
        <>
          <Maximize2 className="w-4 h-4" />
          Float Timer
          {!isSupported && <span className="text-xs ml-1">(Not supported)</span>}
        </>
      )}
    </Button>
  );
}
