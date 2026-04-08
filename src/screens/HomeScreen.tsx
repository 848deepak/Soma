import { CYCLE_DEFAULTS } from "@/src/domain/constants/cycleDefaults";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, View } from "react-native";

import { useCareCircle } from "@/hooks/useCareCircle";
import { buildMiniCalendar, useCurrentCycle } from "@/src/domain/cycle";
import { logPeriodRangeAction } from "@/src/domain/cycle";
import { useCycleHistory } from "@/src/domain/cycle";
import { useTodayLog } from "@/src/domain/calendar";
import { useProfile } from "@/src/domain/auth";
import { useRealtimeSync } from "@/src/domain/logging";
import {
    estimateOvulation,
    predictFertileWindow,
} from "@/services/CycleIntelligence";
import { PeriodLogModal } from "@/src/components/ui/PeriodLogModal";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { Screen } from "@/src/components/ui/Screen";
import { SkeletonLoader } from "@/src/components/ui/SkeletonLoader";
import { SomaLoadingSplash } from "@/src/components/ui/SomaLoadingSplash";
import { Typography } from "@/src/components/ui/Typography";
import { useAuthContext } from "@/src/context/AuthProvider";
import { useAppTheme } from "@/src/context/ThemeContext";
import { logDataAccess } from "@/src/services/auditService";
import { logWarn } from "@/platform/monitoring/logger";
import { useOfflineQueue } from "@/src/store/useOfflineQueue";
import { ScreenErrorBoundary } from "@/src/components/ScreenErrorBoundary";
import { ScreenError } from "@/src/components/ScreenError";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PHASE_INSIGHT: Record<string, string> = {
  menstrual:
    "Your body is resting and renewing. Warmth, gentle movement, and nourishment support you today.",
  follicular:
    "Energy is building as your follicular phase begins. Focus and creativity are on the rise.",
  ovulation:
    "Your estrogen is peaking today. You might notice a natural glow and higher energy levels.",
  luteal:
    "Progesterone is rising. Honour rest, reduce stimulants, and be gentle with yourself.",
};

const featureFlags = {
  waterTracking: false,
  sleepTracking: false,
} as const;

function getGreetingByHour(now: Date): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && hour < 22) return "Good Evening";
  return "Good Night";
}

function buildInsightText(input: {
  phase: string | null | undefined;
  mood: string | null | undefined;
  energy: string | null | undefined;
}): string {
  const phaseInsight = input.phase
    ? (PHASE_INSIGHT[input.phase] ?? PHASE_INSIGHT.follicular)
    : "Welcome to SOMA. Let's start tracking your cycle.";

  const moodHint =
    input.mood && input.mood !== "--" ? ` Mood check-in: ${input.mood}.` : "";
  const energyHint =
    input.energy && input.energy !== "--"
      ? ` Energy: ${input.energy.toLowerCase()}.`
      : "";

  return `${phaseInsight}${moodHint}${energyHint}`.trim();
}

// ── Gradient Orb — hero element matching Figma ─────────────────────────────
const CycleOrb = React.memo(function CycleOrb({
  day,
  phaseLabel,
  isDark,
  primary,
  primaryDark,
  secondary,
}: {
  day: number;
  phaseLabel: string;
  isDark: boolean;
  primary: string;
  primaryDark: string;
  secondary: string;
}) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 8 }}>
      {/* Outer ambient glow */}
      <View
        style={{
          position: "absolute",
          width: 280,
          height: 280,
          borderRadius: 140,
          backgroundColor: secondary,
          opacity: 0.7,
        }}
      />
      {/* Mid layer */}
      <View
        style={{
          position: "absolute",
          width: 224,
          height: 224,
          borderRadius: 112,
          backgroundColor: primary,
          opacity: 0.8,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 32,
          right: 48,
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: primary,
          opacity: 0.25,
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: 48,
          left: 32,
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: secondary,
          opacity: 0.35,
        }}
      />
      {/* Inner solid orb */}
      <View
        style={{
          width: 224,
          height: 224,
          borderRadius: 112,
          backgroundColor: primary,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: primaryDark,
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: 0.5,
          shadowRadius: 32,
          elevation: 16,
        }}
      >
        {/* Organic inner highlight overlay */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 112,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(255,255,255,0.2)",
          }}
        />
        {/* Day number */}
        <Typography
          style={{
            fontFamily: "PlayfairDisplay-SemiBold",
            fontSize: 72,
            color: "#FFFFFF",
            lineHeight: 76,
            textAlign: "center",
          }}
        >
          {day}
        </Typography>
        {/* DAY label */}
        <Typography
          style={{
            fontSize: 13,
            letterSpacing: 2.4,
            color: "rgba(255,255,255,0.75)",
            textTransform: "uppercase",
            marginTop: -3,
          }}
        >
          Day
        </Typography>
        {/* Phase name */}
        <Typography
          style={{
            fontSize: 16,
            color: "rgba(255,255,255,0.9)",
            marginTop: 4,
            textAlign: "center",
            paddingHorizontal: 12,
          }}
        >
          {phaseLabel}
        </Typography>
      </View>
    </View>
  );
});

