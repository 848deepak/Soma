/**
 * SettingsScreen — real profile data, functional logout, notification toggle.
 */
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Share,
  View,
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
} from "@/hooks/useProfile";
import { signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ScreenErrorBoundary } from "@/src/components/ScreenErrorBoundary";
import { AccountActionsSection } from "@/src/components/settings/AccountActionsSection";
import { AccountProfileSection } from "@/src/components/settings/AccountProfileSection";
import { CycleActionsSection } from "@/src/components/settings/CycleActionsSection";
import { NotificationsSection } from "@/src/components/settings/NotificationsSection";
import { PreferencesSection } from "@/src/components/settings/PreferencesSection";
import { PrivacySection } from "@/src/components/settings/PrivacySection";
import { ThemeSection } from "@/src/components/settings/ThemeSection";
import { Screen } from "@/src/components/ui/Screen";
import { Typography } from "@/src/components/ui/Typography";
import { useAuthContext } from "@/src/context/AuthProvider";
import { useAppTheme } from "@/src/context/ThemeContext";
import {
  getAnalyticsConsentStatus,
  requestAnalyticsConsent,
  revokeAnalyticsConsent,
  track,
} from "@/src/services/analytics";
import { logDataAccess } from "@/src/services/auditService";
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

function formatDateOfBirth(isoDate: string | null | undefined): string {
  if (!isoDate) return "Not set";
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;

  return parsed.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function SettingsScreen() {
  const router = useRouter();
  const { isDark, theme, setTheme } = useAppTheme();
  const { isAnonymous } = useAuthContext();
  const { data: profile } = useProfile();
  const notificationPreferences = useNotificationPreferences();
  const updateNotificationPreferences = useUpdateNotificationPreferences();
  const startNewCycle = useStartNewCycle();
  const endCurrentCycle = useEndCurrentCycle();
  const resetPredictions = useResetPredictions();
  const deleteAllData = useDeleteAllData();

  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { data: currentCycleData } = useCurrentCycle(
    profile?.cycle_length_average ?? 28,
    profile?.period_duration_average ?? 5,
  );

  useEffect(() => {
    void (async () => {
      const consent =
        typeof getAnalyticsConsentStatus === "function"
          ? await getAnalyticsConsentStatus()
          : false;
      setAnalyticsEnabled(consent);
    })();
  }, []);

  function handleThemeSelect(themeId: "cream" | "midnight" | "lavender") {
    setTheme(themeId);
  }

  const notificationsEnabled =
    notificationPreferences.data?.daily_reminders ?? false;
  const isNotificationSaving = updateNotificationPreferences.isPending;
  const primarySectionStyle = {
    marginTop: 20,
  };
  const secondarySectionStyle = {
    marginTop: 24,
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

  function handleSignIn() {
    router.push("/auth/login" as never);
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
    const cycleLengthValue = profile?.cycle_length_average ?? 28;
    const periodDurationValue = profile?.period_duration_average ?? 5;

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
      Constants.expoConfig?.version ?? manifestExtra.version ?? "unknown";
    const userHint = profile?.username ? `@${profile.username}` : "anonymous";
    const body = [
      "Please describe the issue:",
      "",
      "--- Diagnostics ---",
      `Platform: ${Platform.OS}`,
      `App Version: ${appVersion}`,
      `Theme: ${theme}`,
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
    <Screen horizontalPadding={16}>
      <View style={{ marginTop: 6 }}>
        <Typography
          style={{
            fontSize: 34,
            lineHeight: 40,
            fontWeight: "700",
          }}
        >
          Settings
        </Typography>
        <Typography variant="muted" style={{ marginTop: 4 }}>
          Manage your profile and preferences.
        </Typography>
      </View>

      <AccountProfileSection
        isDark={isDark}
        sectionStyle={primarySectionStyle}
        fullName={profile?.first_name?.trim() || "Deepak"}
        username={profile?.username?.trim() || "deepak"}
        dateOfBirth={formatDateOfBirth(profile?.date_of_birth) || "24 Aug 2002"}
        openEditProfile={() => router.push("/settings/edit-profile" as never)}
      />

      <PreferencesSection
        isDark={isDark}
        sectionStyle={primarySectionStyle}
        cycleLength={String(profile?.cycle_length_average ?? 28)}
        periodDuration={String(profile?.period_duration_average ?? 5)}
        openCycleLength={() => router.push("/settings/cycle-length" as never)}
        openPeriodDuration={() => router.push("/settings/period-duration" as never)}
      />

      <NotificationsSection
        isDark={isDark}
        cardStyle={primarySectionStyle}
        notificationsEnabled={notificationsEnabled}
        handleNotificationToggle={handleNotificationToggle}
        isNotificationSaving={isNotificationSaving}
        analyticsEnabled={analyticsEnabled}
        handleAnalyticsToggle={handleAnalyticsToggle}
        openPartnerSync={() => router.push("/partner" as never)}
      />

      <PrivacySection
        isDark={isDark}
        cardStyle={primarySectionStyle}
        openDataConsent={() => router.push("/legal/data-consent" as never)}
        openDataPractices={() =>
          router.push("/legal/data-practices" as never)
        }
        openDataRights={() => router.push("/legal/data-rights" as never)}
        openPrivacyPolicy={() => router.push("/legal/privacy" as never)}
        openTerms={() => router.push("/legal/terms" as never)}
        openMedicalDisclaimer={() =>
          router.push("/legal/medical-disclaimer" as never)
        }
      />

      <Typography
        style={{
          marginTop: 30,
          marginBottom: 2,
          fontSize: 11,
          fontWeight: "600",
          letterSpacing: 2,
          textTransform: "uppercase",
          color: isDark ? "rgba(242,242,242,0.5)" : "rgba(45,35,39,0.45)",
        }}
      >
        More
      </Typography>

      <CycleActionsSection
        isDark={isDark}
        cardStyle={secondarySectionStyle}
        isResetPending={resetPredictions.isPending}
        isStartPending={startNewCycle.isPending}
        isEndPending={endCurrentCycle.isPending}
        activeCycleStartDate={currentCycleData?.cycle?.start_date}
        handleResetPredictions={handleResetPredictions}
        handleStartPeriodToday={handleStartPeriodToday}
        handleEndPeriodToday={handleEndPeriodToday}
      />

      <ThemeSection
        isDark={isDark}
        cardStyle={secondarySectionStyle}
        activeTheme={theme}
        handleThemeSelect={handleThemeSelect}
      />

      <AccountActionsSection
        isDark={isDark}
        cardStyle={secondarySectionStyle}
        isDeletePending={deleteAllData.isPending}
        isLoggingOut={isLoggingOut}
        isAnonymous={isAnonymous}
        handleExportData={handleExportData}
        handleSendFeedback={handleSendFeedback}
        handleDeleteAllData={handleDeleteAllData}
        handleLogout={handleLogout}
        handleSignIn={handleSignIn}
      />
    </Screen>
  );
}

export function SettingsScreenWithErrorBoundary() {
  return (
    <ScreenErrorBoundary screenName="SettingsScreen">
      <SettingsScreen />
    </ScreenErrorBoundary>
  );
}
