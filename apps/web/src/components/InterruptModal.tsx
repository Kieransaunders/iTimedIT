import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useState } from "react";

interface InterruptModalProps {
  projectName: string;
  onClose: () => void;
  gracePeriod: number;
}

export function InterruptModal({ projectName, onClose, gracePeriod }: InterruptModalProps) {
  const [countdown, setCountdown] = useState(gracePeriod);
  const ackInterrupt = useMutation(api.timer.ackInterrupt);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Auto-stop after grace period
          handleStop();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gracePeriod]);

  const handleContinue = async () => {
    await ackInterrupt({ continue: true });
    onClose();
  };

  const handleStop = async () => {
    await ackInterrupt({ continue: false });
    onClose();
  };

  return (
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div class="text-center">
          <div class="text-4xl mb-4">⏰</div>
          <h2 class="text-xl font-semibold mb-4">
            Still working on <span class="text-blue-600">{projectName}</span>?
          </h2>
          <p class="text-gray-600 mb-6">
            We noticed you've been working for a while. Are you still actively working on this project?
          </p>
          
          <div class="mb-6">
            <div class="text-sm text-gray-500 mb-2">
              Auto-stop in {countdown} seconds
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div 
                class="bg-red-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${((gracePeriod - countdown) / gracePeriod) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleContinue}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Yes, Continue
            </button>
            <button
              onClick={handleStop}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              Stop Timer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
