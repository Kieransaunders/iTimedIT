import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
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

  const playSound = (filename: string) => {
    if (audio) {
      audio.pause();
    }
    const newAudio = new Audio(`/Sounds/${filename}`);
    setAudio(newAudio);
    newAudio.play().catch((error) => {
      console.error('Failed to play sound:', error);
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Change Sound</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select a Sound</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto pr-2">
          {sounds.map((sound) => (
            <div key={sound.filename} className="flex items-center justify-between">
              <span className="text-sm flex-1 mr-2">{sound.displayName}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={() => playSound(sound.filename)}>
                  Play
                </Button>
                <Button
                  variant={currentSound === sound.filename ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSelect(sound.filename)}
                >
                  {currentSound === sound.filename ? "Selected" : "Select"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
