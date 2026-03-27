import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, View, useColorScheme } from "react-native";

import { buildMiniCalendar, useCurrentCycle } from "@/hooks/useCurrentCycle";
import { logPeriodRangeAction } from "@/hooks/useCycleActions";
import { useCycleHistory } from "@/hooks/useCycleHistory";
import { useTodayLog } from "@/hooks/useDailyLogs";
import { useProfile } from "@/hooks/useProfile";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useCareCircle } from "@/hooks/useCareCircle";
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
import { useCycleStore } from "@/src/store/useCycleStore";
import { useOfflineQueue } from "@/src/store/useOfflineQueue";
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
    input.mood && input.mood !== "--"
      ? ` Mood check-in: ${input.mood}.`
      : "";
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
}: {
  day: number;
  phaseLabel: string;
  isDark: boolean;
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
          backgroundColor: isDark
            ? "rgba(79,70,229,0.15)"
            : "rgba(255,218,185,0.4)",
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
          backgroundColor: isDark
            ? "rgba(167,139,250,0.25)"
            : "rgba(221,167,165,0.5)",
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
          backgroundColor: isDark
            ? "rgba(167,139,250,0.25)"
            : "rgba(155,126,140,0.28)",
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
          backgroundColor: isDark
            ? "rgba(129,140,248,0.2)"
            : "rgba(255,218,185,0.35)",
        }}
      />
      {/* Inner solid orb */}
      <View
        style={{
          width: 224,
          height: 224,
          borderRadius: 112,
          backgroundColor: isDark ? "#A78BFA" : "#DDA7A5",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: isDark ? "#7C6BE8" : "#DDA7A5",
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
  const isDark = useColorScheme() === "dark";
  const insets = useSafeAreaInsets();
  const hydrate = useCycleStore((s) => s.hydrate);
  const { user } = useAuthContext();
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [isLoggingPeriod, setIsLoggingPeriod] = useState(false);
  const [forceShow, setForceShow] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const { pendingCount, isSyncing, flush } = useOfflineQueue();

  // ─── Real-time Supabase sync ─────────────────────────────────────────────
  useRealtimeSync(user?.id);

  // ─── Live data hooks ─────────────────────────────────────────────────────
  const { data: profile, isLoading: isProfileLoading, error: profileError } = useProfile();
  const { data: todayLog, isLoading: isTodayLoading, error: todayError } = useTodayLog();
  const {
    data: cycleData,
    isLoading: isCycleLoading,
    error: cycleError,
    refetch: refetchCurrentCycle,
  } = useCurrentCycle(
    profile?.cycle_length_average ?? 28,
    profile?.period_duration_average ?? 5,
  );
  const { data: cycleHistory = [] } = useCycleHistory(6);

  // ─── Care Circle state ───────────────────────────────────────────────────
  const { data: careCircleState } = useCareCircle();
  const hasPrimaryConnections = (careCircleState?.asPrimary?.length ?? 0) > 0;
  const hasViewerConnections = (careCircleState?.asViewer?.length ?? 0) > 0;

  // Initialize app state once
  useEffect(() => {
    if (!hasInitialized) {
      hydrate();
      setHasInitialized(true);
    }
  }, [hydrate, hasInitialized]);

  // Optimized refetch logic - only run once on mount to avoid infinite loops
  useEffect(() => {
    if (hasInitialized && typeof refetchCurrentCycle === "function") {
      // Use a timeout to ensure this only happens once after initialization
      const timeoutId = setTimeout(() => {
        void refetchCurrentCycle();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [hasInitialized]); // Removed refetchCurrentCycle dependency to prevent infinite loops

  // ─── Loading timeout protection ──────────────────────────────────────────
  useEffect(() => {
    // Force show content after 10 seconds even if still loading (reduced from 15s)
    const timeoutId = setTimeout(() => {
      console.warn('[HomeScreen] Loading timeout reached, showing content with fallbacks');
      setForceShow(true);
    }, 10000);

    // Clear timeout when loading completes normally or errors occur
    if ((!isProfileLoading && !isTodayLoading && !isCycleLoading) ||
        profileError || todayError || cycleError) {
      clearTimeout(timeoutId);
    }

    return () => clearTimeout(timeoutId);
  }, [isProfileLoading, isTodayLoading, isCycleLoading, profileError, todayError, cycleError]);

  // Memoize mini calendar to prevent unnecessary recalculations
  const miniCalendar = useMemo(
    () =>
      buildMiniCalendar(
        cycleData?.cycle ?? null,
        profile?.period_duration_average ?? 5,
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

  // Show loading splash only if all queries are loading AND timeout hasn't been reached AND no errors
  if ((isProfileLoading || isTodayLoading || isCycleLoading) && !forceShow && !profileError && !todayError && !cycleError) {
    return (
      <SomaLoadingSplash
        timeout={10000}
        onTimeout={() => setForceShow(true)}
        subtitle="Preparing your personal cycle insights..."
      />
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
  const fertileWindowPrediction =
    cycleData?.cycle?.start_date
      ? predictFertileWindow(cycleHistory, cycleData.cycle.start_date)
      : null;
  const ovulationEstimate =
    cycleData?.cycle?.start_date
      ? estimateOvulation(cycleHistory, cycleData.cycle.start_date)
      : null;

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
      iconColor: "#9B7E8C",
      value: sleepValue,
      label: "Last night",
      bg: "rgba(155,126,140,0.16)",
      isEnabled: featureFlags.sleepTracking,
    },
    {
      key: "mood",
      icon: { ios: "face.smiling.fill", android: "mood", web: "mood" },
      iconColor: "#FFDAB9",
      value: moodValue,
      label: "Current mood",
      bg: "rgba(255,218,185,0.2)",
      isEnabled: true,
    },
    {
      key: "energy",
      icon: { ios: "bolt.fill", android: "bolt", web: "bolt" },
      iconColor: "#DDA7A5",
      value: energyValue,
      label: "Readiness",
      bg: "rgba(221,167,165,0.2)",
      isEnabled: true,
    },
  ].filter((item) => item.isEnabled);

  const actionSectionBottomSpacing = Math.max(20, insets.bottom + 14);
  const fabBottomSpacing = Math.max(88, insets.bottom + 82);

  return (
    <Screen scrollable={false}>
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
        >
      {/* Top bar */}
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
            color: isDark ? "#F2F2F2" : "#2D2327",
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
              : "rgba(255, 218, 185, 0.3)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.6)",
            shadowColor: "#DDA7A5",
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
            tintColor="#9B7E8C"
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
            borderColor: "rgba(255,255,255,0.6)",
            backgroundColor: isDark
              ? "rgba(30,33,40,0.8)"
              : "rgba(255,255,255,0.72)",
            padding: 16,
          }}
        >
          <Typography style={{ fontSize: 14, fontWeight: "600", marginBottom: 4 }}>
            Upcoming Predictions
          </Typography>
          {fertileWindowPrediction ? (
            <Typography variant="helper" style={{ marginBottom: 2 }}>
              Fertile window: {fertileWindowPrediction.windowStart} to {fertileWindowPrediction.windowEnd}
            </Typography>
          ) : null}
          {ovulationEstimate ? (
            <Typography variant="helper">
              Ovulation estimate: {ovulationEstimate.estimatedDate} ({ovulationEstimate.confidence} confidence)
            </Typography>
          ) : null}
        </View>
      ) : null}

      {/* Hero orb */}
      <View style={{ marginTop: 32, marginBottom: 40, alignItems: "center" }}>
        <CycleOrb day={cycleDay} phaseLabel={phaseLabel} isDark={isDark} />
      </View>

      {/* Insight card */}
      <View
        style={{
          marginBottom: 32,
          borderRadius: 28,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.6)",
          backgroundColor: isDark
            ? "rgba(30,33,40,0.85)"
            : "rgba(255, 218, 185, 0.22)",
          padding: 24,
          shadowColor: "#DDA7A5",
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
              backgroundColor: "rgba(255, 218, 185, 0.35)",
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
              tintColor="#9B7E8C"
              size={20}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Typography
              style={{
                fontSize: 15,
                lineHeight: 24,
                color: isDark ? "#F2F2F2" : "#2D2327",
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
            backgroundColor: "#FFDAB9",
          }}
        />
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: "#DDA7A5",
          }}
        />
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: "#9B7E8C",
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
              : "rgba(255, 218, 185, 0.22)",
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
                  : "rgba(255, 218, 185, 0.35)",
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
                tintColor="#9B7E8C"
                size={20}
              />
            </View>
            <View style={{ flex: 1, justifyContent: "center" }}>
              <Typography
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: isDark ? "#F2F2F2" : "#2D2327",
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
                    : "rgba(157, 126, 140, 0.9)",
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
                    color: "#DDA7A5",
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
          borderColor: "rgba(255,255,255,0.6)",
          backgroundColor: isDark
            ? "rgba(30,33,40,0.82)"
            : "rgba(255, 218, 185, 0.14)",
          padding: 16,
          shadowColor: "#DDA7A5",
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
          {miniCalendar.map((item) => (
            <View
              key={`${item.day}-${item.date}`}
              style={{ alignItems: "center" }}
            >
              <Typography
                variant="helper"
                style={{ marginBottom: 4, color: "#9B7E8C" }}
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
                  backgroundColor: item.isCurrent ? "#DDA7A5" : "transparent",
                  shadowColor: item.isCurrent ? "#DDA7A5" : "transparent",
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
                        ? "#F2F2F2"
                        : "#2D2327",
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
                    backgroundColor: "#DDA7A5",
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
              borderColor: "rgba(255,255,255,0.6)",
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
                  color: isDark ? "#F2F2F2" : "#2D2327",
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
                ? "rgba(167,139,250,0.5)"
                : "rgba(155,126,140,0.45)",
              backgroundColor: isDark
                ? "rgba(167,139,250,0.12)"
                : "rgba(255,218,185,0.35)",
              paddingVertical: 10,
            }}
          >
            <Typography
              variant="helper"
              style={{ fontWeight: "600", color: isDark ? "#F2F2F2" : "#2D2327" }}
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
              : "rgba(221,167,165,0.45)",
            paddingVertical: 14,
          }}
        >
          <Typography
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: isDark ? "#F2F2F2" : "#2D2327",
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
              backgroundColor: isDark ? "#A78BFA" : "#DDA7A5",
              paddingVertical: 20,
              shadowColor: isDark ? "#7C6BE8" : "#DDA7A5",
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
            style={{ textAlign: "center", color: "#9B7E8C", paddingVertical: 8 }}
          >
            Start a period to enable daily logging.
          </Typography>
        )}
      </View>

        </ScrollView>

      {/* Floating FAB to mirror reference composition */}
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
          backgroundColor: isDark ? "#A78BFA" : "#DDA7A5",
          shadowColor: isDark ? "#7C6BE8" : "#DDA7A5",
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
