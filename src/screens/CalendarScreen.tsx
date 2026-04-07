/**
 * src/screens/CalendarScreen.tsx
 *
 * LEGACY SCREEN (DISABLED IN APP ROUTING)
 * This file is intentionally kept for rollback/testing only.
 * Production navigation uses SmartCalendarScreen via app/(tabs)/calendar.tsx.
 *
 * Full cycle calendar with real Supabase data.
 * Replaces all mock data with live calculations from CycleIntelligence.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";

import { useCareCircle } from "@/hooks/useCareCircle";
import { useCurrentCycle } from "@/hooks/useCurrentCycle";
import {
  logPeriodRangeAction,
  useEndCurrentCycle,
} from "@/hooks/useCycleActions";
import { useCycleHistory } from "@/hooks/useCycleHistory";
import { useDailyLogs } from "@/hooks/useDailyLogs";
import { useProfile } from "@/hooks/useProfile";
import {
  derivePeriodVisualizationDays,
  estimateOvulation,
  predictFertileWindow,
} from "@/services/CycleIntelligence";
import { CycleCalendarCard } from "@/src/components/cards/CycleCalendarCard";
import { SupportDashboard } from "@/src/components/SupportDashboard";
import { HeaderBar } from "@/src/components/ui/HeaderBar";
import { PeriodLogModal } from "@/src/components/ui/PeriodLogModal";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { Screen } from "@/src/components/ui/Screen";
import { SkeletonLoader } from "@/src/components/ui/SkeletonLoader";
import { Typography } from "@/src/components/ui/Typography";
import { useAppTheme } from "@/src/context/ThemeContext";
import type { MonthCalendarMeta } from "@/src/features/cycle/uiCycleData";
import {
  buildMonthGrid,
  calendarWeekdays,
} from "@/src/features/cycle/uiCycleData";
import { logDataAccess } from "@/src/services/auditService";
import { HapticsService } from "@/src/services/haptics/HapticsService";

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const LEGACY_CALENDAR_SCREEN_DISABLED = true;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function isoToLocalDate(iso: string): Date {
  // Parse as local midnight to avoid UTC-shift issues
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

function isoRangeToCalendarDays(
  startIso: string,
  endIso: string,
  month: number,
  year: number,
): number[] {
  const days: number[] = [];
  const start = isoToLocalDate(startIso);
  const end = isoToLocalDate(endIso);
  const cursor = new Date(start);
  while (cursor <= end) {
    if (cursor.getFullYear() === year && cursor.getMonth() === month) {
      days.push(cursor.getDate());
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function getDayNote(day: number, meta: MonthCalendarMeta): string {
  if (day === meta.ovulationDay) {
    return "Ovulation day. Your body is at its most fertile.";
  }
  if (meta.fertileWindow.includes(day)) {
    return "Fertile window. Increased energy and vitality.";
  }
  if (meta.periodDays.includes(day)) {
    return "Period day. Rest and gentle self-care recommended.";
  }
  if (meta.predictedPeriodDays.includes(day)) {
    return "Predicted period day based on your cycle history.";
  }
  return "Regular cycle day. Listen to your body.";
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function CalendarScreen() {
  // Memoize today's date to prevent unnecessary recalculations
  const todayObj = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(todayObj.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayObj.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<number | null>(
    todayObj.getDate(),
  );
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [isLoggingPeriod, setIsLoggingPeriod] = useState(false);
  const [viewMode, setViewMode] = useState<"own" | "shared">("own");
  const endCurrentCycle = useEndCurrentCycle();

  const { data: profile } = useProfile();
  const { data: careCircleState } = useCareCircle();
  const {
    data: cycleData,
    isLoading: cycleLoading,
    refetch: refetchCurrentCycle,
  } = useCurrentCycle(
    profile?.cycle_length_average ?? 28,
    profile?.period_duration_average ?? 5,
  );
  const { data: dailyLogs = [] } = useDailyLogs(730);
  const { data: completedCycles = [] } = useCycleHistory(6);

  const periodLen = profile?.period_duration_average ?? 5;

  // Determine if viewer has an active connection
  const viewerConnection = careCircleState?.asViewer?.[0] ?? null;
  const isViewer = Boolean(viewerConnection);

  // Memoize current month check to prevent recalculation
  const isCurrentMonth = useMemo(
    () =>
      viewYear === todayObj.getFullYear() && viewMonth === todayObj.getMonth(),
    [viewYear, viewMonth, todayObj],
  );

  const currentDay = useMemo(
    () => (isCurrentMonth ? todayObj.getDate() : -1),
    [isCurrentMonth, todayObj],
  );

  // ─── Derived calendar meta ─────────────────────────────────────────────────
  const calendarMeta: MonthCalendarMeta = useMemo(() => {
    let periodDays: number[] = [];
    let predictedPeriodDays: number[] = [];
    let fertileWindow: number[] = [];
    let ovulationDay = -1;

    const loggedPeriodDays = dailyLogs
      .filter((log) => (log.flow_level ?? 0) > 0)
      .map((log) => isoToLocalDate(log.date))
      .filter(
        (date) =>
          date.getFullYear() === viewYear && date.getMonth() === viewMonth,
      )
      .map((date) => date.getDate());

    const cycleRangeDays = [
      ...completedCycles,
      ...(cycleData?.cycle ? [cycleData.cycle] : []),
    ].flatMap((cycle) => {
      const rangeEnd = cycle.end_date ?? cycle.start_date;
      return isoRangeToCalendarDays(
        cycle.start_date,
        rangeEnd,
        viewMonth,
        viewYear,
      );
    });

    const actualPeriodDays = [
      ...new Set([...loggedPeriodDays, ...cycleRangeDays]),
    ].sort((a, b) => a - b);

    periodDays = actualPeriodDays;

    if (cycleData?.cycle) {
      const { cycle } = cycleData;

      const periodVisualization = derivePeriodVisualizationDays({
        month: viewMonth,
        year: viewYear,
        periodLength: periodLen,
        loggedPeriodDays: actualPeriodDays,
        predictedPeriodStartDate: cycle.predicted_next_cycle,
      });

      periodDays = periodVisualization.periodDays;
      predictedPeriodDays = periodVisualization.predictedPeriodDays;

      // Fertile window from CycleIntelligence
      const fertile = predictFertileWindow(completedCycles, cycle.start_date);
      if (fertile) {
        const rawFertile = isoRangeToCalendarDays(
          fertile.windowStart,
          fertile.windowEnd,
          viewMonth,
          viewYear,
        );
        const ovDate = isoToLocalDate(fertile.ovulationDate);
        if (
          ovDate.getFullYear() === viewYear &&
          ovDate.getMonth() === viewMonth
        ) {
          ovulationDay = ovDate.getDate();
        }
        // The ovulation day is rendered with its own style, exclude from fertileWindow
        fertileWindow = rawFertile.filter((d) => d !== ovulationDay);
      } else if (cycle.predicted_ovulation) {
        // Fallback to DB-stored prediction if CycleIntelligence has no history
        const ovDate = isoToLocalDate(cycle.predicted_ovulation);
        if (
          ovDate.getFullYear() === viewYear &&
          ovDate.getMonth() === viewMonth
        ) {
          ovulationDay = ovDate.getDate();
          // 5 days before → 1 day after = fertile window
          for (let i = -5; i <= 1; i++) {
            if (i === 0) continue; // exclude ovulation day itself
            const d = new Date(ovDate);
            d.setDate(ovDate.getDate() + i);
            if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
              fertileWindow.push(d.getDate());
            }
          }
        }
      }
    }

    return {
      monthLabel: MONTH_NAMES[viewMonth]!,
      year: viewYear,
      currentDay,
      periodDays,
      predictedPeriodDays,
      fertileWindow,
      ovulationDay,
    };
  }, [
    cycleData,
    completedCycles,
    dailyLogs,
    viewMonth,
    viewYear,
    periodLen,
    currentDay,
  ]);

  // ─── Calendar grid ──────────────────────────────────────────────────────────
  const weeks = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    return buildMonthGrid(daysInMonth, firstDayOfWeek);
  }, [viewMonth, viewYear]);

  // ─── Month navigation helpers ──────────────────────────────────────────────
  const goToPrevMonth = useCallback(() => {
    void HapticsService.gestureTick();
    setSelectedDay(null);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [viewMonth]);

  const goToNextMonth = useCallback(() => {
    void HapticsService.gestureTick();
    setSelectedDay(null);
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }, [viewMonth]);

  // Memoize computed values
  const dayNote = useMemo(
    () => (selectedDay ? getDayNote(selectedDay, calendarMeta) : null),
    [selectedDay, calendarMeta],
  );
  const hasCycle = Boolean(cycleData?.cycle);
  const hasActiveCycle = Boolean(cycleData?.cycle);
  const { isDark } = useAppTheme();

  const ovulationEstimate = useMemo(() => {
    if (!cycleData?.cycle?.start_date) return null;
    return estimateOvulation(completedCycles, cycleData.cycle.start_date);
  }, [completedCycles, cycleData?.cycle?.start_date]);

  useEffect(() => {
    if (!ovulationEstimate || viewMode !== "own") return;

    void logDataAccess("cycle_data", "view", {
      source: "calendar_prediction_confidence",
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
    viewMode,
  ]);

  const handleSubmitPeriodModal = useCallback(
    async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
      try {
        await HapticsService.impactMedium();
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
        await HapticsService.success();
        Alert.alert("Saved", "Period dates logged successfully.");
      } catch (error: unknown) {
        await HapticsService.error();
        const message =
          error instanceof Error
            ? error.message
            : "Could not log period dates.";
        Alert.alert("Action Failed", message);
      } finally {
        setIsLoggingPeriod(false);
      }
    },
    [cycleData?.cycle, refetchCurrentCycle],
  );

  const handleEndPeriod = useCallback(() => {
    if (endCurrentCycle.isPending) {
      return;
    }

    Alert.alert(
      "End Current Period",
      "Mark today as the end of your current period?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End",
          onPress: async () => {
            if (endCurrentCycle.isPending) {
              return;
            }

            try {
              await HapticsService.impactMedium();
              await endCurrentCycle.mutateAsync();
              await refetchCurrentCycle();
              await HapticsService.success();
              Alert.alert("Saved", "Current period ended today.");
            } catch (error: unknown) {
              await HapticsService.error();
              const message =
                error instanceof Error ? error.message : String(error);

              // Debug logging
              console.error("[CalendarScreen] End period error:", {
                message,
                fullError: error,
                errorType: typeof error,
              });

              // IMPROVED: Better error messages
              if (
                message.includes("No active period") ||
                message.includes("already ended")
              ) {
                Alert.alert(
                  "No Active Period",
                  "There's no active period to end. Start a new period first.",
                  [{ text: "OK" }],
                );
              } else if (
                message.includes("network") ||
                message.includes("offline") ||
                message.includes("Failed")
              ) {
                Alert.alert(
                  "Connection Issue",
                  message.includes("sync") || message.includes("offline")
                    ? "You're offline. The period will be ended when you're online again."
                    : `Connection error: ${message}\n\nPlease check your internet and try again.`,
                  [{ text: "Try Again", onPress: () => handleEndPeriod() }],
                );
              } else if (
                message.includes("Invalid") ||
                message.includes("format")
              ) {
                Alert.alert(
                  "Data Error",
                  "Your period data appears corrupted. Please contact support.",
                  [{ text: "OK" }],
                );
              } else {
                const fallbackMessage =
                  message || "Could not end the current period.";
                Alert.alert("Action Failed", fallbackMessage, [
                  { text: "Try Again", onPress: () => handleEndPeriod() },
                ]);
              }
            }
          },
        },
      ],
    );
  }, [endCurrentCycle, refetchCurrentCycle]);

  return (
    <Screen>
      <HeaderBar title={"Your Cycle\nCalendar"} />

      {cycleLoading ? (
        <SkeletonLoader />
      ) : (
        <>
          {isViewer && (
            <View
              testID="calendar-view-toggle"
              style={{
                flexDirection: "row",
                gap: 8,
                marginBottom: 16,
                marginTop: 16,
                paddingHorizontal: 8,
              }}
            >
              <PressableScale
                testID="view-mode-own"
                onPress={() => setViewMode("own")}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor:
                    viewMode === "own"
                      ? "#DDA7A5"
                      : isDark
                        ? "rgba(167,139,250,0.14)"
                        : "rgba(221,167,165,0.2)",
                }}
              >
                <Typography
                  style={{
                    textAlign: "center",
                    fontWeight: "600",
                    fontSize: 14,
                    color:
                      viewMode === "own"
                        ? "#FFFFFF"
                        : isDark
                          ? "#F2F2F2"
                          : "#2D2327",
                  }}
                >
                  My Cycle
                </Typography>
              </PressableScale>
              <PressableScale
                testID="view-mode-partner"
                onPress={() => setViewMode("shared")}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor:
                    viewMode === "shared"
                      ? "#DDA7A5"
                      : isDark
                        ? "rgba(167,139,250,0.14)"
                        : "rgba(221,167,165,0.2)",
                }}
              >
                <Typography
                  style={{
                    textAlign: "center",
                    fontWeight: "600",
                    fontSize: 14,
                    color:
                      viewMode === "shared"
                        ? "#FFFFFF"
                        : isDark
                          ? "#F2F2F2"
                          : "#2D2327",
                  }}
                >
                  Shared
                </Typography>
              </PressableScale>
            </View>
          )}

          {/* ── Shared view: Support Dashboard (viewer role) ─────────── */}
          {viewMode === "shared" && isViewer && viewerConnection ? (
            <SupportDashboard
              partnerId={viewerConnection.user_id}
              partnerName={`Partner's`}
            />
          ) : viewMode === "shared" ? null : (
            <>
              {/* ── My Cycle view ────────────────────────────────────── */}
              {/* ── Month navigation ─────────────────────────────────────── */}
              <View
                style={{
                  marginTop: 20,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(221,167,165,0.2)",
                  backgroundColor: isDark
                    ? "rgba(30,33,40,0.9)"
                    : "rgba(255,255,255,0.8)",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  shadowColor: isDark ? "#7C6BE8" : "#DDA7A5",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 16,
                  elevation: 2,
                }}
              >
                <PressableScale
                  onPress={goToPrevMonth}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isDark
                      ? "rgba(167,139,250,0.15)"
                      : "rgba(255,218,185,0.4)",
                  }}
                >
                  <Typography
                    style={{ fontSize: 22, color: "#9B7E8C", lineHeight: 26 }}
                  >
                    ‹
                  </Typography>
                </PressableScale>

                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  {cycleLoading && (
                    <ActivityIndicator size="small" color="#DDA7A5" />
                  )}
                  <Typography
                    style={{
                      fontSize: 18,
                      fontWeight: "600",
                      color: isDark ? "#F2F2F2" : "#2D2327",
                    }}
                  >
                    {calendarMeta.monthLabel} {calendarMeta.year}
                  </Typography>
                </View>

                <PressableScale
                  onPress={goToNextMonth}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isDark
                      ? "rgba(167,139,250,0.15)"
                      : "rgba(255,218,185,0.4)",
                  }}
                >
                  <Typography
                    style={{ fontSize: 22, color: "#9B7E8C", lineHeight: 26 }}
                  >
                    ›
                  </Typography>
                </PressableScale>
              </View>

              <CycleCalendarCard
                weekdays={calendarWeekdays}
                weeks={weeks}
                meta={calendarMeta}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
              />

              {viewMode === "own" && ovulationEstimate ? (
                <View
                  style={{
                    marginTop: 12,
                    marginBottom: 8,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(221,167,165,0.24)",
                    backgroundColor: isDark
                      ? "rgba(30,33,40,0.75)"
                      : "rgba(255,255,255,0.7)",
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                >
                  <Typography
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: isDark ? "#F2F2F2" : "#2D2327",
                    }}
                  >
                    Prediction confidence: {ovulationEstimate.confidence} (
                    {ovulationEstimate.confidenceScore}%)
                  </Typography>
                  <Typography variant="helper" style={{ marginTop: 2 }}>
                    Based on {ovulationEstimate.cyclesUsed} cycle
                    {ovulationEstimate.cyclesUsed === 1 ? "" : "s"}; variability{" "}
                    {ovulationEstimate.variabilityDays} days.
                  </Typography>
                </View>
              ) : null}

              {/* ── Selected day detail card ──────────────────────────────── */}
              {selectedDay && dayNote ? (
                <View
                  style={{
                    marginTop: 16,
                    marginBottom: 16,
                    borderRadius: 28,
                    borderWidth: 1,
                    borderColor: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(255,255,255,0.7)",
                    backgroundColor: isDark
                      ? "rgba(30,33,40,0.8)"
                      : "rgba(255,218,185,0.2)",
                    padding: 20,
                    shadowColor: isDark ? "#7C6BE8" : "#DDA7A5",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.12,
                    shadowRadius: 24,
                    elevation: 4,
                  }}
                >
                  <Typography
                    style={{
                      fontFamily: "PlayfairDisplay-SemiBold",
                      fontSize: 22,
                      color: isDark ? "#F2F2F2" : "#2D2327",
                      marginBottom: 8,
                    }}
                  >
                    {calendarMeta.monthLabel} {selectedDay}
                  </Typography>
                  <Typography
                    style={{
                      fontSize: 15,
                      lineHeight: 24,
                      color: isDark ? "rgba(242,242,242,0.8)" : "#9B7E8C",
                    }}
                  >
                    {dayNote}
                  </Typography>
                </View>
              ) : null}

              {/* ── Empty state ───────────────────────────────────────────── */}
              {!cycleLoading && !hasCycle ? (
                <View
                  style={{
                    marginTop: 16,
                    marginBottom: 32,
                    alignItems: "center",
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(221,167,165,0.2)",
                    backgroundColor: isDark
                      ? "rgba(30,33,40,0.8)"
                      : "rgba(255,255,255,0.75)",
                    padding: 24,
                  }}
                >
                  <Typography
                    variant="helper"
                    style={{ textAlign: "center", lineHeight: 20 }}
                  >
                    Start logging your cycle to see period days, fertile
                    windows, and ovulation predictions here.
                  </Typography>
                </View>
              ) : null}

              <View
                style={{
                  marginBottom: 24,
                  marginTop: 4,
                  flexDirection: "row",
                  gap: 10,
                }}
              >
                <PressableScale
                  onPress={() => setShowPeriodModal(true)}
                  hapticOnPress="selection"
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: isDark
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(221,167,165,0.45)",
                    backgroundColor: isDark
                      ? "rgba(167,139,250,0.14)"
                      : "rgba(255,255,255,0.7)",
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

                {hasActiveCycle ? (
                  <PressableScale
                    onPress={handleEndPeriod}
                    hapticOnPress="impactMedium"
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 999,
                      backgroundColor: "#DDA7A5",
                      paddingVertical: 14,
                      opacity: endCurrentCycle.isPending ? 0.7 : 1,
                    }}
                  >
                    <Typography
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: "#FFFFFF",
                      }}
                    >
                      {endCurrentCycle.isPending ? "Ending…" : "End Period"}
                    </Typography>
                  </PressableScale>
                ) : null}
              </View>

              <PeriodLogModal
                visible={showPeriodModal}
                onClose={() => setShowPeriodModal(false)}
                onSubmit={handleSubmitPeriodModal}
                isSubmitting={isLoggingPeriod}
              />
            </>
          )}
        </>
      )}
    </Screen>
  );
}
