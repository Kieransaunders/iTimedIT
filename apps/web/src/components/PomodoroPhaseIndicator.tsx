import { Clock, Coffee, Award } from "lucide-react";

interface PomodoroPhaseIndicatorProps {
  isBreakTimer: boolean;
  currentCycle: number;
  completedCycles: number;
  workMinutes: number;
  breakMinutes: number;
  sessionStartedAt?: number;
}

export function PomodoroPhaseIndicator({ 
  isBreakTimer, 
  currentCycle, 
  completedCycles, 
  workMinutes, 
  breakMinutes,
  sessionStartedAt 
}: PomodoroPhaseIndicatorProps) {
  const cycleProgress = currentCycle % 4 || 4; // 1-4, where 4 is completing the cycle
  const fullCyclesCompleted = Math.floor(completedCycles / 4);
  
  // Calculate session time
  const sessionDuration = sessionStartedAt 
    ? Math.floor((Date.now() - sessionStartedAt) / (1000 * 60)) 
    : 0;

  return (
    <div className="text-center space-y-3">
      {/* Main Phase Badge */}
      <div className="space-y-2">
        {isBreakTimer ? (
          <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium shadow-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            <Coffee className="w-4 h-4 mr-1" />
            Pomodoro Break
          </div>
        ) : (
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium shadow-sm">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
            <Clock className="w-4 h-4 mr-1" />
            Work Session
          </div>
        )}
        
        {/* Session info */}
        <div className="text-xs text-gray-500">
          {workMinutes} min work • {breakMinutes} min break
        </div>
      </div>

      {/* Cycle Progress */}
      <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">Current Cycle</span>
          <span className="text-xs text-gray-500">{cycleProgress}/4</span>
        </div>
        
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-2">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                step < cycleProgress
                  ? 'bg-green-500 shadow-sm'
                  : step === cycleProgress
                  ? isBreakTimer 
                    ? 'bg-green-400 animate-pulse'
                    : 'bg-blue-500 animate-pulse'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        
        {/* Cycle completion stats */}
        {fullCyclesCompleted > 0 && (
          <div className="flex items-center justify-center gap-1 text-xs text-gray-600">
            <Award className="w-3 h-3" />
            <span>{fullCyclesCompleted} cycle{fullCyclesCompleted > 1 ? 's' : ''} completed</span>
          </div>
        )}
      </div>

      {/* Session Stats */}
      {sessionDuration > 0 && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <div className="text-xs font-medium text-gray-700 mb-2">Session Stats</div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="text-center">
              <div className="font-medium text-gray-900">
                {Math.floor(sessionDuration / 60)}h {sessionDuration % 60}m
              </div>
              <div className="text-gray-500">Total Time</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900">
                {Math.floor(completedCycles / 4)}.{completedCycles % 4}
              </div>
              <div className="text-gray-500">Cycles</div>
            </div>
          </div>
          
          {/* Productivity estimate */}
          {completedCycles > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-200">
              <div className="text-center">
                <div className="text-xs text-green-600 font-medium">
                  {Math.round((completedCycles * (workMinutes || 25)) / 60 * 10) / 10}h focused work
                </div>
                <div className="text-xs text-gray-500">
                  ~{Math.round(completedCycles * 0.8)} deep work sessions
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}