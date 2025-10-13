import { useEffect, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";

const sounds: { filename: string; displayName: string }[] = [
  { filename: "a-powerful-voice-declaring-you-shall-not-pass_v1.mp3", displayName: "You Shall Not Pass" },
  { filename: "a-loud-and-surprised-exclamation-of-great-scott_v4.mp3", displayName: "Great Scott!" },
  { filename: "a-surprised-wizard-exclaiming-merlins-beard_v2.mp3", displayName: "Merlin's Beard" },
  { filename: "the-sound-of-mischief-fading-away_v2.mp3", displayName: "Mischief Fading" },
  { filename: "a-woman-shouting-you-nailed-it_v4.mp3", displayName: "You Nailed It!" },
  { filename: "a-loud-voice-yelling-times-up-now_v1.mp3", displayName: "Time's Up Now" },
  { filename: "a-gentle-whoosh-followed-by-a-soft-heartbeat-like-pulse_v4.mp3", displayName: "Gentle Whoosh 2" },
  { filename: "a-gentle-whoosh-followed-by-a-soft-heartbeat-like-pulse_v3.mp3", displayName: "Gentle Whoosh 1" },
  { filename: "a-person-shouting-and-you-are-done_v3.mp3", displayName: "And You're Done!" },
  { filename: "a-soft-mechanical-click-followed-by-a-gentle-ding-reminiscent-of-an-old-typewriter-bell-or-a-camera-shutter-finishing-its-motion-creating-a-nostalgic-and-satisfying-tactile-sound_v4.mp3", displayName: "Soft Click" },
  { filename: "two-playful-marimba-notes-ascending_v1.mp3", displayName: "Marimba Notes" },
  { filename: "a-crisp-wooden-tok-percussion-sound_v4.mp3", displayName: "Wooden Tok 2" },
  { filename: "a-crisp-wooden-tok-percussion-sound_v2.mp3", displayName: "Wooden Tok 1" },
  { filename: "a-gentle-uplifting-synth-melody-rising_v1.mp3", displayName: "Uplifting Synth" },
  { filename: "a-sharp-and-abrupt-alert-sound_v2.mp3", displayName: "Sharp Alert" },
];

interface SoundSelectionModalProps {
  onSelect: (sound: string) => void;
  currentSound: string;
}

export function SoundSelectionModal({ onSelect, currentSound }: SoundSelectionModalProps) {
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const stopAudio = () => {
    setAudio((current) => {
      if (current) {
        current.pause();
        current.currentTime = 0;
      }
      return null;
    });
  };

  const playSound = (filename: string) => {
    stopAudio();
    const newAudio = new Audio(`/Sounds/${filename}`);
    newAudio.play().catch((error) => {
      console.error("Failed to play sound:", error);
      stopAudio();
    });
    newAudio.addEventListener("ended", stopAudio, { once: true });
    setAudio(newAudio);
  };

  const handleSelect = (filename: string) => {
    stopAudio();
    onSelect(filename);
  };

  useEffect(() => {
    if (!isOpen) {
      stopAudio();
    }

    return () => {
      stopAudio();
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Change Sound</Button>
      </DialogTrigger>
      <DialogContent className="flex h-full max-h-[90vh] w-[min(100vw-2rem,32rem)] flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 text-left">
          <DialogTitle className="text-lg">Select a Sound</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="grid gap-3">
            {sounds.map((sound) => (
              <div
                key={sound.filename}
                className="rounded-lg border border-border bg-muted/30 p-4 transition hover:border-primary/50"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-foreground">{sound.displayName}</span>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" size="sm" onClick={() => playSound(sound.filename)}>
                      Play
                    </Button>
                    <DialogClose asChild>
                      <Button
                        variant={currentSound === sound.filename ? "default" : "secondary"}
                        size="sm"
                        onClick={() => handleSelect(sound.filename)}
                      >
                        {currentSound === sound.filename ? "Selected" : "Select"}
                      </Button>
                    </DialogClose>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter className="border-t border-border bg-muted/20 px-6 py-4">
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              Done
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
