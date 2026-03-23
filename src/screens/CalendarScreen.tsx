/**
 * src/screens/CalendarScreen.tsx
 *
 * Full cycle calendar with real Supabase data.
 * Replaces all mock data with live calculations from CycleIntelligence.
 */
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, View, useColorScheme } from "react-native";

import { useCurrentCycle } from "@/hooks/useCurrentCycle";
import { logPeriodRangeAction } from "@/hooks/useCycleActions";
import { useCycleHistory } from "@/hooks/useCycleHistory";
import { useProfile } from "@/hooks/useProfile";
import { predictFertileWindow } from "@/services/CycleIntelligence";
import { CycleCalendarCard } from "@/src/components/cards/CycleCalendarCard";
import { HeaderBar } from "@/src/components/ui/HeaderBar";
import { PeriodLogModal } from "@/src/components/ui/PeriodLogModal";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { Screen } from "@/src/components/ui/Screen";
import { Typography } from "@/src/components/ui/Typography";
import type { MonthCalendarMeta } from "@/src/features/cycle/uiMockData";
import {
    buildMonthGrid,
    calendarWeekdays,
} from "@/src/features/cycle/uiMockData";

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

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function isoToLocalDate(iso: string): Date {
  // Parse as local midnight to avoid UTC-shift issues
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

function addDaysToIso(iso: string, days: number): string {
  const d = isoToLocalDate(iso);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function computePeriodDaysForMonth(
  startDateIso: string,
  periodLen: number,
  month: number,
  year: number,
): number[] {
  const days: number[] = [];
  for (let i = 0; i < periodLen; i++) {
    const d = isoToLocalDate(addDaysToIso(startDateIso, i));
    if (d.getFullYear() === year && d.getMonth() === month) {
      days.push(d.getDate());
    }
  }
  return days;
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

  const { data: profile } = useProfile();
  const {
    data: cycleData,
    isLoading: cycleLoading,
    refetch: refetchCurrentCycle,
  } = useCurrentCycle(
    profile?.cycle_length_average ?? 28,
    profile?.period_duration_average ?? 5,
  );
  const { data: completedCycles = [] } = useCycleHistory(6);

  const periodLen = profile?.period_duration_average ?? 5;

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
    let fertileWindow: number[] = [];
    let ovulationDay = -1;

    if (cycleData?.cycle) {
      const { cycle } = cycleData;

      // Current cycle period days
      periodDays = computePeriodDaysForMonth(
        cycle.start_date,
        periodLen,
        viewMonth,
        viewYear,
      );

      // Predicted next period (from DB column)
      if (cycle.predicted_next_cycle) {
        const nextPeriod = computePeriodDaysForMonth(
          cycle.predicted_next_cycle,
          periodLen,
          viewMonth,
          viewYear,
        );
        periodDays = [...new Set([...periodDays, ...nextPeriod])];
      }

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
      fertileWindow,
      ovulationDay,
    };
  }, [cycleData, completedCycles, viewMonth, viewYear, periodLen, currentDay]);

  // ─── Calendar grid ──────────────────────────────────────────────────────────
  const weeks = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    return buildMonthGrid(daysInMonth, firstDayOfWeek);
  }, [viewMonth, viewYear]);

  // ─── Month navigation helpers ──────────────────────────────────────────────
  const goToPrevMonth = useCallback(() => {
    setSelectedDay(null);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [viewMonth]);

  const goToNextMonth = useCallback(() => {
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
  const isDark = useColorScheme() === "dark";

  const handleSubmitPeriodModal = useCallback(
    async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
      try {
        setIsLoggingPeriod(true);
        await logPeriodRangeAction({
          startDate,
          endDate: endDate || undefined,
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

  return (
    <Screen>
      <HeaderBar title={"Your Cycle\nCalendar"} />

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
          shadowColor: "#DDA7A5",
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

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {cycleLoading && <ActivityIndicator size="small" color="#DDA7A5" />}
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
            shadowColor: "#DDA7A5",
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
            Start logging your cycle to see period days, fertile windows, and
            ovulation predictions here.
          </Typography>
        </View>
      ) : null}

      <PressableScale
        onPress={() => setShowPeriodModal(true)}
        style={{
          marginBottom: 24,
          marginTop: 4,
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

      <PeriodLogModal
        visible={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onSubmit={handleSubmitPeriodModal}
        isSubmitting={isLoggingPeriod}
      />
    </Screen>
  );
}
