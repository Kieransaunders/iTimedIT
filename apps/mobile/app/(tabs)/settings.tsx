import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../utils/ThemeContext";
import { spacing, typography } from "../../utils/theme";
import {
  soundManager,
  SoundPreferences,
  BUILT_IN_SOUNDS,
  playTestSound,
} from "../../services/soundManager";
import SoundSelectionModal from "../../components/common/SoundSelectionModal";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import Toast from "react-native-toast-message";
import { useAuth } from "@/hooks/useAuth";
import { getUserDisplayName, getUserInitials, getUserEmail, isAnonymousUser } from "@/utils/userUtils";
import { useRouter } from "expo-router";
import { OrganizationSelector } from "@/components";

type SoundType = 'breakStart' | 'breakEnd' | 'interrupt' | 'overrun';

// Preset intervals in minutes
const INTERRUPT_INTERVALS = [
  { label: "5 seconds (Debug)", value: 0.0833 },
  { label: "5 minutes", value: 5 },
  { label: "15 minutes", value: 15 },
  { label: "30 minutes", value: 30 },
  { label: "45 minutes", value: 45 },
  { label: "60 minutes", value: 60 },
  { label: "2 hours", value: 120 },
  { label: "Custom", value: -1 },
];

// Preset grace periods in seconds
const GRACE_PERIODS = [
  { label: "5 seconds", value: 5 },
  { label: "10 seconds", value: 10 },
  { label: "30 seconds", value: 30 },
  { label: "60 seconds", value: 60 },
  { label: "2 minutes", value: 120 },
  { label: "Custom", value: -1 },
];

