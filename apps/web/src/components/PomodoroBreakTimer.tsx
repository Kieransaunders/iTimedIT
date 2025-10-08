import { useMemo } from "react";
import { Coffee, Clock, ArrowRight } from "lucide-react";

interface PomodoroBreakTimerProps {
  breakTimeRemaining: number;
  totalBreakTimeMs: number;
  onEndEarly: () => void;
}

const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const breakActivities = [
  { icon: "🚶", text: "Take a short walk" },
  { icon: "💧", text: "Drink some water" },
  { icon: "👁️", text: "Look away from screen" },
  { icon: "🧘", text: "Do some deep breathing" },
  { icon: "🤸", text: "Stretch your body" },
  { icon: "🌱", text: "Step outside for fresh air" },
];

export function PomodoroBreakTimer({ 
  breakTimeRemaining, 
  totalBreakTimeMs, 
  onEndEarly 
}: PomodoroBreakTimerProps) {
  const progressPercentage = useMemo(() => {
    if (totalBreakTimeMs === 0) return 0;
    return Math.max(0, Math.min(100, ((totalBreakTimeMs - breakTimeRemaining) / totalBreakTimeMs) * 100));
  }, [breakTimeRemaining, totalBreakTimeMs]);

  const suggestedActivity = useMemo(() => {
    const index = Math.floor(Date.now() / (60 * 1000)) % breakActivities.length;
    return breakActivities[index];
  }, []);

  const isAlmostDone = breakTimeRemaining < 60000; // Less than 1 minute

  return (
    <div className="max-w-md mx-auto bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 shadow-lg border border-green-100">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <Coffee className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-green-800 mb-2">Break Time!</h2>
        <p className="text-green-600 text-sm">
          Your work timer is paused. Time to recharge! 
        </p>
      </div>

      {/* Countdown Display */}
      <div className="text-center mb-6">
        <div className={`text-4xl font-mono font-bold mb-2 ${
          isAlmostDone ? 'text-orange-600 animate-pulse' : 'text-green-700'
        }`}>
          {formatTime(breakTimeRemaining)}
        </div>
        <div className="text-sm text-green-600 mb-3">remaining</div>
        
        {/* Progress Bar */}
        <div className="w-full bg-green-200 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-3 rounded-full transition-all duration-1000 ${
              isAlmostDone ? 'bg-gradient-to-r from-green-500 to-orange-500' : 'bg-green-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Activity Suggestion */}
      <div className="bg-white rounded-xl p-4 mb-6 border border-green-100">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{suggestedActivity.icon}</span>
          <div>
            <h3 className="font-medium text-gray-800 text-sm">Suggested activity:</h3>
            <p className="text-gray-600 text-sm">{suggestedActivity.text}</p>
          </div>
        </div>
      </div>

      {/* Break Status */}
      {isAlmostDone && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 text-orange-800">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Almost done! Get ready to focus.</span>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={onEndEarly}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <span>End Break & Resume Work</span>
        <ArrowRight className="w-4 h-4" />
      </button>
      
      <p className="text-center text-xs text-gray-500 mt-3">
        You'll get a notification when your break naturally ends
      </p>
    </div>
  );
}