import { Id } from "../../convex/_generated/dataModel";

interface ProjectSwitchModalProps {
  currentProjectName: string;
  newProjectName: string;
  onStopAndSwitch: () => void;
  onTransferTimer: () => void;
  onCancel: () => void;
}

export function ProjectSwitchModal({ 
  currentProjectName, 
  newProjectName, 
  onStopAndSwitch, 
  onTransferTimer, 
  onCancel 
}: ProjectSwitchModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-lg w-full mx-4">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-4">
            Timer is currently running
          </h2>
          <p className="text-gray-600 mb-2">
            You're currently tracking time for <span className="font-semibold text-blue-600">{currentProjectName}</span>.
          </p>
          <p className="text-gray-600 mb-6">
            What would you like to do when switching to <span className="font-semibold text-green-600">{newProjectName}</span>?
          </p>
          
          <div className="space-y-3">
            <button
              onClick={onStopAndSwitch}
              className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors text-left flex items-center gap-3"
            >
              <div className="text-xl">⏹️</div>
              <div>
                <div className="font-semibold">Stop timer and switch</div>
                <div className="text-sm text-red-100">Stop tracking current project, switch to new project (timer won't start)</div>
              </div>
            </button>
            
            <button
              onClick={onTransferTimer}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-left flex items-center gap-3"
            >
              <div className="text-xl">🔄</div>
              <div>
                <div className="font-semibold">Transfer timer</div>
                <div className="text-sm text-blue-100">Stop current timer and immediately start timer for new project</div>
              </div>
            </button>
            
            <button
              onClick={onCancel}
              className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors text-left flex items-center gap-3"
            >
              <div className="text-xl">❌</div>
              <div>
                <div className="font-semibold">Cancel</div>
                <div className="text-sm text-gray-100">Keep current project and timer running</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}