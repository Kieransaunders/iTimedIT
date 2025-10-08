import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";

const sounds = [
  "a-powerful-voice-declaring-you-shall-not-pass_v1.mp3",
  "a-loud-and-surprised-exclamation-of-great-scott_v4.mp3",
  "a-surprised-wizard-exclaiming-merlins-beard_v2.mp3",
  "the-sound-of-mischief-fading-away_v2.mp3",
  "a-woman-shouting-you-nailed-it_v4.mp3",
  "a-loud-voice-yelling-times-up-now_v1.mp3",
  "a-gentle-whoosh-followed-by-a-soft-heartbeat-like-pulse_v4.mp3",
  "a-gentle-whoosh-followed-by-a-soft-heartbeat-like-pulse_v3.mp3",
  "a-person-shouting-and-you-are-done_v3.mp3",
  "a-soft-mechanical-click-followed-by-a-gentle-ding-reminiscent-of-an-old-typewriter-bell-or-a-camera-shutter-finishing-its-motion-creating-a-nostalgic-and-satisfying-tactile-sound_v4.mp3",
  "two-playful-marimba-notes-ascending_v1.mp3",
  "a-crisp-wooden-tok-percussion-sound_v4.mp3",
  "a-crisp-wooden-tok-percussion-sound_v2.mp3",
  "a-gentle-uplifting-synth-melody-rising_v1.mp3",
  "a-sharp-and-abrupt-alert-sound_v2.mp3",
];

interface SoundSelectionModalProps {
  onSelect: (sound: string) => void;
  currentSound: string;
}

export function SoundSelectionModal({ onSelect, currentSound }: SoundSelectionModalProps) {
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const playSound = (sound: string) => {
    if (audio) {
      audio.pause();
    }
    const newAudio = new Audio(`/Sounds/${sound}`);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select a Sound</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {sounds.map((sound) => (
            <div key={sound} className="flex items-center justify-between">
              <span>{sound.replace(/_/g, " ").replace(".mp3", "")}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => playSound(sound)}>
                  Play
                </Button>
                <Button
                  variant={currentSound === sound ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSelect(sound)}
                >
                  {currentSound === sound ? "Selected" : "Select"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
