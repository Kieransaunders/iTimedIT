import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export function Settings({ onNavigate }: { onNavigate?: (page: "modern") => void }) {
  const settings = useQuery(api.users.getUserSettings);
  const ensureSettings = useMutation(api.users.ensureUserSettings);
  const updateSettings = useMutation(api.users.updateSettings);
  
  const [interruptEnabled, setInterruptEnabled] = useState(true);
  const [interruptInterval, setInterruptInterval] = useState<0.0833 | 5 | 15 | 30 | 45 | 60 | 120>(60);
  const [gracePeriod, setGracePeriod] = useState<5 | 10 | 30 | 60 | 120>(5);
  const [budgetWarningEnabled, setBudgetWarningEnabled] = useState(true);
  const [budgetWarningThresholdHours, setBudgetWarningThresholdHours] = useState(1.0);
  const [budgetWarningThresholdAmount, setBudgetWarningThresholdAmount] = useState(50.0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setInterruptEnabled(settings.interruptEnabled);
      setInterruptInterval(settings.interruptInterval);
      setGracePeriod(settings.gracePeriod ?? 5);
      setBudgetWarningEnabled(settings.budgetWarningEnabled ?? true);
      setBudgetWarningThresholdHours(settings.budgetWarningThresholdHours ?? 1.0);
      setBudgetWarningThresholdAmount(settings.budgetWarningThresholdAmount ?? 50.0);
    } else {
      // Ensure settings exist
      ensureSettings();
    }
  }, [settings, ensureSettings]);

  if (!settings) {
    return <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>;
  }

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateSettings({
        interruptEnabled,
        interruptInterval,
        gracePeriod,
        budgetWarningEnabled,
        budgetWarningThresholdHours,
        budgetWarningThresholdAmount,
      });
      
      toast.success("Settings saved successfully!", {
        description: "Your preferences have been updated.",
        duration: 2000,
      });
      
      // Redirect to modern dashboard after a short delay
      setTimeout(() => {
        onNavigate?.("modern");
      }, 1500);
    } catch (error) {
      toast.error("Failed to save settings", {
        description: "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const intervalOptions = [
    { value: 0.0833, label: "5 seconds" },
    { value: 5, label: "5 minutes" },
    { value: 15, label: "15 minutes" },
    { value: 30, label: "30 minutes" },
    { value: 45, label: "45 minutes" },
    { value: 60, label: "1 hour" },
    { value: 120, label: "2 hours" },
  ];

  const gracePeriodOptions = [
    { value: 5, label: "5 seconds" },
    { value: 10, label: "10 seconds" },
    { value: 30, label: "30 seconds" },
    { value: 60, label: "1 minute" },
    { value: 120, label: "2 minutes" },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-6">Settings</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Interruption Settings</h3>
            <p className="text-gray-600 mb-4">
              Configure when and how often you want to be asked if you're still working on a project.
              This helps prevent accidentally leaving timers running.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="interruptEnabled"
                  checked={interruptEnabled}
                  onChange={(e) => setInterruptEnabled(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="interruptEnabled" className="ml-2 block text-sm text-gray-900">
                  Enable interruption prompts
                </label>
              </div>
              
              {interruptEnabled && (
                <div>
                  <label htmlFor="interruptInterval" className="block text-sm font-medium text-gray-700 mb-2">
                    Check interval
                  </label>
                  <select
                    id="interruptInterval"
                    value={interruptInterval}
                    onChange={(e) => setInterruptInterval(Number(e.target.value) as 0.0833 | 5 | 15 | 30 | 45 | 60 | 120)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {intervalOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    You'll be asked if you're still working every {intervalOptions.find(o => o.value === interruptInterval)?.label.toLowerCase()}.
                  </p>
                </div>
              )}
              
              {interruptEnabled && (
                <div>
                  <label htmlFor="gracePeriod" className="block text-sm font-medium text-gray-700 mb-2">
                    Auto-stop countdown
                  </label>
                  <select
                    id="gracePeriod"
                    value={gracePeriod}
                    onChange={(e) => setGracePeriod(Number(e.target.value) as 5 | 10 | 30 | 60 | 120)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {gracePeriodOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    Time to respond before the timer auto-stops: {gracePeriodOptions.find(o => o.value === gracePeriod)?.label.toLowerCase()}.
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-4">Budget Warning Settings</h3>
            <p className="text-gray-600 mb-4">
              Get warned when you're approaching your project budget limits. 
              The timer will flash and show a warning when you're close to exceeding your budget.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="budgetWarningEnabled"
                  checked={budgetWarningEnabled}
                  onChange={(e) => setBudgetWarningEnabled(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="budgetWarningEnabled" className="ml-2 block text-sm text-gray-900">
                  Enable budget warnings
                </label>
              </div>
              
              {budgetWarningEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="budgetWarningThresholdHours" className="block text-sm font-medium text-gray-700 mb-2">
                      Time warning threshold (hours)
                    </label>
                    <input
                      type="number"
                      id="budgetWarningThresholdHours"
                      value={budgetWarningThresholdHours}
                      onChange={(e) => setBudgetWarningThresholdHours(Math.max(0.1, parseFloat(e.target.value) || 1.0))}
                      min="0.1"
                      step="0.1"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Warn when less than {budgetWarningThresholdHours} hours remain in time-based budgets.
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="budgetWarningThresholdAmount" className="block text-sm font-medium text-gray-700 mb-2">
                      Amount warning threshold ($)
                    </label>
                    <input
                      type="number"
                      id="budgetWarningThresholdAmount"
                      value={budgetWarningThresholdAmount}
                      onChange={(e) => setBudgetWarningThresholdAmount(Math.max(1, parseFloat(e.target.value) || 50.0))}
                      min="1"
                      step="1"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Warn when less than ${budgetWarningThresholdAmount} remains in amount-based budgets.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
