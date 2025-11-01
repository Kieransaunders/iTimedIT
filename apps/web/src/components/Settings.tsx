import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import * as Sentry from "@sentry/react";
import type { AppPage } from "./ProfilePage";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import {
  isBadgeSupported,
  isSoundSupported,
  isVibrationSupported,
  isWakeLockSupported
} from "../lib/attention";
import { useCurrency } from "../hooks/useCurrency";
import { useOrganization } from "../lib/organization-context";
import { buildAppPath } from "../lib/basePath";
import { ColorPicker } from "./ui/ColorPicker";
import { Crown, Shield, User, Mail, Calendar, Copy, RefreshCw, Trash2 } from "lucide-react";
import { notifyMutationError } from "../lib/notifyMutationError";

type MembershipRole = Doc<"memberships">["role"];

type MemberRow = {
  membership: Doc<"memberships">;
  user: Doc<"users"> | null;
};

type InvitationRow = Doc<"invitations"> & {
  effectiveStatus: Doc<"invitations">["status"];
};

const ROLE_OPTIONS: { value: MembershipRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
];

function getRoleIcon(role: MembershipRole) {
  switch (role) {
    case "owner":
      return Crown;
    case "admin":
      return Shield;
    case "member":
      return User;
  }
}

function getRoleBadgeColors(role: MembershipRole) {
  switch (role) {
    case "owner":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    case "admin":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
    case "member":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
  }
}

