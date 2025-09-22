import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatMMSS } from "@/lib/format";
import { useEffect } from "react";

interface SmartInterruptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  projectName: string;
  hourlyRate: number;
  elapsedMs: number;
  onContinue: () => void;
  onStop: () => void;
  onSwitch: () => void;
  autoDismissMs?: number;
}

export function SmartInterruptionDialog({
  open,
  onOpenChange,
  clientName,
  projectName,
  hourlyRate,
  elapsedMs,
  onContinue,
  onStop,
  onSwitch,
  autoDismissMs = 60000,
}: SmartInterruptionDialogProps) {
  const seconds = Math.floor(elapsedMs / 1000);
  const cost = (seconds * hourlyRate) / 3600;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} aria-describedby={undefined}>
        <AutoDismiss onDismiss={onContinue} open={open} ms={autoDismissMs} />
        <DialogHeader>
          <DialogTitle>Still working on {clientName} – {projectName}?</DialogTitle>
          <DialogDescription>
            Current session: <span className="font-medium text-foreground">{formatMMSS(elapsedMs)}</span> · Cost so far: <span className="font-medium text-foreground">{formatCurrency(cost)}</span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2">
          <div className="grid w-full gap-2 sm:grid-cols-3">
            <Button className="sm:col-span-1" onClick={onContinue} autoFocus>
              Yes, continue
            </Button>
            <Button variant="secondary" className="sm:col-span-1" onClick={onStop}>
              Done, stop timer
            </Button>
            <Button variant="outline" className="sm:col-span-1" onClick={onSwitch}>
              Switch task
            </Button>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="mx-auto mt-2 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            aria-label="Snooze for 5 minutes"
          >
            Snooze 5 minutes
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AutoDismiss({ open, ms, onDismiss }: { open: boolean; ms: number; onDismiss: () => void }) {
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(onDismiss, ms);
    return () => window.clearTimeout(id);
  }, [open, ms, onDismiss]);
  return null;
}
