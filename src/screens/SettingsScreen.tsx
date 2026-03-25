/**
 * SettingsScreen — real profile data, functional logout, notification toggle.
 */
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Appearance,
  Linking,
  Platform,
  Share,
  Switch,
  TextInput,
  View,
  useColorScheme,
} from "react-native";

import { useCurrentCycle } from "@/hooks/useCurrentCycle";
import {
  useDeleteAllData,
  useEndCurrentCycle,
  useResetPredictions,
  useStartNewCycle,
} from "@/hooks/useCycleActions";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { HeaderBar } from "@/src/components/ui/HeaderBar";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { Screen } from "@/src/components/ui/Screen";
import { Typography } from "@/src/components/ui/Typography";
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

function SectionLabel({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <Typography
      style={{
        marginBottom: 12,
        fontSize: 11,
        fontWeight: "600",
        letterSpacing: 2,
        textTransform: "uppercase",
        color: isDark ? "rgba(242,242,242,0.5)" : "#9B7E8C",
      }}
    >
      {label}
    </Typography>
  );
}

function SettingsRow({
  title,
  tone = "normal",
  isDark,
  onPress,
}: {
  title: string;
  tone?: "normal" | "danger";
  isDark: boolean;
  onPress?: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      style={{
        marginBottom: 8,
        borderRadius: 16,
        backgroundColor: isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(255,218,185,0.2)",
        paddingHorizontal: 16,
        paddingVertical: 16,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography
          style={{
            fontSize: 15,
            color:
              tone === "danger" ? "#EF4444" : isDark ? "#F2F2F2" : "#2D2327",
          }}
        >
          {title}
        </Typography>
        <Typography
          style={{
            fontSize: 18,
            color: tone === "danger" ? "#EF4444" : "#9B7E8C",
          }}
        >
          ›
        </Typography>
      </View>
    </PressableScale>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  isDark,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  isDark: boolean;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Typography variant="helper" style={{ marginBottom: 6 }}>
        {label}
      </Typography>
      <View
        style={{
          borderRadius: 14,
          borderWidth: 1,
          borderColor: isDark
            ? "rgba(255,255,255,0.1)"
            : "rgba(221,167,165,0.3)",
          backgroundColor: isDark
            ? "rgba(255,255,255,0.04)"
            : "rgba(255,255,255,0.75)",
          paddingHorizontal: 14,
          paddingVertical: 11,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          placeholderTextColor="#9B7E8C"
          style={{
            fontSize: 15,
            color: isDark ? "#F2F2F2" : "#2D2327",
          }}
        />
      </View>
    </View>
  );
}

export function SettingsScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const startNewCycle = useStartNewCycle();
  const endCurrentCycle = useEndCurrentCycle();
  const resetPredictions = useResetPredictions();
  const deleteAllData = useDeleteAllData();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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
      username.trim() !== (profile.username ?? "") ||
      dateOfBirth.trim() !== (profile.date_of_birth ?? "") ||
      Number(cycleLength) !== profile.cycle_length_average ||
      Number(periodDuration) !== profile.period_duration_average
    );
  }, [profile, firstName, username, dateOfBirth, cycleLength, periodDuration]);

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
    setNotificationsEnabled(value);
    if (value) {
      const result = await requestPermissions();
      if (result.granted) {
        await scheduleDailyLogReminder(20, 0);
        void HapticsService.success();
      } else {
        setNotificationsEnabled(false);
        void HapticsService.error();
        Alert.alert(
          "Permission Required",
          "Please enable notifications in your device settings.",
        );
      }
    } else {
      await cancelAllNotifications();
      void HapticsService.selection();
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
    const normalizedDob = dateOfBirth.trim();
    const cycleLengthValue = Number(cycleLength);
    const periodDurationValue = Number(periodDuration);

    if (!normalizedFirstName) {
      void HapticsService.error();
      Alert.alert("Missing name", "Please enter your first name.");
      return;
    }
    if (!normalizedUsername) {
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
      await updateProfile.mutateAsync({
        first_name: normalizedFirstName,
        username: normalizedUsername,
        date_of_birth: normalizedDob || null,
        cycle_length_average: cycleLengthValue,
        period_duration_average: periodDurationValue,
      });
      await HapticsService.success();
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
    <Screen>
      {/* ── Profile header ────────────────────────────────────────── */}
      <View style={{ marginTop: 16, alignItems: "center", paddingBottom: 8 }}>
        {/* Gradient avatar circle */}
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
            backgroundColor: isDark ? "#A78BFA" : "#DDA7A5",
            shadowColor: isDark ? "#7C6BE8" : "#DDA7A5",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.4,
            shadowRadius: 24,
            elevation: 12,
          }}
        >
          {/* Inner peach circle for gradient approximation */}
          <View
            style={{
              position: "absolute",
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: isDark
                ? "rgba(167,139,250,0.6)"
                : "rgba(255,218,185,0.5)",
            }}
          />
          {!isLoading && displayName[0] ? (
            <Typography
              style={{
                fontFamily: "PlayfairDisplay-SemiBold",
                fontSize: 36,
                color: "#FFFFFF",
                lineHeight: 40,
              }}
            >
              {displayName[0].toUpperCase()}
            </Typography>
          ) : null}
        </View>

        {/* Name in Playfair Display */}
        <Typography variant="serifMd">
          {isLoading ? "···" : displayName}
        </Typography>

        {memberSince ? (
          <Typography variant="muted" style={{ marginTop: 4 }}>
            Member since {memberSince}
          </Typography>
        ) : null}
      </View>

      <HeaderBar title="Settings" />

      <View style={sectionCardStyle}>
        <SectionLabel label="Profile" isDark={isDark} />
        <InputField
          label="First name"
          value={firstName}
          onChangeText={setFirstName}
          isDark={isDark}
          placeholder="Your name"
        />
        <InputField
          label="Username"
          value={username}
          onChangeText={setUsername}
          isDark={isDark}
          placeholder="yourname"
        />
        <InputField
          label="Date of birth (YYYY-MM-DD)"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          isDark={isDark}
          placeholder="1995-08-21"
        />
      </View>

      <View style={sectionCardStyle}>
        <SectionLabel label="Cycle Defaults" isDark={isDark} />
        <InputField
          label="Cycle length (days)"
          value={cycleLength}
          onChangeText={setCycleLength}
          isDark={isDark}
          keyboardType="numeric"
        />
        <InputField
          label="Period duration (days)"
          value={periodDuration}
          onChangeText={setPeriodDuration}
          isDark={isDark}
          keyboardType="numeric"
        />

        <PressableScale
          onPress={handleSaveProfile}
          style={{
            marginTop: 6,
            alignItems: "center",
            borderRadius: 999,
            backgroundColor: isDark ? "#A78BFA" : "#DDA7A5",
            paddingVertical: 14,
            opacity: updateProfile.isPending || !hasChanges ? 0.6 : 1,
          }}
          disabled={updateProfile.isPending || !hasChanges}
        >
          <Typography
            style={{ fontSize: 15, fontWeight: "600", color: "#FFFFFF" }}
          >
            {updateProfile.isPending ? "Saving…" : "Save Changes"}
          </Typography>
        </PressableScale>
      </View>

      <View style={sectionCardStyle}>
        <SectionLabel label="Cycle Actions" isDark={isDark} />

        <SettingsRow
          title={
            resetPredictions.isPending
              ? "Resetting Predictions…"
              : "Reset Predictions"
          }
          isDark={isDark}
          onPress={handleResetPredictions}
        />

        <SettingsRow
          title={startNewCycle.isPending ? "Starting…" : "Start Period Today"}
          isDark={isDark}
          onPress={handleStartPeriodToday}
        />

        {/* FIX: Only show "End Period" button when there's an active cycle */}
        {currentCycleData?.cycle ? (
          <SettingsRow
            title={endCurrentCycle.isPending ? "Ending…" : "End Current Period"}
            isDark={isDark}
            onPress={handleEndPeriodToday}
          />
        ) : null}

        <Typography variant="helper" style={{ marginTop: 6 }}>
          {currentCycleData?.cycle
            ? `Active cycle started ${currentCycleData.cycle.start_date}`
            : "No active cycle right now."}
        </Typography>

        <Typography variant="helper" style={{ marginTop: 6 }}>
          Reset Predictions updates forecast dates only. It never deletes logs.
        </Typography>
      </View>

      {/* ── App Preferences ───────────────────────────────────────── */}
      <View style={sectionCardStyle}>
        <SectionLabel label="App Preferences" isDark={isDark} />

        {/* Daily Reminders toggle row */}
        <View
          style={{
            marginBottom: 8,
            borderRadius: 16,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(255,218,185,0.2)",
            paddingHorizontal: 16,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography
            style={{
              fontSize: 15,
              color: isDark ? "#F2F2F2" : "#2D2327",
            }}
          >
            Daily Reminders
          </Typography>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleNotificationToggle}
            trackColor={{ false: "#D7CFCA", true: "#DDA7A5" }}
            thumbColor="#FFFFFF"
          />
        </View>

        <SettingsRow
          title="Partner Sync"
          isDark={isDark}
          onPress={() => router.push("/partner" as never)}
        />

        <View
          style={{
            marginTop: 8,
            borderRadius: 16,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(255,218,185,0.2)",
            paddingHorizontal: 16,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography
            style={{
              fontSize: 15,
              color: isDark ? "#F2F2F2" : "#2D2327",
            }}
          >
            Analytics Consent
          </Typography>
          <Switch
            value={analyticsEnabled}
            onValueChange={handleAnalyticsToggle}
            trackColor={{ false: "#D7CFCA", true: "#DDA7A5" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* ── Legal ─────────────────────────────────────────────────── */}
      <View style={sectionCardStyle}>
        <SectionLabel label="Legal" isDark={isDark} />
        <SettingsRow
          title="Data Consent Center"
          isDark={isDark}
          onPress={() => router.push("/legal/data-consent" as never)}
        />
        <SettingsRow
          title="Data Practices"
          isDark={isDark}
          onPress={() => router.push("/legal/data-practices" as never)}
        />
        <SettingsRow
          title="Data Rights Requests"
          isDark={isDark}
          onPress={() => router.push("/legal/data-rights" as never)}
        />
        <SettingsRow
          title="Privacy Policy"
          isDark={isDark}
          onPress={() => router.push("/legal/privacy" as never)}
        />
        <SettingsRow
          title="Terms of Use"
          isDark={isDark}
          onPress={() => router.push("/legal/terms" as never)}
        />
        <SettingsRow
          title="Medical Disclaimer"
          isDark={isDark}
          onPress={() => router.push("/legal/medical-disclaimer" as never)}
        />
      </View>

      {/* ── Theme ─────────────────────────────────────────────────── */}
      <View style={sectionCardStyle}>
        <SectionLabel label="Theme" isDark={isDark} />
        <View
          style={{ flexDirection: "row", justifyContent: "center", gap: 24 }}
        >
          {[
            { id: "Cream" as const, color: "#FFFDFB", border: "#DDA7A5" },
            { id: "Midnight" as const, color: "#0F1115", border: "#A78BFA" },
          ].map((theme) => (
            <PressableScale
              key={theme.id}
              onPress={() => handleThemeSelect(theme.id)}
              style={{ alignItems: "center" }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: theme.color,
                  borderWidth: activeTheme === theme.id ? 3 : 2,
                  borderColor:
                    activeTheme === theme.id
                      ? theme.border
                      : theme.border + "66",
                  shadowColor:
                    activeTheme === theme.id ? theme.border : "transparent",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: activeTheme === theme.id ? 0.4 : 0,
                  shadowRadius: 8,
                  elevation: activeTheme === theme.id ? 4 : 0,
                }}
              />
              <Typography variant="helper" style={{ marginTop: 8 }}>
                {theme.id}
              </Typography>
            </PressableScale>
          ))}
        </View>
      </View>

      {/* ── Account ───────────────────────────────────────────────── */}
      <View style={sectionCardStyle}>
        <SectionLabel label="Account" isDark={isDark} />
        <SettingsRow
          title="Export Data"
          isDark={isDark}
          onPress={handleExportData}
        />
        <SettingsRow
          title="Report an Issue"
          isDark={isDark}
          onPress={handleSendFeedback}
        />
        <SettingsRow
          title="Delete Account"
          tone="danger"
          isDark={isDark}
          onPress={handleDeleteAllData}
        />

        <Typography variant="helper" style={{ marginTop: 6 }}>
          {deleteAllData.isPending
            ? "Deleting your data…"
            : "Danger zone: Delete all data is permanent and cannot be undone."}
        </Typography>
      </View>

      {/* ── Sign Out ──────────────────────────────────────────────── */}
      <PressableScale
        onPress={handleLogout}
        style={{
          marginTop: 16,
          marginBottom: 32,
          alignItems: "center",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: isDark
            ? "rgba(255,255,255,0.1)"
            : "rgba(221,167,165,0.3)",
          paddingVertical: 16,
          opacity: isLoggingOut ? 0.5 : 1,
        }}
      >
        <Typography
          style={{
            fontSize: 15,
            fontWeight: "500",
            color: "#9B7E8C",
          }}
        >
          {isLoggingOut ? "Signing out…" : "Sign Out"}
        </Typography>
      </PressableScale>
    </Screen>
  );
}
