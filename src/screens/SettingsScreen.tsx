/**
 * SettingsScreen — real profile data, functional logout, notification toggle.
 */
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Appearance,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Share,
  useColorScheme,
} from "react-native";

import { useCurrentCycle } from "@/hooks/useCurrentCycle";
import {
  useDeleteAllData,
  useEndCurrentCycle,
  useResetPredictions,
  useStartNewCycle,
} from "@/hooks/useCycleActions";
import {
  useNotificationPreferences,
  useProfile,
  useUpdateNotificationPreferences,
  useUpdateProfile,
} from "@/hooks/useProfile";
import { signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { HeaderBar } from "@/src/components/ui/HeaderBar";
import { Screen } from "@/src/components/ui/Screen";
import { AccountProfileSection } from "@/src/components/settings/AccountProfileSection";
import { AccountActionsSection } from "@/src/components/settings/AccountActionsSection";
import { CycleActionsSection } from "@/src/components/settings/CycleActionsSection";
import { NotificationsSection } from "@/src/components/settings/NotificationsSection";
import { PreferencesSection } from "@/src/components/settings/PreferencesSection";
import { PrivacySection } from "@/src/components/settings/PrivacySection";
import { SettingsProfileHeader } from "@/src/components/settings/SettingsProfileHeader";
import { ThemeSection } from "@/src/components/settings/ThemeSection";
import {
  getAnalyticsConsentStatus,
  requestAnalyticsConsent,
  revokeAnalyticsConsent,
  track,
} from "@/src/services/analytics";
import {
  getConsentSnapshot,
  setAnalyticsConsent,
} from "@/src/services/consentService";
import { HapticsService } from "@/src/services/haptics/HapticsService";
import {
  cancelAllNotifications,
  requestPermissions,
  scheduleDailyLogReminder,
} from "@/src/services/notificationService";
import { logDataAccess } from "@/src/services/auditService";
import { validateIsoDate, validateMinimumAge } from "@/src/utils/validation";

export function SettingsScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const notificationPreferences = useNotificationPreferences();
  const updateNotificationPreferences = useUpdateNotificationPreferences();
  const startNewCycle = useStartNewCycle();
  const endCurrentCycle = useEndCurrentCycle();
  const resetPredictions = useResetPredictions();
  const deleteAllData = useDeleteAllData();

  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [cycleLength, setCycleLength] = useState("28");
  const [periodDuration, setPeriodDuration] = useState("5");

  const [activeTheme, setActiveTheme] = useState<"Cream" | "Midnight">(
    isDark ? "Midnight" : "Cream",
  );

  const { data: currentCycleData } = useCurrentCycle(
    profile?.cycle_length_average ?? 28,
    profile?.period_duration_average ?? 5,
  );

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name ?? "");
    setUsername(profile.username ?? "");
    setDateOfBirth(profile.date_of_birth ?? "");
    setCycleLength(String(profile.cycle_length_average ?? 28));
    setPeriodDuration(String(profile.period_duration_average ?? 5));
  }, [profile]);

  useEffect(() => {
    void (async () => {
      const consent =
        typeof getAnalyticsConsentStatus === "function"
          ? await getAnalyticsConsentStatus()
          : false;
      setAnalyticsEnabled(consent);
    })();
  }, []);

  function handleThemeSelect(themeId: "Cream" | "Midnight") {
    setActiveTheme(themeId);
    if (themeId === "Midnight") {
      Appearance.setColorScheme("dark");
    } else {
      Appearance.setColorScheme("light");
    }
  }

  const displayName = profile?.first_name || profile?.username || "You";
  const isUsernameLocked = Boolean(profile?.username?.trim());
  const notificationsEnabled =
    notificationPreferences.data?.daily_reminders ?? false;
  const isNotificationSaving = updateNotificationPreferences.isPending;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : null;

  const hasChanges = useMemo(() => {
    if (!profile) return false;
    return (
      firstName.trim() !== (profile.first_name ?? "") ||
      (!isUsernameLocked &&
        username.trim().toLowerCase() !==
          (profile.username ?? "").trim().toLowerCase()) ||
      dateOfBirth.trim() !== (profile.date_of_birth ?? "") ||
      Number(cycleLength) !== profile.cycle_length_average ||
      Number(periodDuration) !== profile.period_duration_average
    );
  }, [
    profile,
    firstName,
    username,
    dateOfBirth,
    cycleLength,
    periodDuration,
    isUsernameLocked,
  ]);

  const validationErrors = useMemo(() => {
    if (!profile) {
      return {
        firstName: null,
        username: null,
        dateOfBirth: null,
        cycleLength: null,
        periodDuration: null,
      };
    }

    const normalizedFirstName = firstName.trim();
    const normalizedUsername = username
      .trim()
      .replace(/\s+/g, "")
      .toLowerCase();
    const normalizedDob = dateOfBirth.trim();
    const cycleLengthValue = Number(cycleLength);
    const periodDurationValue = Number(periodDuration);

    return {
      firstName: normalizedFirstName
        ? null
        : "Please enter your first name.",
      username:
        isUsernameLocked || normalizedUsername
          ? null
          : "Please choose a username.",
      dateOfBirth:
        normalizedDob && !validateIsoDate(normalizedDob)
          ? "Use YYYY-MM-DD format for date of birth."
          : normalizedDob && !validateMinimumAge(normalizedDob, 13)
            ? "You must be at least 13 years old to use Soma without parental consent."
            : null,
      cycleLength:
        Number.isFinite(cycleLengthValue) &&
        cycleLengthValue >= 15 &&
        cycleLengthValue <= 60
          ? null
          : "Cycle length must be between 15 and 60 days.",
      periodDuration:
        Number.isFinite(periodDurationValue) &&
        periodDurationValue >= 1 &&
        periodDurationValue <= 15
          ? null
          : "Period duration must be between 1 and 15 days.",
    };
  }, [
    profile,
    firstName,
    username,
    dateOfBirth,
    cycleLength,
    periodDuration,
    isUsernameLocked,
  ]);

  const firstValidationError = useMemo(
    () =>
      Object.values(validationErrors).find(
        (value): value is string => Boolean(value),
      ) ?? null,
    [validationErrors],
  );

  const isFormValid = firstValidationError === null;

  const sectionCardStyle = {
    marginTop: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.7)",
    backgroundColor: isDark ? "rgba(30,33,40,0.85)" : "rgba(255,255,255,0.75)",
    padding: 20,
    shadowColor: "#DDA7A5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  };

  async function handleNotificationToggle(value: boolean) {
    void HapticsService.selection();
    try {
      if (value) {
        const result = await requestPermissions();
        if (!result.granted) {
          try {
            await updateNotificationPreferences.mutateAsync({
              daily_reminders: false,
            });
          } catch {
            // Keep UX safe even if persistence fails.
          }
          void HapticsService.error();
          Alert.alert(
            "Permission Required",
            "Please enable notifications in your device settings.",
          );
          return;
        }

        await scheduleDailyLogReminder(20, 0);
        void HapticsService.success();
      } else {
        await cancelAllNotifications();
        void HapticsService.selection();
      }

      await updateNotificationPreferences.mutateAsync({
        daily_reminders: value,
      });
    } catch (error: unknown) {
      // If enabling reminders fails after scheduling, cancel to keep state consistent.
      if (value) {
        try {
          await cancelAllNotifications();
        } catch {
          // Best-effort rollback only.
        }
      }
      void HapticsService.error();
      const message =
        error instanceof Error
          ? error.message
          : "Could not update notification preference.";
      Alert.alert("Preference Update Failed", message);
    }
  }

  async function handleAnalyticsToggle(value: boolean) {
    void HapticsService.selection();
    setAnalyticsEnabled(value);
    try {
      await setAnalyticsConsent(value);
      if (value) {
        if (typeof requestAnalyticsConsent === "function") {
          await requestAnalyticsConsent();
        }
      } else {
        if (typeof revokeAnalyticsConsent === "function") {
          await revokeAnalyticsConsent();
        }
      }
      track("analytics_consent_updated", { granted: value });
    } catch (error: unknown) {
      setAnalyticsEnabled(!value);
      const message =
        error instanceof Error
          ? error.message
          : "Could not update analytics consent.";
      Alert.alert("Consent Update Failed", message);
    }
  }

  async function handleSaveProfile() {
    const normalizedFirstName = firstName.trim();
    const normalizedUsername = username
      .trim()
      .replace(/\s+/g, "")
      .toLowerCase();
    const resolvedUsername = isUsernameLocked
      ? (profile?.username ?? "")
      : normalizedUsername;
    const normalizedDob = dateOfBirth.trim();
    const cycleLengthValue = Number(cycleLength);
    const periodDurationValue = Number(periodDuration);

    if (!normalizedFirstName) {
      void HapticsService.error();
      Alert.alert("Missing name", "Please enter your first name.");
      return;
    }
    if (!resolvedUsername) {
      void HapticsService.error();
      Alert.alert("Missing username", "Please choose a username.");
      return;
    }
    if (normalizedDob && !validateIsoDate(normalizedDob)) {
      void HapticsService.error();
      Alert.alert("Invalid date", "Use YYYY-MM-DD format for date of birth.");
      return;
    }
    if (normalizedDob && !validateMinimumAge(normalizedDob, 13)) {
      void HapticsService.error();
      Alert.alert(
        "Age requirement",
        "You must be at least 13 years old to use Soma without parental consent.",
      );
      return;
    }
    if (
      !Number.isFinite(cycleLengthValue) ||
      cycleLengthValue < 15 ||
      cycleLengthValue > 60
    ) {
      void HapticsService.error();
      Alert.alert(
        "Invalid cycle length",
        "Cycle length must be between 15 and 60 days.",
      );
      return;
    }
    if (
      !Number.isFinite(periodDurationValue) ||
      periodDurationValue < 1 ||
      periodDurationValue > 15
    ) {
      void HapticsService.error();
      Alert.alert(
        "Invalid period duration",
        "Period duration must be between 1 and 15 days.",
      );
      return;
    }

    try {
      await HapticsService.impactMedium();
      const basePayload = {
        first_name: normalizedFirstName,
        date_of_birth: normalizedDob || null,
        cycle_length_average: cycleLengthValue,
        period_duration_average: periodDurationValue,
      };

      await updateProfile.mutateAsync(
        isUsernameLocked
          ? basePayload
          : { ...basePayload, username: resolvedUsername },
      );
      await HapticsService.success();
      setIsEditMode(false);
      Alert.alert("Saved", "Your settings were updated.");
    } catch (error: unknown) {
      await HapticsService.error();
      const message =
        error instanceof Error
          ? error.message
          : "Could not update your settings.";
      Alert.alert("Save Failed", message);
    }
  }

  function handleEditProfile() {
    setIsEditMode(true);
  }

  function handleCancelEdit() {
    if (profile) {
      setFirstName(profile.first_name ?? "");
      setUsername(profile.username ?? "");
      setDateOfBirth(profile.date_of_birth ?? "");
      setCycleLength(String(profile.cycle_length_average ?? 28));
      setPeriodDuration(String(profile.period_duration_average ?? 5));
    }
    setIsEditMode(false);
  }

  async function handleLogout() {
    void HapticsService.impactMedium();
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            await signOut();
            await HapticsService.success();
            router.replace("/auth/login" as never);
          } catch (error: unknown) {
            await HapticsService.error();
            const message =
              error instanceof Error ? error.message : "Sign out failed.";
            Alert.alert("Error", message);
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  }

  function handleStartPeriodToday() {
    Alert.alert("Start New Period", "Mark today as Day 1 of a new period?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Start",
        onPress: async () => {
          try {
            await startNewCycle.mutateAsync();
            Alert.alert("Saved", "New period started today.");
          } catch (error: unknown) {
            const message =
              error instanceof Error
                ? error.message
                : "Could not start a new period.";
            Alert.alert("Action Failed", message);
          }
        },
      },
    ]);
  }

  function handleEndPeriodToday() {
    Alert.alert(
      "End Current Period",
      "Mark today as the end of your current period?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End",
          onPress: async () => {
            try {
              await endCurrentCycle.mutateAsync();
              Alert.alert("Saved", "Current period ended today.");
            } catch (error: unknown) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Could not end the current period.";

              // IMPROVED: Better error messages
              if (
                message.includes("No active period") ||
                message.includes("already ended")
              ) {
                Alert.alert(
                  "No Active Period",
                  "There's no active period to end. Start a new period first.",
                );
              } else if (
                message.includes("network") ||
                message.includes("offline")
              ) {
                Alert.alert(
                  "Connection Issue",
                  message.includes("offline")
                    ? "You're offline. The period will be ended when you're online again."
                    : "Connection error. Please check your internet and try again.",
                );
              } else if (
                message.includes("Invalid") ||
                message.includes("format")
              ) {
                Alert.alert(
                  "Data Error",
                  "Your period data appears corrupted. Please contact support.",
                );
              } else {
                Alert.alert("Action Failed", message);
              }
            }
          },
        },
      ],
    );
  }

  function handleDeleteAllData() {
    Alert.alert(
      "Delete all data?",
      "This permanently deletes your cycle history, logs, and partner links. You will be signed out after deletion. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAllData.mutateAsync();
              Alert.alert(
                "Deleted",
                "Your cycle data was deleted. You can start again from onboarding.",
              );
              await signOut();
              router.replace("/auth/login" as never);
            } catch (error: unknown) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Could not delete your data.";
              Alert.alert("Delete Failed", message);
            }
          },
        },
      ],
    );
  }

  function handleResetPredictions() {
    const cycleLengthValue = Number(cycleLength);
    const periodDurationValue = Number(periodDuration);

    Alert.alert(
      "Reset predictions?",
      "This recalculates predictions using your current cycle settings. Your logs and cycle history will remain unchanged.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          onPress: async () => {
            try {
              const result = await resetPredictions.mutateAsync({
                cycleLength: cycleLengthValue,
                periodLength: periodDurationValue,
              });

              Alert.alert(
                "Predictions updated",
                result.updatedCycles > 0
                  ? "Cycle predictions were recalculated successfully."
                  : "No active cycle found. Logs and history are unchanged.",
              );
            } catch (error: unknown) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Could not reset predictions.";
              Alert.alert("Action Failed", message);
            }
          },
        },
      ],
    );
  }

  async function handleExportData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Not signed in", "Please sign in first.");
        return;
      }

      const [
        { data: profileRow, error: profileError },
        { data: cycles, error: cyclesError },
        { data: logs, error: logsError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id,first_name,username,cycle_length_average,period_duration_average,is_onboarded",
          )
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("cycles")
          .select(
            "start_date,end_date,cycle_length,predicted_ovulation,predicted_next_cycle,current_phase",
          )
          .eq("user_id", user.id)
          .order("start_date", { ascending: false }),
        supabase
          .from("daily_logs")
          .select(
            "date,cycle_day,flow_level,mood,energy_level,symptoms,notes,hydration_glasses,sleep_hours,partner_alert",
          )
          .eq("user_id", user.id)
          .order("date", { ascending: false }),
      ]);

      if (profileError) throw profileError;
      if (cyclesError) throw cyclesError;
      if (logsError) throw logsError;

      const consentSnapshot = await getConsentSnapshot();

      const exportJson = {
        exported_at: new Date().toISOString(),
        profile: profileRow,
        cycles: cycles ?? [],
        daily_logs: logs ?? [],
        consent_snapshot: consentSnapshot,
      };

      const csvHeader =
        "date,cycle_day,flow_level,mood,energy_level,symptoms,notes,hydration_glasses,sleep_hours,partner_alert";
      const csvRows = (logs ?? []).map((row) => {
        const symptoms = `\"${(row.symptoms ?? []).join("|")}\"`;
        const notes = `\"${String(row.notes ?? "").replaceAll('"', '""')}\"`;
        return [
          row.date ?? "",
          row.cycle_day ?? "",
          row.flow_level ?? "",
          row.mood ?? "",
          row.energy_level ?? "",
          symptoms,
          notes,
          row.hydration_glasses ?? "",
          row.sleep_hours ?? "",
          row.partner_alert ? "true" : "false",
        ].join(",");
      });
      const csv = [csvHeader, ...csvRows].join("\n");

      Alert.alert("Export Data", "Choose a format", [
        { text: "Cancel", style: "cancel" },
        {
          text: "JSON",
          onPress: async () => {
            await logDataAccess("gdpr_data_rights", "export", {
              format: "json",
              cycle_count: (cycles ?? []).length,
              log_count: (logs ?? []).length,
            });
            await Share.share({ message: JSON.stringify(exportJson, null, 2) });
          },
        },
        {
          text: "CSV",
          onPress: async () => {
            await logDataAccess("gdpr_data_rights", "export", {
              format: "csv",
              log_count: (logs ?? []).length,
            });
            await Share.share({ message: csv });
          },
        },
      ]);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Could not export your data.";
      Alert.alert("Export Failed", message);
    }
  }

  async function handleSendFeedback() {
    const manifestExtra = (Constants.manifest2?.extra ?? {}) as Record<
      string,
      string | undefined
    >;
    const appVersion =
      Constants.expoConfig?.version ??
      manifestExtra.version ??
      "unknown";
    const userHint = profile?.username ? `@${profile.username}` : "anonymous";
    const body = [
      "Please describe the issue:",
      "",
      "--- Diagnostics ---",
      `Platform: ${Platform.OS}`,
      `App Version: ${appVersion}`,
      `Theme: ${activeTheme}`,
      `User: ${userHint}`,
    ].join("\n");
    const emailUrl = `mailto:support@soma-app.com?subject=${encodeURIComponent("Soma Issue Report")}&body=${encodeURIComponent(body)}`;
    const canOpen = await Linking.canOpenURL(emailUrl);
    if (!canOpen) {
      Alert.alert("Unavailable", "Could not open your email app.");
      return;
    }
    track("feedback_submitted");
    await Linking.openURL(emailUrl);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={96}
    >
      <Screen>
      <SettingsProfileHeader
        isDark={isDark}
        isLoading={isLoading}
        displayName={displayName}
        memberSince={memberSince}
      />

      <HeaderBar title="Settings" />

      <AccountProfileSection
        isDark={isDark}
        cardStyle={sectionCardStyle}
        isEditMode={isEditMode}
        handleEditProfile={handleEditProfile}
        firstName={firstName}
        setFirstName={setFirstName}
        username={username}
        setUsername={setUsername}
        dateOfBirth={dateOfBirth}
        setDateOfBirth={setDateOfBirth}
        isUsernameLocked={isUsernameLocked}
        validationErrors={{
          firstName: validationErrors.firstName,
          username: validationErrors.username,
          dateOfBirth: validationErrors.dateOfBirth,
        }}
      />

      <PreferencesSection
        isDark={isDark}
        cardStyle={sectionCardStyle}
        cycleLength={cycleLength}
        setCycleLength={setCycleLength}
        periodDuration={periodDuration}
        setPeriodDuration={setPeriodDuration}
        isEditMode={isEditMode}
        validationErrors={{
          cycleLength: validationErrors.cycleLength,
          periodDuration: validationErrors.periodDuration,
        }}
        handleCancelEdit={handleCancelEdit}
        handleSaveProfile={handleSaveProfile}
        isSaveDisabled={updateProfile.isPending || !hasChanges || !isFormValid}
        isSavePending={updateProfile.isPending}
        isFormValid={isFormValid}
        firstValidationError={firstValidationError}
      />

      <CycleActionsSection
        isDark={isDark}
        cardStyle={sectionCardStyle}
        isResetPending={resetPredictions.isPending}
        isStartPending={startNewCycle.isPending}
        isEndPending={endCurrentCycle.isPending}
        activeCycleStartDate={currentCycleData?.cycle?.start_date}
        handleResetPredictions={handleResetPredictions}
        handleStartPeriodToday={handleStartPeriodToday}
        handleEndPeriodToday={handleEndPeriodToday}
      />

      <NotificationsSection
        isDark={isDark}
        cardStyle={sectionCardStyle}
        notificationsEnabled={notificationsEnabled}
        handleNotificationToggle={handleNotificationToggle}
        isNotificationSaving={isNotificationSaving}
        analyticsEnabled={analyticsEnabled}
        handleAnalyticsToggle={handleAnalyticsToggle}
        openPartnerSync={() => router.push("/partner" as never)}
      />

      <PrivacySection
        isDark={isDark}
        cardStyle={sectionCardStyle}
        openDataConsent={() => router.push("/legal/data-consent" as never)}
        openDataPractices={() => router.push("/legal/data-practices" as never)}
        openDataRights={() => router.push("/legal/data-rights" as never)}
        openPrivacyPolicy={() => router.push("/legal/privacy" as never)}
        openTerms={() => router.push("/legal/terms" as never)}
        openMedicalDisclaimer={() =>
          router.push("/legal/medical-disclaimer" as never)
        }
      />

      <ThemeSection
        isDark={isDark}
        cardStyle={sectionCardStyle}
        activeTheme={activeTheme}
        handleThemeSelect={handleThemeSelect}
      />

      <AccountActionsSection
        isDark={isDark}
        cardStyle={sectionCardStyle}
        isDeletePending={deleteAllData.isPending}
        isLoggingOut={isLoggingOut}
        handleExportData={handleExportData}
        handleSendFeedback={handleSendFeedback}
        handleDeleteAllData={handleDeleteAllData}
        handleLogout={handleLogout}
      />
      </Screen>
    </KeyboardAvoidingView>
  );
}
