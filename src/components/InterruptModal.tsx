import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useState } from "react";

interface InterruptModalProps {
  projectName: string;
  onClose: () => void;
}

export function InterruptModal({ projectName, onClose }: InterruptModalProps) {
  const [countdown, setCountdown] = useState(60);
  const ackInterrupt = useMutation(api.timer.ackInterrupt);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Auto-stop after 60 seconds
          handleStop();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleContinue = async () => {
    await ackInterrupt({ continue: true });
    onClose();
  };

  const handleStop = async () => {
    await ackInterrupt({ continue: false });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="text-4xl mb-4">⏰</div>
          <h2 className="text-xl font-semibold mb-4">
            Still working on <span className="text-blue-600">{projectName}</span>?
          </h2>
          <p className="text-gray-600 mb-6">
            We noticed you've been working for a while. Are you still actively working on this project?
          </p>
          
          <div className="mb-6">
            <div className="text-sm text-gray-500 mb-2">
              Auto-stop in {countdown} seconds
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${((60 - countdown) / 60) * 100}%` }}
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
