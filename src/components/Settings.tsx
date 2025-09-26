import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { OrganizationManagementCard } from "./OrganizationManagementCard";
import type { AppPage } from "./ProfilePage";
import { 
  initializePushNotifications, 
  requestNotificationPermission, 
  subscribeToPush, 
  unsubscribeFromPush,
  isPushSupported,
  getNotificationPermission,
  getPermissionTroubleshootingInfo
} from "../lib/push";
import { 
  isBadgeSupported, 
  isSoundSupported, 
  isVibrationSupported, 
  isWakeLockSupported 
} from "../lib/attention";

export function Settings({ onNavigate }: { onNavigate?: (page: AppPage) => void }) {
  const settings = useQuery(api.users.getUserSettings);
  const ensureSettings = useMutation(api.users.ensureUserSettings);
  const updateSettings = useMutation(api.users.updateSettings);
  
  // Notification settings
  const notificationPrefs = useQuery(api.pushNotifications.getNotificationPrefs);
  const ensureNotificationPrefs = useMutation(api.pushNotifications.ensureNotificationPrefs);
  const updateNotificationPrefs = useMutation(api.pushNotifications.updateNotificationPrefs);
  const savePushSubscription = useMutation(api.pushNotifications.savePushSubscription);

  const [interruptEnabled, setInterruptEnabled] = useState(true);
  const [interruptInterval, setInterruptInterval] = useState<
    0.0833 | 5 | 15 | 30 | 45 | 60 | 120
  >(45);
  const [gracePeriod, setGracePeriod] = useState<5 | 10 | 30 | 60 | 120>(5);
  const [budgetWarningEnabled, setBudgetWarningEnabled] = useState(true);
  const [budgetWarningThresholdHours, setBudgetWarningThresholdHours] = useState(1.0);
  const [budgetWarningThresholdAmount, setBudgetWarningThresholdAmount] = useState(50.0);
  const [pomodoroEnabled, setPomodoroEnabled] = useState(false);
  const [pomodoroWorkMinutes, setPomodoroWorkMinutes] = useState(25);
  const [pomodoroBreakMinutes, setPomodoroBreakMinutes] = useState(5);
  const [isSaving, setIsSaving] = useState(false);

  // Notification preferences state
  const [webPushEnabled, setWebPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [vibrationEnabled, setVibrationEnabled] = useState(false);
  const [wakeLockEnabled, setWakeLockEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState("");
  const [quietHoursEnd, setQuietHoursEnd] = useState("");
  const [escalationDelayMinutes, setEscalationDelayMinutes] = useState(2);
  const [doNotDisturbEnabled, setDoNotDisturbEnabled] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [emailFallbackEnabled, setEmailFallbackEnabled] = useState(false);
  const [smsFallbackEnabled, setSmsFallbackEnabled] = useState(false);
  const [slackFallbackEnabled, setSlackFallbackEnabled] = useState(false);
  const [fallbackEmail, setFallbackEmail] = useState("");
  const [smsNumber, setSmsNumber] = useState("");
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [permissionTroubleshooting, setPermissionTroubleshooting] = useState<{
    permission: NotificationPermission;
    canRequest: boolean;
    browserSupported: boolean;
    isSecureContext: boolean;
    troubleshootingSteps: string[];
  } | null>(null);

  const defaultTimezone = typeof Intl !== "undefined"
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : "UTC";

  useEffect(() => {
    if (settings) {
      setInterruptEnabled(settings.interruptEnabled);
      setInterruptInterval(settings.interruptInterval);
      setGracePeriod(settings.gracePeriod ?? 5);
      setBudgetWarningEnabled(settings.budgetWarningEnabled ?? true);
      setBudgetWarningThresholdHours(settings.budgetWarningThresholdHours ?? 1.0);
      setBudgetWarningThresholdAmount(settings.budgetWarningThresholdAmount ?? 50.0);
      setPomodoroEnabled(settings.pomodoroEnabled ?? false);
      setPomodoroWorkMinutes(settings.pomodoroWorkMinutes ?? 25);
      setPomodoroBreakMinutes(settings.pomodoroBreakMinutes ?? 5);
    } else {
      // Ensure settings exist
      ensureSettings();
    }
  }, [settings, ensureSettings]);

  useEffect(() => {
    if (notificationPrefs) {
      setWebPushEnabled(notificationPrefs.webPushEnabled);
      setSoundEnabled(notificationPrefs.soundEnabled);
      setVibrationEnabled(notificationPrefs.vibrationEnabled);
      setWakeLockEnabled(notificationPrefs.wakeLockEnabled);
      setQuietHoursStart(notificationPrefs.quietHoursStart || "");
      setQuietHoursEnd(notificationPrefs.quietHoursEnd || "");
      setEscalationDelayMinutes(notificationPrefs.escalationDelayMinutes);
      setDoNotDisturbEnabled(notificationPrefs.doNotDisturbEnabled);
      setEmailFallbackEnabled(notificationPrefs.emailEnabled);
      setSmsFallbackEnabled(notificationPrefs.smsEnabled);
      setSlackFallbackEnabled(notificationPrefs.slackEnabled);
      setFallbackEmail(notificationPrefs.fallbackEmail || "");
      setSmsNumber(notificationPrefs.smsNumber || "");
      setSlackWebhookUrl(notificationPrefs.slackWebhookUrl || "");
    } else {
      // Ensure notification preferences exist
      ensureNotificationPrefs();
    }
  }, [notificationPrefs, ensureNotificationPrefs]);

  // Initialize push notifications on component mount
  useEffect(() => {
    const initPush = async () => {
      // Get troubleshooting info regardless of support
      const troubleshootingInfo = getPermissionTroubleshootingInfo();
      setPermissionTroubleshooting(troubleshootingInfo);
      
      if (isPushSupported()) {
        const initialized = await initializePushNotifications();
        if (initialized) {
          const permission = getNotificationPermission();
          setPushSubscribed(permission === 'granted');
        }
      }
    };
    initPush();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Save timer settings
      await updateSettings({
        interruptEnabled,
        interruptInterval,
        gracePeriod,
        budgetWarningEnabled,
        budgetWarningThresholdHours,
        budgetWarningThresholdAmount,
        pomodoroEnabled,
        pomodoroWorkMinutes,
        pomodoroBreakMinutes,
      });

      // Save notification preferences
      await updateNotificationPrefs({
        webPushEnabled,
        soundEnabled,
        vibrationEnabled,
        wakeLockEnabled,
        emailEnabled: emailFallbackEnabled,
        smsEnabled: smsFallbackEnabled,
        slackEnabled: slackFallbackEnabled,
        fallbackEmail: fallbackEmail || undefined,
        smsNumber: smsNumber || undefined,
        slackWebhookUrl: slackWebhookUrl || undefined,
        quietHoursStart: quietHoursStart || undefined,
        quietHoursEnd: quietHoursEnd || undefined,
        escalationDelayMinutes,
        doNotDisturbEnabled,
        timezone: notificationPrefs?.timezone ?? defaultTimezone,
      });

      toast.success("Settings saved successfully!", {
        description: "Your preferences have been updated.",
        duration: 2000,
      });

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

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      // Update troubleshooting info before attempting
      const troubleshootingInfo = getPermissionTroubleshootingInfo();
      setPermissionTroubleshooting(troubleshootingInfo);
      
      if (!troubleshootingInfo.browserSupported) {
        toast.error("Push notifications not supported in this browser");
        setWebPushEnabled(false);
        return;
      }
      
      if (!troubleshootingInfo.isSecureContext) {
        toast.error("Push notifications require HTTPS or localhost");
        setWebPushEnabled(false);
        return;
      }
      
      if (troubleshootingInfo.permission === 'denied') {
        toast.error("Notification permission denied. Please enable in browser settings.", {
          duration: 5000,
          description: "Click the lock icon in the address bar to change notification settings"
        });
        setWebPushEnabled(false);
        return;
      }
      
      const permission = await requestNotificationPermission();
      // Update troubleshooting info after permission request
      const updatedInfo = getPermissionTroubleshootingInfo();
      setPermissionTroubleshooting(updatedInfo);
      
      if (permission === 'granted') {
        const subscription = await subscribeToPush();
        if (subscription) {
          await savePushSubscription({
            endpoint: subscription.endpoint,
            p256dhKey: subscription.keys.p256dh,
            authKey: subscription.keys.auth,
            userAgent: navigator.userAgent,
          });
          setPushSubscribed(true);
          setWebPushEnabled(true);
          toast.success("Push notifications enabled!");
        } else {
          toast.error("Failed to set up push notifications");
          setWebPushEnabled(false);
        }
      } else if (permission === 'denied') {
        toast.error("Permission denied. Reset in browser settings to try again.", {
          duration: 5000,
          description: "Chrome: Address bar → Lock icon → Notifications → Allow"
        });
        setWebPushEnabled(false);
      } else {
        toast.error("Permission request failed");
        setWebPushEnabled(false);
      }
    } else {
      await unsubscribeFromPush();
      setPushSubscribed(false);
      setWebPushEnabled(false);
      toast.success("Push notifications disabled");
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

  const isSettingsLoading = settings === undefined;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <OrganizationManagementCard />
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-6">Settings</h2>

        {isSettingsLoading ? (
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          </div>
        ) : (
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
                    onChange={(event) => setInterruptEnabled(event.target.checked)}
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
                      onChange={(event) =>
                        setInterruptInterval(
                          Number(event.target.value) as 0.0833 | 5 | 15 | 30 | 45 | 60 | 120,
                        )
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {intervalOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-sm text-gray-500">
                      You'll be asked if you're still working every {intervalOptions
                        .find((option) => option.value === interruptInterval)
                        ?.label.toLowerCase()}.
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
                      onChange={(event) =>
                        setGracePeriod(Number(event.target.value) as 5 | 10 | 30 | 60 | 120)
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {gracePeriodOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-sm text-gray-500">
                      Time to respond before the timer auto-stops: {gracePeriodOptions
                        .find((option) => option.value === gracePeriod)
                        ?.label.toLowerCase()}.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Focus Sessions (Pomodoro)</h3>
              <p className="text-gray-600 mb-4">
                Enable Pomodoro-style notifications to guide your work and break cadence. We'll send
                alerts when it's time to take a break or get back to focus.
              </p>

              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="pomodoroEnabled"
                    checked={pomodoroEnabled}
                    onChange={(event) => setPomodoroEnabled(event.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="pomodoroEnabled" className="ml-2 block text-sm text-gray-900">
                    Enable Pomodoro cycle notifications
                  </label>
                </div>

                {pomodoroEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="pomodoroWorkMinutes" className="block text-sm font-medium text-gray-700 mb-2">
                        Focus duration (minutes)
                      </label>
                      <input
                        type="number"
                        id="pomodoroWorkMinutes"
                        value={pomodoroWorkMinutes}
                        onChange={(event) =>
                          setPomodoroWorkMinutes(Math.max(5, parseInt(event.target.value, 10) || 25))
                        }
                        min={5}
                        max={120}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        We'll nudge you to take a break after this many minutes of focused work.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="pomodoroBreakMinutes" className="block text-sm font-medium text-gray-700 mb-2">
                        Break duration (minutes)
                      </label>
                      <input
                        type="number"
                        id="pomodoroBreakMinutes"
                        value={pomodoroBreakMinutes}
                        onChange={(event) =>
                          setPomodoroBreakMinutes(Math.max(1, parseInt(event.target.value, 10) || 5))
                        }
                        min={1}
                        max={60}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        We'll remind you to resume once this break time expires.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Budget Warning Settings</h3>
              <p className="text-gray-600 mb-4">
                Get warned when you're approaching your project budget limits. The timer will flash and
                show a warning when you're close to exceeding your budget.
              </p>

              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="budgetWarningEnabled"
                    checked={budgetWarningEnabled}
                    onChange={(event) => setBudgetWarningEnabled(event.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="budgetWarningEnabled" className="ml-2 block text-sm text-gray-900">
                    Enable budget warnings
                  </label>
                </div>

                {budgetWarningEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="budgetWarningThresholdHours"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Time warning threshold (hours)
                      </label>
                      <input
                        type="number"
                        id="budgetWarningThresholdHours"
                        value={budgetWarningThresholdHours}
                        onChange={(event) =>
                          setBudgetWarningThresholdHours(
                            Math.max(0.1, parseFloat(event.target.value) || 1.0),
                          )
                        }
                        min="0.1"
                        step="0.1"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Warn when less than {budgetWarningThresholdHours} hours remain in time-based
                        budgets.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="budgetWarningThresholdAmount"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Amount warning threshold ($)
                      </label>
                      <input
                        type="number"
                        id="budgetWarningThresholdAmount"
                        value={budgetWarningThresholdAmount}
                        onChange={(event) =>
                          setBudgetWarningThresholdAmount(
                            Math.max(1, parseFloat(event.target.value) || 50.0),
                          )
                        }
                        min="1"
                        step="1"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Warn when less than ${budgetWarningThresholdAmount} remains in amount-based
                        budgets.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Notifications & Attention</h3>
              <p className="text-gray-600 mb-4">
                Configure how you want to be notified when interruptions occur or when you're not looking at the app.
              </p>

              <div className="space-y-6">
                {/* Push Notifications */}
                <div>
                  <h4 className="font-medium mb-3">Web Push Notifications</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="webPushEnabled"
                          checked={webPushEnabled && pushSubscribed}
                          onChange={(event) => handlePushToggle(event.target.checked)}
                          disabled={!isPushSupported()}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                        />
                        <label htmlFor="webPushEnabled" className="ml-2 text-sm text-gray-900">
                          Enable push notifications
                        </label>
                      </div>
                      {!isPushSupported() && (
                        <span className="text-xs text-gray-500">Not supported in this browser</span>
                      )}
                    </div>
                    {webPushEnabled && pushSubscribed && (
                      <p className="text-xs text-green-600 ml-6">
                        ✅ Notifications enabled - you'll receive alerts when the app is closed
                      </p>
                    )}
                    {!webPushEnabled && permissionTroubleshooting && permissionTroubleshooting.troubleshootingSteps.length > 0 && (
                      <div className="ml-6 mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                        <p className="text-sm font-medium text-amber-800 mb-2">
                          ⚠️ Notification Setup Required
                        </p>
                        <ul className="text-xs text-amber-700 space-y-1">
                          {permissionTroubleshooting.troubleshootingSteps.map((step, index) => (
                            <li key={index}>• {step}</li>
                          ))}
                        </ul>
                        {permissionTroubleshooting.permission === 'denied' && (
                          <button
                            onClick={() => {
                              const info = getPermissionTroubleshootingInfo();
                              setPermissionTroubleshooting(info);
                              toast.info("Permission status updated. Try enabling notifications again.");
                            }}
                            className="mt-2 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded hover:bg-amber-200"
                          >
                            Check Permission Status
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* In-App Attention */}
                <div>
                  <h4 className="font-medium mb-3">In-App Attention</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="soundEnabled"
                          checked={soundEnabled}
                          onChange={(event) => setSoundEnabled(event.target.checked)}
                          disabled={!isSoundSupported()}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                        />
                        <label htmlFor="soundEnabled" className="ml-2 text-sm text-gray-900">
                          Play alert sounds
                        </label>
                      </div>
                      {!isSoundSupported() && (
                        <span className="text-xs text-gray-500">Not supported</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="vibrationEnabled"
                          checked={vibrationEnabled}
                          onChange={(event) => setVibrationEnabled(event.target.checked)}
                          disabled={!isVibrationSupported()}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                        />
                        <label htmlFor="vibrationEnabled" className="ml-2 text-sm text-gray-900">
                          Vibrate device (mobile)
                        </label>
                      </div>
                      {!isVibrationSupported() && (
                        <span className="text-xs text-gray-500">Not supported</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="wakeLockEnabled"
                          checked={wakeLockEnabled}
                          onChange={(event) => setWakeLockEnabled(event.target.checked)}
                          disabled={!isWakeLockSupported()}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                        />
                        <label htmlFor="wakeLockEnabled" className="ml-2 text-sm text-gray-900">
                          Keep screen awake during timing
                        </label>
                      </div>
                      {!isWakeLockSupported() && (
                        <span className="text-xs text-gray-500">Not supported</span>
                      )}
                    </div>
                  </div>
                  {isBadgeSupported() && (
                    <p className="text-xs text-gray-500 mt-2">
                      App badge counts are automatically enabled
                    </p>
                  )}
                </div>

                {/* Escalation Channels */}
                <div>
                  <h4 className="font-medium mb-3">Escalation Channels</h4>
                  <p className="text-sm text-gray-500 mb-3">
                    If push alerts go unanswered, we'll fall back to these channels after {escalationDelayMinutes} minute(s).
                  </p>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="emailFallbackEnabled"
                          checked={emailFallbackEnabled}
                          onChange={(event) => setEmailFallbackEnabled(event.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="emailFallbackEnabled" className="ml-2 text-sm text-gray-900">
                          Send an email alert
                        </label>
                      </div>
                      {emailFallbackEnabled && (
                        <div className="mt-2 ml-6 space-y-2">
                          <input
                            type="email"
                            value={fallbackEmail}
                            onChange={(event) => setFallbackEmail(event.target.value)}
                            placeholder="you@example.com"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-500">
                            We'll email you with a deep link back to the running timer.
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="smsFallbackEnabled"
                          checked={smsFallbackEnabled}
                          onChange={(event) => setSmsFallbackEnabled(event.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="smsFallbackEnabled" className="ml-2 text-sm text-gray-900">
                          Send an SMS alert
                        </label>
                      </div>
                      {smsFallbackEnabled && (
                        <div className="mt-2 ml-6 space-y-2">
                          <input
                            type="tel"
                            value={smsNumber}
                            onChange={(event) => setSmsNumber(event.target.value)}
                            placeholder="+1 (555) 123-4567"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-500">
                            Standard carrier rates apply. Reply STOP to opt out.
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="slackFallbackEnabled"
                          checked={slackFallbackEnabled}
                          onChange={(event) => setSlackFallbackEnabled(event.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="slackFallbackEnabled" className="ml-2 text-sm text-gray-900">
                          Post to Slack/Discord webhook
                        </label>
                      </div>
                      {slackFallbackEnabled && (
                        <div className="mt-2 ml-6 space-y-2">
                          <input
                            type="url"
                            value={slackWebhookUrl}
                            onChange={(event) => setSlackWebhookUrl(event.target.value)}
                            placeholder="https://hooks.slack.com/services/..."
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-500">
                            We'll send a concise alert with action links to this webhook URL.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quiet Hours */}
                <div>
                  <h4 className="font-medium mb-3">Quiet Hours</h4>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="doNotDisturbEnabled"
                        checked={doNotDisturbEnabled}
                        onChange={(event) => setDoNotDisturbEnabled(event.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="doNotDisturbEnabled" className="ml-2 text-sm text-gray-900">
                        Enable quiet hours
                      </label>
                    </div>

                    {doNotDisturbEnabled && (
                      <div className="ml-6 grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="quietHoursStart" className="block text-sm font-medium text-gray-700 mb-1">
                            Start time
                          </label>
                          <input
                            type="time"
                            id="quietHoursStart"
                            value={quietHoursStart}
                            onChange={(event) => setQuietHoursStart(event.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label htmlFor="quietHoursEnd" className="block text-sm font-medium text-gray-700 mb-1">
                            End time
                          </label>
                          <input
                            type="time"
                            id="quietHoursEnd"
                            value={quietHoursEnd}
                            onChange={(event) => setQuietHoursEnd(event.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      We'll honor quiet hours in your {notificationPrefs?.timezone ?? defaultTimezone} timezone and pause alerts when your OS-level Do Not Disturb is active.
                    </p>
                  </div>
                </div>

                {/* Escalation */}
                <div>
                  <h4 className="font-medium mb-3">Escalation Timing</h4>
                  <div>
                    <label htmlFor="escalationDelayMinutes" className="block text-sm font-medium text-gray-700 mb-2">
                      Escalation delay (minutes)
                    </label>
                    <select
                      id="escalationDelayMinutes"
                      value={escalationDelayMinutes}
                      onChange={(event) => setEscalationDelayMinutes(Number(event.target.value))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={1}>1 minute</option>
                      <option value={2}>2 minutes</option>
                      <option value={5}>5 minutes</option>
                      <option value={10}>10 minutes</option>
                    </select>
                    <p className="mt-1 text-sm text-gray-500">
                      How long to wait before trying the backup channels above.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg transition-colors"
              >
                {isSaving && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {isSaving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