function getUserInitials(user: Doc<"users"> | null): string {
  if (!user) return "?";
  if (user.name) {
    const parts = user.name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (user.email) {
    return user.email.slice(0, 2).toUpperCase();
  }
  return "?";
}

type SettingsTab = "timer" | "notifications" | "budget" | "team";

const SETTINGS_TABS: { id: SettingsTab; label: string; description: string }[] = [
  {
    id: "timer",
    label: "Timer & Focus",
    description:
      "Fine-tune interruption prompts and Pomodoro defaults so timers match your working style.",
  },
  {
    id: "notifications",
    label: "Notifications",
    description:
      "Control push alerts, escalation channels, and quiet hours to stay informed without overwhelm.",
  },
  {
    id: "budget",
    label: "Budget & Currency",
    description:
      "Stay ahead of budget overruns and pick how monetary values should appear across the workspace.",
  },
  {
    id: "team",
    label: "Team Management",
    description:
      "Manage workspace settings, team members, send invitations, and control access to your organization.",
  },
];

export function Settings({ onNavigate, initialTab }: { onNavigate?: (page: AppPage, options?: { settingsTab?: SettingsTab }) => void; initialTab?: SettingsTab }) {
  const settings = useQuery(api.users.getUserSettings);
  const ensureSettings = useMutation(api.users.ensureUserSettings);
  const updateSettings = useMutation(api.users.updateUserSettings);
  const { getCurrencySymbol } = useCurrency();

  // Notification settings
  const notificationPrefs = useQuery(api.pushNotifications.getNotificationPrefs);
  const ensureNotificationPrefs = useMutation(api.pushNotifications.ensureNotificationPrefs);
  const updateNotificationPrefs = useMutation(api.pushNotifications.updateNotificationPrefs);

  // Team Management
  const { activeOrganization, activeRole, activeMembershipId } = useOrganization();
  const canManage = activeRole === "owner" || activeRole === "admin";
  const hasOrganization = Boolean(activeOrganization);
  const shouldLoadData = canManage && hasOrganization;

  const members = useQuery(
    api.organizations.listOrganizationMembers,
    shouldLoadData ? {} : "skip"
  ) as MemberRow[] | undefined;

  const invitations = useQuery(
    api.invitations.listForCurrentOrganization,
    shouldLoadData ? {} : "skip"
  ) as InvitationRow[] | undefined;

  const createInvitation = useMutation(api.invitations.create);
  const resendInvitation = useMutation(api.invitations.resend);
  const revokeInvitation = useMutation(api.invitations.revoke);
  const removeMember = useMutation(api.organizations.removeMember);
  const updateWorkspaceSettings = useMutation(api.organizations.updateWorkspaceSettings);

  const [interruptEnabled, setInterruptEnabled] = useState(true);
  const [interruptInterval, setInterruptInterval] = useState<number>(45);
  const [isCustomInterval, setIsCustomInterval] = useState(false);
  const [customIntervalValue, setCustomIntervalValue] = useState<string>("45");
  const [gracePeriod, setGracePeriod] = useState<number>(60);
  const [isCustomGracePeriod, setIsCustomGracePeriod] = useState(false);
  const [customGracePeriodValue, setCustomGracePeriodValue] = useState<string>("60");
  const [budgetWarningEnabled, setBudgetWarningEnabled] = useState(true);
  const [budgetWarningThresholdHours, setBudgetWarningThresholdHours] = useState(1.0);
  const [budgetWarningThresholdAmount, setBudgetWarningThresholdAmount] = useState(50.0);
  const [pomodoroEnabled, setPomodoroEnabled] = useState(false);
  const [pomodoroWorkMinutes, setPomodoroWorkMinutes] = useState(25);
  const [pomodoroBreakMinutes, setPomodoroBreakMinutes] = useState(5);
  const [currency, setCurrency] = useState<"USD" | "EUR" | "GBP">("USD");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab ?? "timer");
  const activeTabConfig =
    SETTINGS_TABS.find((tab) => tab.id === activeTab) ?? SETTINGS_TABS[0];

  // Notification preferences state
  const [webPushEnabled, setWebPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(false);
  const [wakeLockEnabled, setWakeLockEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState("");
  const [quietHoursEnd, setQuietHoursEnd] = useState("");
  const [escalationDelayMinutes, setEscalationDelayMinutes] = useState(2);
  const [doNotDisturbEnabled, setDoNotDisturbEnabled] = useState(false);
  const [emailFallbackEnabled, setEmailFallbackEnabled] = useState(false);
  const [smsFallbackEnabled, setSmsFallbackEnabled] = useState(false);
  const [slackFallbackEnabled, setSlackFallbackEnabled] = useState(false);
  const [fallbackEmail, setFallbackEmail] = useState("");
  const [smsNumber, setSmsNumber] = useState("");
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");

  // Team Management state
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MembershipRole>("member");
  const [isSending, setIsSending] = useState(false);
  const [invitationInProgress, setInvitationInProgress] = useState<Id<"invitations"> | null>(null);
  const [memberInProgress, setMemberInProgress] = useState<Id<"memberships"> | null>(null);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#8b5cf6");

  const defaultTimezone = typeof Intl !== "undefined"
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : "UTC";

  useEffect(() => {
    if (settings) {
      setInterruptEnabled(settings.interruptEnabled);

      // Check if interval is a preset value or custom
      const presetIntervals = [0.0833, 5, 15, 30, 45, 60, 120];
      const interval = settings.interruptInterval;
      if (presetIntervals.includes(interval)) {
        setInterruptInterval(interval);
        setIsCustomInterval(false);
        setCustomIntervalValue(interval.toString());
      } else {
        setInterruptInterval(-1); // Indicates custom
        setIsCustomInterval(true);
        setCustomIntervalValue(interval.toString());
      }

      // Check if grace period is a preset value or custom
      const presetGracePeriods = [5, 10, 30, 60, 120];
      const grace = settings.gracePeriod ?? 60;
      if (presetGracePeriods.includes(grace)) {
        setGracePeriod(grace);
        setIsCustomGracePeriod(false);
        setCustomGracePeriodValue(grace.toString());
      } else {
        setGracePeriod(-1); // Indicates custom
        setIsCustomGracePeriod(true);
        setCustomGracePeriodValue(grace.toString());
      }

      setBudgetWarningEnabled(settings.budgetWarningEnabled ?? true);
      setBudgetWarningThresholdHours(settings.budgetWarningThresholdHours ?? 1.0);
      setBudgetWarningThresholdAmount(settings.budgetWarningThresholdAmount ?? 50.0);
      setPomodoroEnabled(settings.pomodoroEnabled ?? false);
      setPomodoroWorkMinutes(settings.pomodoroWorkMinutes ?? 25);
      setPomodoroBreakMinutes(settings.pomodoroBreakMinutes ?? 5);
      setCurrency(settings.currency ?? "USD");
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

  // Autosave function
  const autoSave = async () => {
    if (isSaving) return; // Don't save if already saving

    try {
      setIsSaving(true);

      // Determine the actual interval value to save
      const actualInterval = isCustomInterval ? parseFloat(customIntervalValue) : interruptInterval;

      // Determine the actual grace period value to save
      const actualGracePeriod = isCustomGracePeriod ? parseFloat(customGracePeriodValue) : gracePeriod;

      console.log('🔄 Autosaving settings with currency:', currency);

      // Save timer settings
      await updateSettings({
        interruptEnabled,
        interruptInterval: actualInterval,
        gracePeriod: actualGracePeriod,
        budgetWarningEnabled,
        budgetWarningThresholdHours,
        budgetWarningThresholdAmount,
        pomodoroEnabled,
        pomodoroWorkMinutes,
        pomodoroBreakMinutes,
        currency,
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

      setLastSaveTime(Date.now());
      console.log('✅ Settings autosaved successfully');
    } catch (error) {
      console.error('❌ Autosave failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Track if settings have been initialized to prevent autosave on first load
  const settingsInitializedRef = useRef(false);
  const isFirstRenderRef = useRef(true);

  // Mark settings as initialized after first load
  useEffect(() => {
    if (settings && !settingsInitializedRef.current) {
      // Wait for next tick to ensure all state updates from settings load are complete
      setTimeout(() => {
        settingsInitializedRef.current = true;
        isFirstRenderRef.current = false;
      }, 100);
    }
  }, [settings]);

  // AUTOSAVE DISABLED - Use manual Save Settings button only
  // This prevents unintended overwrites of settings
  /*
  useEffect(() => {
    // Skip autosave on first render and until settings are fully loaded
    if (isFirstRenderRef.current || !settingsInitializedRef.current) {
      console.log('⏭️ Skipping autosave - first render or not initialized');
      isFirstRenderRef.current = false;
      return;
    }

    console.log('⏰ Autosave scheduled with currency:', currency);

    const timeoutId = setTimeout(() => {
      console.log('🔄 Autosave triggered with currency:', currency);
      autoSave();
    }, 1000); // Save 1 second after user stops changing settings

    return () => {
      console.log('🚫 Autosave cancelled');
      clearTimeout(timeoutId);
    };
  }, [
    interruptEnabled,
    interruptInterval,
    isCustomInterval,
    customIntervalValue,
    gracePeriod,
    isCustomGracePeriod,
    customGracePeriodValue,
    budgetWarningEnabled,
    budgetWarningThresholdHours,
    budgetWarningThresholdAmount,
    pomodoroEnabled,
    pomodoroWorkMinutes,
    pomodoroBreakMinutes,
    webPushEnabled,
    soundEnabled,
    vibrationEnabled,
    wakeLockEnabled,
    emailFallbackEnabled,
    smsFallbackEnabled,
    slackFallbackEnabled,
    fallbackEmail,
    smsNumber,
    slackWebhookUrl,
    quietHoursStart,
    quietHoursEnd,
    escalationDelayMinutes,
    doNotDisturbEnabled,
    currency,
  ]);
  */

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Determine the actual interval value to save
      const actualInterval = isCustomInterval ? parseFloat(customIntervalValue) : interruptInterval;

      // Determine the actual grace period value to save
      const actualGracePeriod = isCustomGracePeriod ? parseFloat(customGracePeriodValue) : gracePeriod;

      console.log('💾 Saving settings with currency:', currency);

      // Save timer settings
      await updateSettings({
        interruptEnabled,
        interruptInterval: actualInterval,
        gracePeriod: actualGracePeriod,
        budgetWarningEnabled,
        budgetWarningThresholdHours,
        budgetWarningThresholdAmount,
        pomodoroEnabled,
        pomodoroWorkMinutes,
        pomodoroBreakMinutes,
        currency,
      });

      console.log('✅ Settings saved successfully');

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
        onNavigate?.("clients");
      }, 1500);
    } catch (error) {
      toast.error("Failed to save settings", {
        description: "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Team Management handlers
  const sortedMembers = useMemo(() => {
    if (!members) {
      return [] as MemberRow[];
    }

    const rank: Record<MembershipRole, number> = {
      owner: 0,
      admin: 1,
      member: 2,
    };

    return [...members].sort((a, b) => {
      const delta = rank[a.membership.role] - rank[b.membership.role];
      if (delta !== 0) {
        return delta;
      }
      const nameA = (a.user?.name ?? a.user?.email ?? "").toLowerCase();
      const nameB = (b.user?.name ?? b.user?.email ?? "").toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [members]);

  const sortedInvitations = useMemo(() => {
    if (!invitations) {
      return [] as InvitationRow[];
    }

    return [...invitations].sort((a, b) => b.createdAt - a.createdAt);
  }, [invitations]);

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      toast.error("Enter an email address to send an invitation.");
      return;
    }

    try {
      setIsSending(true);
      await createInvitation({ email, role });
      setEmail("");
      setRole("member");
      toast.success("Invitation sent", {
        description: `${email} will receive an invitation to join ${activeOrganization?.name ?? "this organization"}.`,
      });
    } catch (error) {
      notifyMutationError(error, {
        fallbackMessage: "Unable to send invitation. Please try again.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleResend = async (invitationId: Id<"invitations">) => {
    try {
      setInvitationInProgress(invitationId);
      await resendInvitation({ invitationId });
      toast.success("Invitation refreshed", {
        description: "A new invitation link has been generated.",
      });
    } catch (error) {
      notifyMutationError(error, {
        fallbackMessage: "Unable to resend the invitation.",
      });
    } finally {
      setInvitationInProgress(null);
    }
  };

  const handleRevoke = async (invitationId: Id<"invitations">) => {
    try {
      setInvitationInProgress(invitationId);
      await revokeInvitation({ invitationId });
      toast.success("Invitation revoked");
    } catch (error) {
      notifyMutationError(error, {
        fallbackMessage: "Unable to revoke the invitation.",
      });
    } finally {
      setInvitationInProgress(null);
    }
  };

  const handleRemoveMember = async (
    membershipId: Id<"memberships">,
    displayName: string
  ) => {
    const confirmation = window.confirm(
      `Remove ${displayName} from ${activeOrganization?.name ?? "this organization"}?`
    );

    if (!confirmation) {
      return;
    }

    try {
      setMemberInProgress(membershipId);
      await removeMember({ membershipId });
      toast.success("Member removed", {
        description: `${displayName} no longer has access to ${activeOrganization?.name ?? "this organization"}.`,
      });
    } catch (error) {
      notifyMutationError(error, {
        fallbackMessage: "Unable to remove the member. Please try again.",
      });
    } finally {
      setMemberInProgress(null);
    }
  };

  const copyInviteLink = async (token: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      toast.error("Clipboard is not available in this environment.");
      return;
    }

    const origin = window.location.origin;
    const path = buildAppPath(`/?token=${token}`);
    const link = new URL(path, origin).toString();

    try {
      await navigator.clipboard.writeText(link);
      toast.success("Invitation link copied to clipboard");
    } catch (error) {
      notifyMutationError(error, {
        fallbackMessage: "Unable to copy link to clipboard.",
      });
    }
  };

  const handleUpdateSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      toast.error("Workspace name cannot be empty");
      return;
    }

    try {
      await updateWorkspaceSettings({ name: trimmed, color: newColor });
      toast.success("Workspace settings updated successfully");
      setIsEditingSettings(false);
      setNewName("");
    } catch (error) {
      notifyMutationError(error, {
        fallbackMessage: "Unable to update workspace settings. Please try again.",
      });
    }
  };

  const startEditSettings = () => {
    setNewName(activeOrganization?.name ?? "");
    setNewColor(activeOrganization?.color ?? "#8b5cf6");
    setIsEditingSettings(true);
  };

  const cancelEditSettings = () => {
    setIsEditingSettings(false);
    setNewName("");
    setNewColor("#8b5cf6");
  };

  const isPersonalWorkspace = activeOrganization?.isPersonalWorkspace === true;
  const isMembersLoading = members === undefined;
  const isInvitationsLoading = invitations === undefined;


  const intervalOptions = [
    { value: 0.0833, label: "5 seconds (debug)" },
    { value: 5, label: "5 minutes" },
    { value: 15, label: "15 minutes" },
    { value: 30, label: "30 minutes" },
    { value: 45, label: "45 minutes" },
    { value: 60, label: "1 hour" },
    { value: 120, label: "2 hours" },
    { value: -1, label: "Custom" },
  ];

  const gracePeriodOptions = [
    { value: 5, label: "5 seconds" },
    { value: 10, label: "10 seconds" },
    { value: 30, label: "30 seconds" },
    { value: 60, label: "1 minute" },
    { value: 120, label: "2 minutes" },
    { value: -1, label: "Custom" },
  ];

  const isSettingsLoading = settings === undefined;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white/60 dark:bg-gray-800/30 backdrop-blur-sm rounded-lg shadow p-6 border border-gray-300/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Settings</h2>
          <div className="flex items-center gap-2 text-sm">
            {isSaving && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Saving...</span>
              </div>
            )}
            {!isSaving && lastSaveTime && (
              <span className="text-green-600">
                ✓ Saved
              </span>
            )}
          </div>
        </div>

        {isSettingsLoading ? (
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2 dark:border-gray-700">
                {SETTINGS_TABS.map((tab) => {
                  const isActive = tab.id === activeTab;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "border-transparent bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200"
                          : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                {activeTabConfig.description}
              </p>
            </div>


            {activeTab === "timer" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Interruption Settings</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Configure when and how often you want to be asked if you're still working on a project.
                    This helps prevent accidentally leaving timers running and applies to all timer modes.
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
                      <label htmlFor="interruptEnabled" className="ml-2 block text-sm text-gray-900 dark:text-white">
                        Enable interruption prompts
                      </label>
                    </div>

                    {interruptEnabled && (
                      <div>
                        <label htmlFor="interruptInterval" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Check interval
                        </label>
                        <select
                          id="interruptInterval"
                          value={interruptInterval}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            setInterruptInterval(value);
                            setIsCustomInterval(value === -1);
                          }}
                          className="block w-full rounded-md border border-gray-300/50 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 bg-white backdrop-blur-sm"
                        >
                          {intervalOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {isCustomInterval && (
                          <div className="mt-3">
                            <label htmlFor="customIntervalValue" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Custom interval (minutes)
                            </label>
                            <input
                              type="number"
                              id="customIntervalValue"
                              value={customIntervalValue}
                              onChange={(event) => {
                                setCustomIntervalValue(event.target.value);
                              }}
                              onBlur={(event) => {
                                const value = event.target.value;
                                const numValue = parseFloat(value);
                                if (isNaN(numValue) || numValue < 1) {
                                  setCustomIntervalValue("1");
                                } else if (numValue > 480) {
                                  setCustomIntervalValue("480");
                                } else {
                                  setCustomIntervalValue(numValue.toString());
                                }
                              }}
                              min={1}
                              max={480}
                              className="block w-full rounded-md border border-gray-300/50 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 bg-white backdrop-blur-sm"
                              placeholder="Enter minutes (1-480)"
                            />
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              Enter a custom interval between 1 and 480 minutes (8 hours).
                            </p>
                          </div>
                        )}
                        {!isCustomInterval && (
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            You'll be asked if you're still working every {intervalOptions
                              .find((option) => option.value === interruptInterval)
                              ?.label.toLowerCase()}.
                          </p>
                        )}
                      </div>
                    )}

                    {interruptEnabled && (
                      <div>
                        <label htmlFor="gracePeriod" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Auto-stop countdown
                        </label>
                        <select
                          id="gracePeriod"
                          value={gracePeriod}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            setGracePeriod(value);
                            setIsCustomGracePeriod(value === -1);
                          }}
                          className="block w-full rounded-md border border-gray-300/50 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 bg-white backdrop-blur-sm"
                        >
                          {gracePeriodOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {isCustomGracePeriod && (
                          <div className="mt-3">
                            <label htmlFor="customGracePeriodValue" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Custom countdown (seconds)
                            </label>
                            <input
                              type="number"
                              id="customGracePeriodValue"
                              value={customGracePeriodValue}
                              onChange={(event) => {
                                setCustomGracePeriodValue(event.target.value);
                              }}
                              onBlur={(event) => {
                                const value = event.target.value;
                                const numValue = parseFloat(value);
                                if (isNaN(numValue) || numValue < 5) {
                                  setCustomGracePeriodValue("5");
                                } else if (numValue > 300) {
                                  setCustomGracePeriodValue("300");
                                } else {
                                  setCustomGracePeriodValue(numValue.toString());
                                }
                              }}
                              min={5}
                              max={300}
                              className="block w-full rounded-md border border-gray-300/50 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 bg-white backdrop-blur-sm"
                              placeholder="Enter seconds (5-300)"
                            />
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              Enter a custom countdown between 5 and 300 seconds (5 minutes).
                            </p>
                          </div>
                        )}
                        {!isCustomGracePeriod && (
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Time to respond before the timer auto-stops: {gracePeriodOptions
                              .find((option) => option.value === gracePeriod)
                              ?.label.toLowerCase()}.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Focus Sessions (Pomodoro)</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Enable Pomodoro mode to work in focused intervals with scheduled breaks. When enabled,
                    you can switch between Normal and Pomodoro modes from the timer dashboard.
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
                      <label htmlFor="pomodoroEnabled" className="ml-2 block text-sm text-gray-900 dark:text-white">
                        Enable Pomodoro mode
                      </label>
                    </div>

                    {pomodoroEnabled && (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label htmlFor="pomodoroWorkMinutes" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                          className="block w-full rounded-md border border-gray-300/50 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 bg-white backdrop-blur-sm"
                        />
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Default focus session length when using Pomodoro mode.
                        </p>
                      </div>

                      <div>
                        <label htmlFor="pomodoroBreakMinutes" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                          className="block w-full rounded-md border border-gray-300/50 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 bg-white backdrop-blur-sm"
                        />
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Default break length when using Pomodoro mode.
                        </p>
                      </div>
                    </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {activeTab === "budget" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Budget Warning Settings</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
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
                      <label htmlFor="budgetWarningEnabled" className="ml-2 block text-sm text-gray-900 dark:text-white">
                        Enable budget warnings
                      </label>
                    </div>

                    {budgetWarningEnabled && (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label
                            htmlFor="budgetWarningThresholdHours"
                            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
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
                            className="block w-full rounded-md border border-gray-300/50 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 bg-white backdrop-blur-sm"
                          />
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Warn when less than {budgetWarningThresholdHours} hours remain in time-based
                            budgets.
                          </p>
                        </div>

                        <div>
                          <label
                            htmlFor="budgetWarningThresholdAmount"
                            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                          >
                            Amount warning threshold ({getCurrencySymbol()})
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
                            className="block w-full rounded-md border border-gray-300/50 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 bg-white backdrop-blur-sm"
                          />
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Warn when less than {getCurrencySymbol()}{budgetWarningThresholdAmount} remains in amount-based
                            budgets.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Currency Preferences</h3>
                  <p className="mb-4 text-gray-600 dark:text-gray-300">
                    Choose your preferred currency for displaying rates and budget amounts throughout the app.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="currency" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Display Currency
                      </label>
                      <select
                        id="currency"
                        value={currency}
                        onChange={(event) => {
                          const newCurrency = event.target.value as "USD" | "EUR" | "GBP";
                          console.log('💱 Currency changed from', currency, 'to', newCurrency);
                          setCurrency(newCurrency);
                        }}
                        className="block w-full rounded-md border border-gray-300/50 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 bg-white backdrop-blur-sm"
                      >
                        <option value="USD">US Dollar ($)</option>
                        <option value="EUR">Euro (€)</option>
                        <option value="GBP">British Pound (£)</option>
                      </select>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        This will change how currency amounts are displayed in projects, budgets, and reports.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div>
                <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Notifications & Attention</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Configure how you want to be notified when interruptions occur. Push notifications will be automatically requested when needed.
              </p>

              <div className="space-y-6">
                {/* In-App Attention */}
                <div>
                  <h4 className="font-medium mb-3 text-gray-900 dark:text-white">In-App Attention</h4>
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
                        <label htmlFor="soundEnabled" className="ml-2 text-sm text-gray-900 dark:text-white">
                          Play alert sounds
                        </label>
                      </div>
                      {!isSoundSupported() && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">Not supported</span>
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
                        <label htmlFor="vibrationEnabled" className="ml-2 text-sm text-gray-900 dark:text-white">
                          Vibrate device (mobile)
                        </label>
                      </div>
                      {!isVibrationSupported() && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">Not supported</span>
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
                        <label htmlFor="wakeLockEnabled" className="ml-2 text-sm text-gray-900 dark:text-white">
                          Keep screen awake during timing
                        </label>
                      </div>
                      {!isWakeLockSupported() && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">Not supported</span>
                      )}
                    </div>
                  </div>
                  {isBadgeSupported() && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      App badge counts are automatically enabled
                    </p>
                  )}
                  
                  {/* Test Notification Button */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={async () => {
                        const permission = Notification.permission;
                        if (permission === 'granted') {
                          new Notification('Test Notification', {
                            body: 'If you see this, notifications are working! 🎉',
                            icon: '/icons/timer.svg',
                            badge: '/icons/badge.svg'
                          });
                          toast.success('Test notification sent!');
                        } else if (permission === 'default') {
                          const result = await Notification.requestPermission();
                          if (result === 'granted') {
                            new Notification('Test Notification', {
                              body: 'Notifications enabled! 🎉',
                              icon: '/icons/timer.svg'
                            });
                            toast.success('Notifications enabled!');
                          } else {
                            toast.error('Notification permission denied');
                          }
                        } else {
                          toast.error('Notifications are blocked. Please enable them in your browser settings.');
                        }
                      }}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Test Notification
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Current permission: <span className="font-mono">{typeof Notification !== 'undefined' ? Notification.permission : 'not supported'}</span>
                    </p>
                  </div>
                </div>

                {/* Escalation Channels */}
                <div>
                  <h4 className="font-medium mb-3 text-gray-900 dark:text-white">Escalation Channels</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
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
                        <label htmlFor="emailFallbackEnabled" className="ml-2 text-sm text-gray-900 dark:text-white">
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
                            className="block w-full px-3 py-2 border border-gray-300/50 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 backdrop-blur-sm"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400">
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
                        <label htmlFor="smsFallbackEnabled" className="ml-2 text-sm text-gray-900 dark:text-white">
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
                            className="block w-full px-3 py-2 border border-gray-300/50 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 backdrop-blur-sm"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400">
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
                        <label htmlFor="slackFallbackEnabled" className="ml-2 text-sm text-gray-900 dark:text-white">
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
                            className="block w-full px-3 py-2 border border-gray-300/50 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 backdrop-blur-sm"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            We'll send a concise alert with action links to this webhook URL.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quiet Hours */}
                <div>
                  <h4 className="font-medium mb-3 text-gray-900 dark:text-white">Quiet Hours</h4>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="doNotDisturbEnabled"
                        checked={doNotDisturbEnabled}
                        onChange={(event) => setDoNotDisturbEnabled(event.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="doNotDisturbEnabled" className="ml-2 text-sm text-gray-900 dark:text-white">
                        Enable quiet hours
                      </label>
                    </div>

                    {doNotDisturbEnabled && (
                      <div className="ml-6 grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="quietHoursStart" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Start time
                          </label>
                          <input
                            type="time"
                            id="quietHoursStart"
                            value={quietHoursStart}
                            onChange={(event) => setQuietHoursStart(event.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300/50 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 backdrop-blur-sm"
                          />
                        </div>
                        <div>
                          <label htmlFor="quietHoursEnd" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            End time
                          </label>
                          <input
                            type="time"
                            id="quietHoursEnd"
                            value={quietHoursEnd}
                            onChange={(event) => setQuietHoursEnd(event.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300/50 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 backdrop-blur-sm"
                          />
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      We'll honor quiet hours in your {notificationPrefs?.timezone ?? defaultTimezone} timezone and pause alerts when your OS-level Do Not Disturb is active.
                    </p>
                  </div>
                </div>

                {/* Escalation */}
                <div>
                  <h4 className="font-medium mb-3 text-gray-900 dark:text-white">Escalation Timing</h4>
                  <div>
                    <label htmlFor="escalationDelayMinutes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Escalation delay (minutes)
                    </label>
                    <select
                      id="escalationDelayMinutes"
                      value={escalationDelayMinutes}
                      onChange={(event) => setEscalationDelayMinutes(Number(event.target.value))}
                      className="block w-full px-3 py-2 border border-gray-300/50 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 backdrop-blur-sm"
                    >
                      <option value={1}>1 minute</option>
                      <option value={2}>2 minutes</option>
                      <option value={5}>5 minutes</option>
                      <option value={10}>10 minutes</option>
                    </select>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      How long to wait before trying the backup channels above.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "team" && (
            <div className="space-y-6">
              {!hasOrganization ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-300">No organization available.</p>
                </div>
              ) : !canManage ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-300">
                    Only organization owners and admins can manage members and invitations.
                  </p>
                </div>
              ) : (
                <>
                  {/* Workspace Settings Section */}
                  <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Workspace Settings</h3>
                    </div>
                    {isEditingSettings ? (
                      <form onSubmit={handleUpdateSettings} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                            Workspace name
                          </label>
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                            placeholder="My Workspace"
                            autoFocus
                            maxLength={100}
                          />
                        </div>
                        <ColorPicker
                          value={newColor}
                          onChange={setNewColor}
                          label="Workspace color"
                          helpText="Pick a color to help identify your workspace"
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors"
                          >
                            Save Changes
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditSettings}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600"
                            style={{ backgroundColor: activeOrganization?.color ?? "#8b5cf6" }}
                            title="Workspace color"
                          />
                          <p className="text-lg font-medium text-gray-900 dark:text-white">
                            {activeOrganization?.name}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={startEditSettings}
                          className="text-sm text-primary hover:underline"
                        >
                          Edit workspace settings
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Work Members Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Work Members</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      Manage who can access <strong>{activeOrganization?.name}</strong> and control their roles.
                    </p>
                    {isMembersLoading ? (
                      <div className="animate-pulse h-24 bg-gray-100 dark:bg-gray-800 rounded" />
                    ) : sortedMembers.length === 0 ? (
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        No active members yet. Send an invitation to add your teammates.
                      </p>
                    ) : (
                      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {sortedMembers.map(({ membership, user }) => {
                          const displayName = user?.name ?? user?.email ?? "Member";
                          const initials = getUserInitials(user);
                          const RoleIcon = getRoleIcon(membership.role);
                          const roleBadgeColors = getRoleBadgeColors(membership.role);
                          const canRemove =
                            membership._id !== activeMembershipId &&
                            (membership.role !== "owner" || activeRole === "owner");

                          return (
                            <li key={membership._id} className="flex items-center justify-between gap-4 py-4">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                {/* Avatar */}
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-600 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                                  {initials}
                                </div>

                                {/* User Info */}
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-gray-900 dark:text-white truncate">{displayName}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {user?.email ?? "Pending user setup"}
                                  </p>
                                </div>
                              </div>

                              {/* Role Badge and Actions */}
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${roleBadgeColors}`}>
                                  <RoleIcon className="h-3 w-3" />
                                  {membership.role.charAt(0).toUpperCase() + membership.role.slice(1)}
                                </span>
                                {canRemove && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMember(membership._id, displayName)}
                                    disabled={memberInProgress === membership._id}
                                    className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:text-gray-400 disabled:hover:bg-transparent"
                                    title="Remove member"
                                  >
                                    {memberInProgress === membership._id ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  {/* Invitation Form - Hidden for Personal Workspaces */}
                  {!isPersonalWorkspace && (
                    <form onSubmit={handleInvite} className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 space-y-4">
                      <div>
                        <h4 className="text-base font-medium text-gray-900 dark:text-white">Invite a teammate</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Send an invitation to collaborate on projects and track time together.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                            Email address
                          </label>
                          <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                            placeholder="teammate@example.com"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                            Role
                          </label>
                          <select
                            value={role}
                            onChange={(event) => setRole(event.target.value as MembershipRole)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                          >
                            {ROLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isSending}
                          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover shadow-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {isSending ? "Sending..." : "Send Invitation"}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Pending Invitations - Hidden for Personal Workspaces */}
                  {!isPersonalWorkspace && (
                    <div>
                      <h4 className="text-base font-medium mb-3 text-gray-900 dark:text-white">Pending invitations</h4>
                      {isInvitationsLoading ? (
                        <div className="animate-pulse h-20 bg-gray-100 dark:bg-gray-800 rounded" />
                      ) : sortedInvitations.length === 0 ? (
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          There are no outstanding invitations right now.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                              <tr>
                                <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                  Email
                                </th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                  Role
                                </th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                  Status
                                </th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                  Expires
                                </th>
                                <th className="px-4 py-2" />
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {sortedInvitations.map((invitation) => {
                                const expiration = new Date(invitation.expiresAt);
                                const isActioning = invitationInProgress === invitation._id;
                                const isPending = invitation.effectiveStatus === "pending";
                                const isExpired = invitation.effectiveStatus === "expired";

                                return (
                                  <tr key={invitation._id}>
                                    <td className="px-4 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100">
                                      {invitation.email}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300 capitalize">
                                      {invitation.role}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                      <span
                                        className={
                                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium " +
                                          (isPending
                                            ? "bg-green-100 text-green-800"
                                            : isExpired
                                            ? "bg-yellow-100 text-yellow-800"
                                            : invitation.effectiveStatus === "revoked"
                                            ? "bg-gray-200 text-gray-700"
                                            : "bg-blue-100 text-blue-800")
                                        }
                                      >
                                        {invitation.effectiveStatus.charAt(0).toUpperCase() +
                                          invitation.effectiveStatus.slice(1)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-gray-600 dark:text-gray-300">
                                      {expiration.toLocaleDateString()} {expiration.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                      <div className="flex gap-1 justify-end">
                                        <button
                                          type="button"
                                          onClick={() => copyInviteLink(invitation.token)}
                                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded transition-colors disabled:text-gray-400 disabled:hover:bg-transparent"
                                          disabled={!isPending}
                                          title="Copy invitation link"
                                        >
                                          <Copy className="h-3.5 w-3.5" />
                                          Copy
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleResend(invitation._id)}
                                          disabled={isActioning}
                                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded transition-colors disabled:text-gray-400 disabled:hover:bg-transparent"
                                          title="Resend invitation"
                                        >
                                          <RefreshCw className="h-3.5 w-3.5" />
                                          Resend
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRevoke(invitation._id)}
                                          disabled={isActioning || !isPending}
                                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:text-gray-400 disabled:hover:bg-transparent"
                                          title="Revoke invitation"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                          Revoke
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-4">
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
          </div>
        )}
      </div>
    </div>
  );
}