export function HomeScreen() {
  const router = useRouter();
  const { theme, isDark, colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthContext();
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [isLoggingPeriod, setIsLoggingPeriod] = useState(false);
  const [forceShow, setForceShow] = useState(false);
  const { pendingCount, isSyncing, flush } = useOfflineQueue();

  // ─── Real-time Supabase sync ─────────────────────────────────────────────
  useRealtimeSync(user?.id);

  // ─── Live data hooks ─────────────────────────────────────────────────────
  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
  } = useProfile();
  const {
    data: todayLog,
    isLoading: isTodayLoading,
    error: todayError,
  } = useTodayLog();
  const {
    data: cycleData,
    isLoading: isCycleLoading,
    error: cycleError,
    refetch: refetchCurrentCycle,
  } = useCurrentCycle(
    profile?.cycle_length_average ?? CYCLE_DEFAULTS.CYCLE_LENGTH,
    profile?.period_duration_average ?? CYCLE_DEFAULTS.PERIOD_DURATION,
  );
  const { data: cycleHistory = [] } = useCycleHistory(6);

  // ─── Care Circle state ───────────────────────────────────────────────────
  const { data: careCircleState } = useCareCircle();
  const hasPrimaryConnections = (careCircleState?.asPrimary?.length ?? 0) > 0;
  const hasViewerConnections = (careCircleState?.asViewer?.length ?? 0) > 0;


  // ─── Loading timeout protection ──────────────────────────────────────────
  useEffect(() => {
    // Force show content after 10 seconds even if still loading (reduced from 15s)
    const timeoutId = setTimeout(() => {
      logWarn("performance", "loading_timeout_homescreen", {
        message: "Loading timeout reached, showing content with fallbacks",
      });
      setForceShow(true);
    }, 10000);

    // Clear timeout when loading completes normally or errors occur
    if (
      (!isProfileLoading && !isTodayLoading && !isCycleLoading) ||
      profileError ||
      todayError ||
      cycleError
    ) {
      clearTimeout(timeoutId);
    }

    return () => clearTimeout(timeoutId);
  }, [
    isProfileLoading,
    isTodayLoading,
    isCycleLoading,
    profileError,
    todayError,
    cycleError,
  ]);

  // Memoize mini calendar to prevent unnecessary recalculations
  const miniCalendar = useMemo(
    () =>
      buildMiniCalendar(
        cycleData?.cycle ?? null,
        profile?.period_duration_average ?? CYCLE_DEFAULTS.PERIOD_DURATION,
      ),
    [cycleData?.cycle, profile?.period_duration_average],
  );

  // Memoize navigation handlers
  const handleLogFlow = useCallback(() => {
    router.push("/log" as never);
  }, [router]);

  const handleOpenPeriodModal = useCallback(() => {
    setShowPeriodModal(true);
  }, []);

  const handleSubmitPeriodModal = useCallback(
    async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
      try {
        setIsLoggingPeriod(true);
        await logPeriodRangeAction({
          startDate,
          endDate: endDate || undefined,
          fallbackActiveCycle: cycleData?.cycle
            ? { id: cycleData.cycle.id, start_date: cycleData.cycle.start_date }
            : null,
        });
        await refetchCurrentCycle();
        setShowPeriodModal(false);
        Alert.alert("Saved", "Period dates logged successfully.");
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not log period dates.";
        Alert.alert("Action Failed", message);
      } finally {
        setIsLoggingPeriod(false);
      }
    },
    [refetchCurrentCycle],
  );

  const fertileWindowPrediction = cycleData?.cycle?.start_date
    ? predictFertileWindow(cycleHistory, cycleData.cycle.start_date)
    : null;
  const ovulationEstimate = cycleData?.cycle?.start_date
    ? estimateOvulation(cycleHistory, cycleData.cycle.start_date)
    : null;

  useEffect(() => {
    if (!ovulationEstimate) return;

    // Record prediction confidence usage for production diagnostics.
    void logDataAccess("cycle_data", "view", {
      source: "home_prediction_confidence",
      confidence: ovulationEstimate.confidence,
      confidenceScore: ovulationEstimate.confidenceScore,
      cyclesUsed: ovulationEstimate.cyclesUsed,
      variabilityDays: ovulationEstimate.variabilityDays,
    });
  }, [
    ovulationEstimate?.confidence,
    ovulationEstimate?.confidenceScore,
    ovulationEstimate?.cyclesUsed,
    ovulationEstimate?.variabilityDays,
  ]);

  // Show loading splash only if all queries are loading AND timeout hasn't been reached AND no errors
  useEffect(() => {
    // Force show content after 10 seconds even if still loading (reduced from 15s)
    const timeoutId = setTimeout(() => {
      logWarn("performance", "loading_timeout_homescreen", {
        message: "Loading timeout reached, showing content with fallbacks",
      });
      setForceShow(true);
    }, 10000);

    // Clear timeout when loading completes normally or errors occur
    if (
      (!isProfileLoading && !isTodayLoading && !isCycleLoading) ||
      profileError ||
      todayError ||
      cycleError
    ) {
      clearTimeout(timeoutId);
    }

    return () => clearTimeout(timeoutId);
  }, [
    isProfileLoading,
    isTodayLoading,
    isCycleLoading,
    profileError,
    todayError,
    cycleError,
  ]);

  if (
    (isProfileLoading || isTodayLoading || isCycleLoading) &&
    !forceShow &&
    !profileError &&
    !todayError &&
    !cycleError
  ) {
    return (
      <SomaLoadingSplash
        timeout={10000}
        onTimeout={() => setForceShow(true)}
        subtitle="Preparing your personal cycle insights..."
      />
    );
  }

  const homeQueryError =
    profileError instanceof Error
      ? profileError
      : todayError instanceof Error
        ? todayError
        : cycleError instanceof Error
          ? cycleError
          : null;

  if (homeQueryError) {
    return (
      <Screen>
        <ScreenError
          screenName="HomeScreen"
          error={homeQueryError}
          onRetry={() => {
            void refetchCurrentCycle();
          }}
        />
      </Screen>
    );
  }

  // ─── Derived display values with fallbacks ───────────────────────────────────────────────
  const greetingName = profile?.first_name || "there";
  const greetingPrefix = getGreetingByHour(new Date());
  const cycleDay = cycleData?.cycleDay ?? 1;
  const phaseLabel = cycleData?.phaseLabel ?? "Cycle Phase";
  const hasActivePeriod = Boolean(cycleData?.cycle?.id);

  const hydrationValue = `${todayLog?.hydration_glasses ?? 0}/8`;
  const sleepValue = todayLog?.sleep_hours
    ? `${Math.floor(todayLog.sleep_hours)}h ${Math.round((todayLog.sleep_hours % 1) * 60)}m`
    : "--";
  const moodValue = todayLog?.mood ?? "--";
  const energyValue = todayLog?.energy_level
    ? `${todayLog.energy_level} Energy`
    : "--";
  const insightText = buildInsightText({
    phase: cycleData?.phase,
    mood: todayLog?.mood,
    energy: todayLog?.energy_level,
  });

  const isLavender = theme === "lavender";
  const nonDarkWarmSurface = isLavender
    ? "rgba(193,187,221,0.3)"
    : "rgba(255,218,185,0.3)";
  const nonDarkCardSurface = isLavender
    ? "rgba(193,187,221,0.22)"
    : "rgba(255,218,185,0.22)";
  const nonDarkCardSurfaceSoft = isLavender
    ? "rgba(193,187,221,0.14)"
    : "rgba(255,218,185,0.14)";
  const nonDarkChipSurface = isLavender
    ? "rgba(193,187,221,0.35)"
    : "rgba(255,218,185,0.35)";

  const homeWidgets = [
    {
      key: "hydration",
      icon: {
        ios: "drop.fill",
        android: "water_drop",
        web: "water_drop",
      },
      iconColor: "#8BA888",
      value: hydrationValue,
      label: "Glasses today",
      bg: "rgba(139,168,136,0.16)",
      isEnabled: featureFlags.waterTracking,
    },
    {
      key: "sleep",
      icon: {
        ios: "moon.fill",
        android: "nights_stay",
        web: "nights_stay",
      },
      iconColor: colors.accent,
      value: sleepValue,
      label: "Last night",
      bg: "rgba(155,126,140,0.16)",
      isEnabled: featureFlags.sleepTracking,
    },
    {
      key: "mood",
      icon: { ios: "face.smiling.fill", android: "mood", web: "mood" },
      iconColor: colors.secondary,
      value: moodValue,
      label: "Current mood",
      bg: isDark ? "rgba(99,102,241,0.2)" : nonDarkWarmSurface,
      isEnabled: true,
    },
    {
      key: "energy",
      icon: { ios: "bolt.fill", android: "bolt", web: "bolt" },
      iconColor: colors.primary,
      value: energyValue,
      label: "Readiness",
      bg: isDark ? "rgba(167,139,250,0.2)" : nonDarkCardSurface,
      isEnabled: true,
    },
  ].filter((item) => item.isEnabled);

  const actionSectionBottomSpacing = Math.max(20, insets.bottom + 14);
  const fabBottomSpacing = Math.max(88, insets.bottom + 82);

  // Show skeleton loaders only for cycle/today data after initial loading is complete
  const shouldShowSkeleton = (isCycleLoading || isTodayLoading) && forceShow;

  return (
    <Screen scrollable={false}>
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
        >
          {shouldShowSkeleton ? (
            <SkeletonLoader />
          ) : (
            <>
              <View
                style={{
                  marginTop: 0,
                  paddingTop: 40,
                  paddingBottom: 32,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <Typography
                  style={{
                    fontFamily: "PlayfairDisplay-SemiBold",
                    fontSize: 32,
                    lineHeight: 38,
                    color: colors.textPrimary,
                  }}
                >
                  {`${greetingPrefix},\n${greetingName}`}
                </Typography>

                <PressableScale
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isDark
                      ? "rgba(167,139,250,0.2)"
                      : nonDarkWarmSurface,
                    borderWidth: 1,
                    borderColor: colors.borderLight,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 16,
                    elevation: 4,
                  }}
                >
                  <SymbolView
                    name={{
                      ios: "bell",
                      android: "notifications",
                      web: "notifications",
                    }}
                    tintColor={colors.accent}
                    size={20}
                  />
                </PressableScale>
              </View>

              {fertileWindowPrediction || ovulationEstimate ? (
                <View
                  style={{
                    marginBottom: 24,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: colors.borderLight,
                    backgroundColor: isDark
                      ? "rgba(30,33,40,0.8)"
                      : "rgba(255,255,255,0.72)",
                    padding: 16,
                  }}
                >
                  <Typography
                    style={{ fontSize: 14, fontWeight: "600", marginBottom: 4 }}
                  >
                    Upcoming Predictions
                  </Typography>
                  {fertileWindowPrediction ? (
                    <Typography variant="helper" style={{ marginBottom: 2 }}>
                      Fertile window: {fertileWindowPrediction.windowStart} to{" "}
                      {fertileWindowPrediction.windowEnd}
                    </Typography>
                  ) : null}
                  {ovulationEstimate ? (
                    <Typography variant="helper">
                      Ovulation estimate: {ovulationEstimate.estimatedDate} (
                      {ovulationEstimate.confidence} confidence,{" "}
                      {ovulationEstimate.confidenceScore}%)
                    </Typography>
                  ) : null}
                </View>
              ) : null}

              {/* Hero orb */}
              <View
                style={{
                  marginTop: 32,
                  marginBottom: 40,
                  alignItems: "center",
                }}
              >
                <CycleOrb
                  day={cycleDay}
                  phaseLabel={phaseLabel}
                  isDark={isDark}
                  primary={colors.primary}
                  primaryDark={colors.primaryDark}
                  secondary={colors.secondary}
                />
              </View>

              {/* Insight card */}
              <View
                style={{
                  marginBottom: 32,
                  borderRadius: 28,
                  borderWidth: 1,
                  borderColor: colors.borderLight,
                  backgroundColor: isDark
                    ? "rgba(30,33,40,0.85)"
                    : nonDarkCardSurface,
                  padding: 24,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.15,
                  shadowRadius: 32,
                  elevation: 5,
                }}
              >
                <View style={{ flexDirection: "row", gap: 14 }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: nonDarkChipSurface,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.5)",
                    }}
                  >
                    <SymbolView
                      name={{
                        ios: "sparkles",
                        android: "auto_awesome",
                        web: "auto_awesome",
                      }}
                      tintColor={colors.accent}
                      size={20}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Typography
                      style={{
                        fontSize: 15,
                        lineHeight: 24,
                        color: colors.textPrimary,
                      }}
                    >
                      {insightText}
                    </Typography>
                  </View>
                </View>
              </View>

              {/* Decorative dots */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                  marginBottom: 32,
                  opacity: 0.6,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.secondary,
                  }}
                />
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.primary,
                  }}
                />
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.accent,
                  }}
                />
              </View>

              {/* ── Care Circle entry card (if not connected) ──────────────────── */}
              {!hasPrimaryConnections && !hasViewerConnections ? (
                <View
                  style={{
                    marginBottom: 32,
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(255,255,255,0.7)",
                    backgroundColor: isDark
                      ? "rgba(30,33,40,0.85)"
                      : nonDarkCardSurface,
                    padding: 20,
                  }}
                >
                  <View style={{ flexDirection: "row", gap: 14 }}>
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isDark
                          ? "rgba(167,139,250,0.2)"
                          : nonDarkChipSurface,
                        borderWidth: 1,
                        borderColor: isDark
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(255,255,255,0.5)",
                      }}
                    >
                      <SymbolView
                        name={{
                          ios: "person.2.fill",
                          android: "people",
                          web: "people",
                        }}
                        tintColor={colors.accent}
                        size={20}
                      />
                    </View>
                    <View style={{ flex: 1, justifyContent: "center" }}>
                      <Typography
                        style={{
                          fontSize: 15,
                          fontWeight: "600",
                            color: colors.textPrimary,
                          marginBottom: 4,
                        }}
                      >
                        Build Your Care Circle
                      </Typography>
                      <Typography
                        variant="helper"
                        style={{
                          color: isDark
                            ? "rgba(242,242,242,0.7)"
                            : colors.textSecondary,
                          marginBottom: 8,
                        }}
                      >
                        Add trusted supporters to your health journey
                      </Typography>
                      <PressableScale
                        testID="care-circle-cta"
                        onPress={() => router.push("/care-circle" as never)}
                        style={{
                          alignSelf: "flex-start",
                        }}
                      >
                        <Typography
                          style={{
                            fontSize: 13,
                            fontWeight: "600",
                            color: colors.primary,
                          }}
                        >
                          Get Started →
                        </Typography>
                      </PressableScale>
                    </View>
                  </View>
                </View>
              ) : null}

              {/* ── Mini calendar strip ───────────────────────────────────── */}
              <View
                style={{
                  marginBottom: 32,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: colors.borderLight,
                  backgroundColor: isDark
                    ? "rgba(30,33,40,0.82)"
                    : nonDarkCardSurfaceSoft,
                  padding: 16,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.08,
                  shadowRadius: 16,
                  elevation: 2,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  {miniCalendar.map((item: { day: string; date: number; isCurrent: boolean; hasPeriod: boolean }) => (
                    <View
                      key={`${item.day}-${item.date}`}
                      style={{ alignItems: "center" }}
                    >
                      <Typography
                        variant="helper"
                        style={{ marginBottom: 4, color: colors.textSecondary }}
                      >
                        {item.day}
                      </Typography>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: item.isCurrent
                            ? colors.primary
                            : "transparent",
                          shadowColor: item.isCurrent
                            ? colors.primary
                            : "transparent",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: item.isCurrent ? 0.4 : 0,
                          shadowRadius: 10,
                          elevation: item.isCurrent ? 4 : 0,
                        }}
                      >
                        <Typography
                          style={{
                            color: item.isCurrent
                              ? "#FFFFFF"
                              : isDark
                                ? colors.textPrimary
                                : colors.textPrimary,
                            fontWeight: item.isCurrent ? "600" : "400",
                            fontSize: 15,
                          }}
                        >
                          {item.date}
                        </Typography>
                      </View>
                      {item.hasPeriod && !item.isCurrent ? (
                        <View
                          style={{
                            marginTop: 4,
                            width: 5,
                            height: 5,
                            borderRadius: 2.5,
                            backgroundColor: colors.primary,
                          }}
                        />
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>

              {/* ── 2x2 widgets grid ───────────────────────────────────────── */}
              <View
                style={{
                  marginBottom: 32,
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  rowGap: 12,
                }}
              >
                {homeWidgets.map((item) => (
                  <View
                    key={item.key}
                    style={{
                      width: "48.3%",
                      borderRadius: 24,
                      borderWidth: 1,
                      borderColor: colors.borderLight,
                      backgroundColor: item.bg,
                      padding: 20,
                      aspectRatio: 1,
                      justifyContent: "space-between",
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(255,255,255,0.35)",
                      }}
                    >
                      <SymbolView
                        name={item.icon as any}
                        tintColor={item.iconColor}
                        size={20}
                      />
                    </View>
                    <View>
                      <Typography
                        style={{
                          fontFamily: "PlayfairDisplay-SemiBold",
                          fontSize: item.key === "energy" ? 18 : 28,
                          lineHeight: item.key === "energy" ? 24 : 30,
                          color: colors.textPrimary,
                        }}
                      >
                        {item.value}
                      </Typography>
                      <Typography
                        variant="helper"
                        className="mt-1 text-somaMauve dark:text-darkTextSecondary"
                      >
                        {item.label}
                      </Typography>
                    </View>
                  </View>
                ))}
              </View>

              {/* ── Primary action pill + FAB-style secondary action ───────── */}
              <View
                style={{
                  marginBottom: actionSectionBottomSpacing,
                }}
              >
                {(pendingCount > 0 || isSyncing) && (
                  <PressableScale
                    onPress={() => {
                      void flush();
                    }}
                    style={{
                      marginBottom: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: isDark
                        ? "rgba(167,139,250,0.45)"
                        : colors.border,
                      backgroundColor: isDark
                        ? "rgba(167,139,250,0.12)"
                        : nonDarkChipSurface,
                      paddingVertical: 10,
                    }}
                  >
                    <Typography
                      variant="helper"
                      style={{
                        fontWeight: "600",
                        color: colors.textPrimary,
                      }}
                    >
                      {isSyncing
                        ? "Syncing offline changes..."
                        : `${pendingCount} pending sync item${pendingCount === 1 ? "" : "s"}`}
                    </Typography>
                  </PressableScale>
                )}

                <PressableScale
                  onPress={handleOpenPeriodModal}
                  style={{
                    marginBottom: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: isDark
                      ? "rgba(255,255,255,0.18)"
                      : colors.border,
                    paddingVertical: 14,
                  }}
                >
                  <Typography
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: colors.textPrimary,
                    }}
                  >
                    Log Period
                  </Typography>
                </PressableScale>

                {hasActivePeriod ? (
                  <PressableScale
                    onPress={handleLogFlow}
                    testID="home-log-primary-button"
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 999,
                      backgroundColor: colors.primary,
                      paddingVertical: 20,
                      shadowColor: colors.primaryDark,
                      shadowOffset: { width: 0, height: 12 },
                      shadowOpacity: 0.4,
                      shadowRadius: 40,
                      elevation: 10,
                    }}
                  >
                    <Typography
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#FFFFFF",
                        textAlign: "center",
                      }}
                    >
                      Log Today's Flow & Mood
                    </Typography>
                  </PressableScale>
                ) : (
                  <Typography
                    variant="helper"
                    style={{
                      textAlign: "center",
                      color: colors.textSecondary,
                      paddingVertical: 8,
                    }}
                  >
                    Start a period to enable daily logging.
                  </Typography>
                )}
              </View>
            </>
          )}
        </ScrollView>
        <PressableScale
          onPress={handleLogFlow}
          testID="home-log-fab"
          style={{
            position: "absolute",
            right: 12,
            bottom: fabBottomSpacing,
            width: 64,
            height: 64,
            borderRadius: 32,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.primary,
            shadowColor: colors.primaryDark,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.5,
            shadowRadius: 24,
            elevation: 10,
          }}
        >
          <SymbolView
            name={{ ios: "plus", android: "add", web: "add" }}
            tintColor="#FFFFFF"
            size={28}
          />
        </PressableScale>

        <PeriodLogModal
          visible={showPeriodModal}
          onClose={() => setShowPeriodModal(false)}
          onSubmit={handleSubmitPeriodModal}
          isSubmitting={isLoggingPeriod}
        />
      </View>
    </Screen>
  );
}

export function HomeScreenWithErrorBoundary() {
  return (
    <ScreenErrorBoundary screenName="HomeScreen">
      <HomeScreen />
    </ScreenErrorBoundary>
  );
}