const CURRENCIES = [
  { label: "USD ($)", value: "USD" },
  { label: "EUR (€)", value: "EUR" },
  { label: "GBP (£)", value: "GBP" },
];

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const currentMembership = useQuery(api.organizations.currentMembership);

  const [preferences, setPreferences] = useState<SoundPreferences>({
    enabled: true,
    breakStartSound: 'marimba',
    breakEndSound: 'nailed-it',
    interruptSound: 'times-up',
    overrunSound: 'alert',
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSoundType, setSelectedSoundType] = useState<SoundType>('breakStart');

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        onPress: async () => {
          await signOut();
          router.replace('/auth/sign-in');
          Toast.show({
            type: 'success',
            text1: 'Signed out successfully',
          });
        },
        style: "destructive",
      },
    ]);
  };

  const userSettings = useQuery(api.users.getUserSettings);
  const updateSettings = useMutation(api.users.updateUserSettings);

  const [interruptEnabled, setInterruptEnabled] = useState(true);
  const [interruptInterval, setInterruptInterval] = useState(45);
  const [isCustomInterval, setIsCustomInterval] = useState(false);
  const [customInterval, setCustomInterval] = useState('45');
  const [gracePeriod, setGracePeriod] = useState(60);
  const [isCustomGracePeriod, setIsCustomGracePeriod] = useState(false);
  const [customGracePeriod, setCustomGracePeriod] = useState('60');
  const [pomodoroEnabled, setPomodoroEnabled] = useState(false);
  const [pomodoroWork, setPomodoroWork] = useState("25");
  const [pomodoroBreak, setPomodoroBreak] = useState("5");
  const [budgetWarningEnabled, setBudgetWarningEnabled] = useState(true);
  const [budgetThresholdHours, setBudgetThresholdHours] = useState("1.0");
  const [budgetThresholdAmount, setBudgetThresholdAmount] = useState("50.0");
  const [currency, setCurrency] = useState<"USD" | "EUR" | "GBP">("USD");

  // Modal states
  const [showIntervalModal, setShowIntervalModal] = useState(false);
  const [showGracePeriodModal, setShowGracePeriodModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  // Load sound preferences
  useEffect(() => {
    loadPreferences();
  }, []);

  // Load user settings from Convex
  useEffect(() => {
    if (!userSettings) {
      return;
    }

    const presetIntervalValues = INTERRUPT_INTERVALS.filter((item) => item.value !== -1).map((item) => item.value);
    const intervalValue = userSettings.interruptInterval ?? 45;
    const intervalIsPreset = presetIntervalValues.includes(intervalValue);

    const presetGraceValues = GRACE_PERIODS.filter((item) => item.value !== -1).map((item) => item.value);
    const graceValue = userSettings.gracePeriod ?? 60;
    const graceIsPreset = presetGraceValues.includes(graceValue);

    const workMinutes = userSettings.pomodoroWorkMinutes ?? 25;
    const breakMinutes = userSettings.pomodoroBreakMinutes ?? 5;
    const thresholdHours = userSettings.budgetWarningThresholdHours ?? 1.0;
    const thresholdAmount = userSettings.budgetWarningThresholdAmount ?? 50.0;

    setInterruptEnabled(userSettings.interruptEnabled ?? true);
    setInterruptInterval(intervalValue);
    setIsCustomInterval(!intervalIsPreset);
    setCustomInterval(intervalValue.toString());

    setGracePeriod(graceValue);
    setIsCustomGracePeriod(!graceIsPreset);
    setCustomGracePeriod(graceValue.toString());

    setPomodoroEnabled(userSettings.pomodoroEnabled ?? false);
    setPomodoroWork(workMinutes.toString());
    setPomodoroBreak(breakMinutes.toString());

    setBudgetWarningEnabled(userSettings.budgetWarningEnabled ?? true);
    setBudgetThresholdHours(thresholdHours.toString());
    setBudgetThresholdAmount(thresholdAmount.toString());

    setCurrency((userSettings.currency as 'USD' | 'EUR' | 'GBP') ?? 'USD');
  }, [userSettings]);

  const loadPreferences = async () => {
    const prefs = soundManager.getPreferences();
    setPreferences(prefs);
  };

  // Update user settings in Convex
  const saveUserSetting = async (updates: any) => {
    try {
      await updateSettings(updates);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to Save Settings",
        text2: error.message || "Please try again.",
      });
    }
  };

  const handleToggleSound = async (enabled: boolean) => {
    await soundManager.setSoundEnabled(enabled);
    setPreferences({ ...preferences, enabled });
  };

  const openSoundModal = (type: SoundType) => {
    setSelectedSoundType(type);
    setModalVisible(true);
  };

  const handleSelectSound = async (soundId: string) => {
    const key = `${selectedSoundType}Sound` as keyof SoundPreferences;
    await soundManager.savePreferences({ [key]: soundId });
    setPreferences({ ...preferences, [key]: soundId });
  };

  const getSoundName = (soundId: string): string => {
    const builtIn = BUILT_IN_SOUNDS.find(s => s.id === soundId);
    if (builtIn) return builtIn.name;

    const custom = soundManager.getCustomSounds().find(s => s.id === soundId);
    if (custom) return custom.name;

    return 'Unknown';
  };

  const getCurrentSound = (): string => {
    const key = `${selectedSoundType}Sound` as keyof SoundPreferences;
    return preferences[key] as string;
  };

  const getModalTitle = (): string => {
    switch (selectedSoundType) {
      case 'breakStart':
        return 'Break Start Sound';
      case 'breakEnd':
        return 'Break End Sound';
      case 'interrupt':
        return 'Timer Interrupt Sound';
      case 'overrun':
        return 'Overrun Alert Sound';
    }
  };

  // Interrupt settings handlers
  const handleInterruptToggle = async (enabled: boolean) => {
    setInterruptEnabled(enabled);
    await saveUserSetting({ interruptEnabled: enabled });
  };

  const handleIntervalSelect = async (value: number) => {
    if (value === -1) {
      setIsCustomInterval(true);
      setShowIntervalModal(false);
      setCustomInterval((prev) => prev || interruptInterval.toString());
    } else {
      setInterruptInterval(value);
      setIsCustomInterval(false);
      setCustomInterval(value.toString());
      setShowIntervalModal(false);
      await saveUserSetting({ interruptInterval: value });
    }
  };

  const handleCustomIntervalSave = async () => {
    const value = parseFloat(customInterval);
    if (!isNaN(value) && value >= 0.0833 && value <= 480) {
      setInterruptInterval(value);
      setIsCustomInterval(true);
      setCustomInterval(value.toString());
      await saveUserSetting({ interruptInterval: value });
    } else {
      Toast.show({
        type: "error",
        text1: "Invalid Interval",
        text2: "Please enter a value between 0.0833 and 480 minutes.",
      });
      setCustomInterval(interruptInterval.toString());
    }
  };

  const handleGracePeriodSelect = async (value: number) => {
    if (value === -1) {
      setIsCustomGracePeriod(true);
      setShowGracePeriodModal(false);
      setCustomGracePeriod((prev) => prev || gracePeriod.toString());
    } else {
      setGracePeriod(value);
      setIsCustomGracePeriod(false);
      setCustomGracePeriod(value.toString());
      setShowGracePeriodModal(false);
      await saveUserSetting({ gracePeriod: value });
    }
  };

  const handleCustomGracePeriodSave = async () => {
    const value = parseFloat(customGracePeriod);
    if (!isNaN(value) && value >= 5 && value <= 300) {
      setGracePeriod(value);
      setIsCustomGracePeriod(true);
      setCustomGracePeriod(value.toString());
      await saveUserSetting({ gracePeriod: value });
    } else {
      Toast.show({
        type: "error",
        text1: "Invalid Grace Period",
        text2: "Please enter a value between 5 and 300 seconds.",
      });
      setCustomGracePeriod(gracePeriod.toString());
    }
  };

  // Pomodoro handlers
  const handlePomodoroToggle = async (enabled: boolean) => {
    setPomodoroEnabled(enabled);
    await saveUserSetting({ pomodoroEnabled: enabled });
  };

  const handlePomodoroWorkSave = async () => {
    const value = parseInt(pomodoroWork);
    if (!isNaN(value) && value > 0 && value <= 120) {
      await saveUserSetting({ pomodoroWorkMinutes: value });
    } else {
      Toast.show({
        type: "error",
        text1: "Invalid Work Duration",
        text2: "Please enter a value between 1 and 120 minutes.",
      });
    }
  };

  const handlePomodoroBreakSave = async () => {
    const value = parseInt(pomodoroBreak);
    if (!isNaN(value) && value > 0 && value <= 60) {
      await saveUserSetting({ pomodoroBreakMinutes: value });
    } else {
      Toast.show({
        type: "error",
        text1: "Invalid Break Duration",
        text2: "Please enter a value between 1 and 60 minutes.",
      });
    }
  };

  // Budget warning handlers
  const handleBudgetWarningToggle = async (enabled: boolean) => {
    setBudgetWarningEnabled(enabled);
    await saveUserSetting({ budgetWarningEnabled: enabled });
  };

  const handleBudgetHoursSave = async () => {
    const value = parseFloat(budgetThresholdHours);
    if (!isNaN(value) && value >= 0) {
      await saveUserSetting({ budgetWarningThresholdHours: value });
    } else {
      Toast.show({
        type: "error",
        text1: "Invalid Hours",
        text2: "Please enter a valid number.",
      });
    }
  };

  const handleBudgetAmountSave = async () => {
    const value = parseFloat(budgetThresholdAmount);
    if (!isNaN(value) && value >= 0) {
      await saveUserSetting({ budgetWarningThresholdAmount: value });
    } else {
      Toast.show({
        type: "error",
        text1: "Invalid Amount",
        text2: "Please enter a valid number.",
      });
    }
  };

  // Currency handler
  const handleCurrencySelect = async (value: 'USD' | 'EUR' | 'GBP') => {
    setCurrency(value);
    setShowCurrencyModal(false);
    await saveUserSetting({ currency: value });
  };

  const getIntervalLabel = (): string => {
    if (!isCustomInterval) {
      const preset = INTERRUPT_INTERVALS.find((item) => item.value === interruptInterval);
      if (preset && preset.value !== -1) {
        return preset.label;
      }
    }
    return `${interruptInterval} minutes`;
  };

  const getGracePeriodLabel = (): string => {
    if (!isCustomGracePeriod) {
      const preset = GRACE_PERIODS.find((item) => item.value === gracePeriod);
      if (preset && preset.value !== -1) {
        return preset.label;
      }
    }
    return `${gracePeriod} seconds`;
  };

  const getCurrencyLabel = (): string => {
    const curr = CURRENCIES.find(c => c.value === currency);
    return curr?.label || "USD ($)";
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        {user && (
          <View style={[styles.profileSection, { borderBottomColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{getUserInitials(user)}</Text>
            </View>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>{getUserDisplayName(user)}</Text>
            {getUserEmail(user) && (
              <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{getUserEmail(user)}</Text>
            )}
            {currentMembership && (
              <Text style={[styles.profileEmail, { color: colors.textSecondary, marginTop: 4 }]}>
                Org ID: {currentMembership.organization._id}
              </Text>
            )}
            <TouchableOpacity
              onPress={handleSignOut}
              style={[styles.signOutButton, { backgroundColor: colors.error }]}
            >
              <Text style={styles.signOutButtonText}>
                {isAnonymousUser(user) ? 'Exit Guest Mode' : 'Sign Out'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>

        {/* Organization Settings Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
            <Ionicons name="business-outline" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Organization</Text>
          </View>

          <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Current Organization</Text>
              <OrganizationSelector 
                showLabel={false}
                compact={true}
                style={{ marginTop: 8 }}
              />
            </View>
          </View>
        </View>

        {/* Sound Preferences Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
            <Ionicons name="musical-notes" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Sound Alerts</Text>
          </View>

          {/* Enable/Disable Sounds */}
          <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Enable Sound Alerts</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Play sounds when timer events occur
              </Text>
            </View>
            <Switch
              value={preferences.enabled}
              onValueChange={handleToggleSound}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surfaceElevated}
            />
          </View>

          {/* Break Start Sound */}
          <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Break Start Sound</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {getSoundName(preferences.breakStartSound)}
              </Text>
            </View>
            <View style={styles.settingActions}>
              <TouchableOpacity
                onPress={() => playTestSound(preferences.breakStartSound)}
                style={styles.iconButton}
              >
                <Ionicons name="play-circle-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => openSoundModal('breakStart')}
                style={styles.iconButton}
              >
                <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Break End Sound */}
          <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Break End Sound</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {getSoundName(preferences.breakEndSound)}
              </Text>
            </View>
            <View style={styles.settingActions}>
              <TouchableOpacity
                onPress={() => playTestSound(preferences.breakEndSound)}
                style={styles.iconButton}
              >
                <Ionicons name="play-circle-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => openSoundModal('breakEnd')}
                style={styles.iconButton}
              >
                <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Timer Interrupt Sound */}
          <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Timer Interrupt Sound</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {getSoundName(preferences.interruptSound)}
              </Text>
            </View>
            <View style={styles.settingActions}>
              <TouchableOpacity
                onPress={() => playTestSound(preferences.interruptSound)}
                style={styles.iconButton}
              >
                <Ionicons name="play-circle-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => openSoundModal('interrupt')}
                style={styles.iconButton}
              >
                <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Overrun Alert Sound */}
          <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Overrun Alert Sound</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {getSoundName(preferences.overrunSound)}
              </Text>
            </View>
            <View style={styles.settingActions}>
              <TouchableOpacity
                onPress={() => playTestSound(preferences.overrunSound)}
                style={styles.iconButton}
              >
                <Ionicons name="play-circle-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => openSoundModal('overrun')}
                style={styles.iconButton}
              >
                <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Timer Interruption Settings */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
            <Ionicons name="timer-outline" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Timer Interruptions</Text>
          </View>

          {/* Enable Timer Interrupts */}
          <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Enable Timer Interrupts</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Prompt to confirm you’re still working
              </Text>
            </View>
            <Switch
              value={interruptEnabled}
              onValueChange={handleInterruptToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surfaceElevated}
            />
          </View>

          {/* Check Interval */}
          {interruptEnabled && (
            <>
              <TouchableOpacity
                style={[styles.settingItem, { borderBottomColor: colors.border }]}
                onPress={() => setShowIntervalModal(true)}
              >
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Check Interval</Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                    {getIntervalLabel()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Custom Interval Input */}
              {isCustomInterval && (
                <View style={[styles.settingItem, { borderBottomColor: colors.border }]}> 
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Custom Interval (minutes)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                      value={customInterval}
                      onChangeText={setCustomInterval}
                      onBlur={handleCustomIntervalSave}
                      keyboardType="decimal-pad"
                      placeholder="Enter minutes (0.0833-480)"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
              )}

              {/* Grace Period */}
              <TouchableOpacity
                style={[styles.settingItem, { borderBottomColor: colors.border }]}
                onPress={() => setShowGracePeriodModal(true)}
              >
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Auto-Stop Countdown</Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                    {getGracePeriodLabel()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Custom Grace Period Input */}
              {isCustomGracePeriod && (
                <View style={[styles.settingItem, { borderBottomColor: colors.border }]}> 
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Custom Grace Period (seconds)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                      value={customGracePeriod}
                      onChangeText={setCustomGracePeriod}
                      onBlur={handleCustomGracePeriodSave}
                      keyboardType="decimal-pad"
                      placeholder="Enter seconds (5-300)"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* Pomodoro Settings */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
            <Ionicons name="hourglass-outline" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Pomodoro Timer</Text>
          </View>

          {/* Enable Pomodoro */}
          <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Enable Pomodoro Mode</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Work in focused intervals with breaks
              </Text>
            </View>
            <Switch
              value={pomodoroEnabled}
              onValueChange={handlePomodoroToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surfaceElevated}
            />
          </View>

          {pomodoroEnabled && (
            <>
              {/* Work Duration */}
              <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Work Duration (minutes)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                    value={pomodoroWork}
                    onChangeText={setPomodoroWork}
                    onBlur={handlePomodoroWorkSave}
                    keyboardType="number-pad"
                    placeholder="25"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              {/* Break Duration */}
              <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Break Duration (minutes)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                    value={pomodoroBreak}
                    onChangeText={setPomodoroBreak}
                    onBlur={handlePomodoroBreakSave}
                    keyboardType="number-pad"
                    placeholder="5"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>
            </>
          )}
        </View>

        {/* Budget Warning Settings */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
            <Ionicons name="alert-circle-outline" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Budget Warnings</Text>
          </View>

          {/* Enable Budget Warnings */}
          <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Enable Budget Warnings</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Alert when approaching project budgets
              </Text>
            </View>
            <Switch
              value={budgetWarningEnabled}
              onValueChange={handleBudgetWarningToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surfaceElevated}
            />
          </View>

          {budgetWarningEnabled && (
            <>
              {/* Hours Threshold */}
              <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Hours Remaining Threshold</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                    value={budgetThresholdHours}
                    onChangeText={setBudgetThresholdHours}
                    onBlur={handleBudgetHoursSave}
                    keyboardType="decimal-pad"
                    placeholder="1.0"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              {/* Amount Threshold */}
              <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Amount Remaining Threshold</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                    value={budgetThresholdAmount}
                    onChangeText={setBudgetThresholdAmount}
                    onBlur={handleBudgetAmountSave}
                    keyboardType="decimal-pad"
                    placeholder="50.0"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>
            </>
          )}
        </View>

        {/* Currency Settings */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
            <Ionicons name="cash-outline" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Currency</Text>
          </View>

          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: colors.border }]}
            onPress={() => setShowCurrencyModal(true)}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Preferred Currency</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {getCurrencyLabel()}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Sound Selection Modal */}
      <SoundSelectionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        currentSound={getCurrentSound()}
        onSelect={handleSelectSound}
        title={getModalTitle()}
      />

      {/* Interrupt Interval Modal */}
      <Modal
        visible={showIntervalModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowIntervalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Check Interval</Text>
              <TouchableOpacity onPress={() => setShowIntervalModal(false)}>
                <Ionicons name="close" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={INTERRUPT_INTERVALS}
              keyExtractor={(item) => item.value.toString()}
              renderItem={({ item }) => {
                const isSelected = item.value === -1
                  ? isCustomInterval
                  : !isCustomInterval && interruptInterval === item.value;

                return (
                  <TouchableOpacity
                    style={[styles.modalItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleIntervalSelect(item.value)}
                  >
                    <Text style={[styles.modalItemText, { color: colors.textPrimary }]}>{item.label}</Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Grace Period Modal */}
      <Modal
        visible={showGracePeriodModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGracePeriodModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Auto-Stop Countdown</Text>
              <TouchableOpacity onPress={() => setShowGracePeriodModal(false)}>
                <Ionicons name="close" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={GRACE_PERIODS}
              keyExtractor={(item) => item.value.toString()}
              renderItem={({ item }) => {
                const isSelected = item.value === -1
                  ? isCustomGracePeriod
                  : !isCustomGracePeriod && gracePeriod === item.value;

                return (
                  <TouchableOpacity
                    style={[styles.modalItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleGracePeriodSelect(item.value)}
                  >
                    <Text style={[styles.modalItemText, { color: colors.textPrimary }]}>{item.label}</Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Currency Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                <Ionicons name="close" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleCurrencySelect(item.value as 'USD' | 'EUR' | 'GBP')}
                >
                  <Text style={[styles.modalItemText, { color: colors.textPrimary }]}>{item.label}</Text>
                  {currency === item.value && (
                    <Ionicons name="checkmark" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Toast Container */}
      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.title,
    fontSize: 32,
    fontWeight: '700',
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
    borderRadius: 12,
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
  },
  settingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    padding: spacing.xs,
  },
  input: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: spacing.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
    deleteButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
    profileSection: {
      alignItems: 'center',
      paddingVertical: 32,
      borderBottomWidth: 1,
      marginBottom: 24,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    avatarText: {
      color: 'white',
      fontSize: 32,
      fontWeight: 'bold',
    },
    profileName: {
      fontSize: 24,
      fontWeight: '600',
    },
    profileEmail: {
      fontSize: 16,
      marginTop: 4,
    },
    signOutButton: {
      marginTop: 24,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    signOutButtonText: {
      color: 'white',
      fontWeight: '600',
      fontSize: 16,
    },
  });
