import { useMemo } from "react";

import { useCurrentCycle } from "@/hooks/useCurrentCycle";
import { useCycleHistory } from "@/hooks/useCycleHistory";
import { useDailyLogs, useDailyLogsByDateRange } from "@/hooks/useDailyLogs";
import { useProfile } from "@/hooks/useProfile";
import { predictFertileWindow } from "@/services/CycleIntelligence";
import type { CompletedCycle, CycleRow, DailyLogRow } from "@/types/database";
import { addDays as utilAddDays, dateRange as computeDateRange } from "@/src/domain/utils/dateUtils";

export type CycleStatus =
  | "period"
  | "fertile"
  | "ovulation"
  | "predicted_period"
  | "predicted_fertile"
  | null;

export type CycleDataMap = {
  [dateString: string]: CycleStatus;
};

const STATUS_PRIORITY: Record<Exclude<CycleStatus, null>, number> = {
  period: 5,
  ovulation: 4,
  fertile: 3,
  predicted_fertile: 2,
  predicted_period: 1,
};

function addDays(iso: string, days: number): string {
  return utilAddDays(iso, days);
}

function dayIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseIso(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

function localTodayIso(): string {
  const now = new Date();
  return dayIso(now.getFullYear(), now.getMonth(), now.getDate());
}

function inRange(startIso: string, endIso: string): string[] {
  return computeDateRange(startIso, endIso);
}

function setStatus(
  map: Record<string, Exclude<CycleStatus, null>>,
  iso: string,
  status: Exclude<CycleStatus, null>,
) {
  const current = map[iso];
  if (!current || STATUS_PRIORITY[status] >= STATUS_PRIORITY[current]) {
    map[iso] = status;
  }
}

export function buildCycleDataMap(
  cycle: CycleRow | null | undefined,
  history: CompletedCycle[],
  logs: DailyLogRow[],
  periodLength: number,
  cycleLength: number,
): CycleDataMap {
  const statusMap: Record<string, Exclude<CycleStatus, null>> = {};

  if (cycle?.start_date) {
    const today = localTodayIso();

    if (cycle.end_date && cycle.end_date >= cycle.start_date) {
      inRange(cycle.start_date, cycle.end_date).forEach((iso) => {
        setStatus(statusMap, iso, "period");
      });
    } else {
      const inferredEnd = addDays(cycle.start_date, Math.max(0, periodLength - 1));
      const activeEnd = inferredEnd < today ? inferredEnd : today;
      if (activeEnd >= cycle.start_date) {
        inRange(cycle.start_date, activeEnd).forEach((iso) => {
          setStatus(statusMap, iso, "period");
        });
      }
    }
  }

  logs
    .filter((entry) => (entry.flow_level ?? 0) > 0)
    .forEach((entry) => {
      setStatus(statusMap, entry.date, "period");
    });

  if (!cycle?.start_date) {
    return statusMap;
  }

  const fertilePrediction = predictFertileWindow(history, cycle.start_date);
  if (fertilePrediction) {
    inRange(fertilePrediction.windowStart, fertilePrediction.windowEnd).forEach(
      (iso) => {
        if (iso === fertilePrediction.ovulationDate) {
          setStatus(statusMap, iso, "ovulation");
        } else {
          setStatus(statusMap, iso, "predicted_fertile");
        }
      },
    );
  } else if (cycle.predicted_ovulation) {
    setStatus(statusMap, cycle.predicted_ovulation, "ovulation");
    for (let i = -5; i <= 1; i += 1) {
      if (i === 0) continue;
      setStatus(
        statusMap,
        addDays(cycle.predicted_ovulation, i),
        "predicted_fertile",
      );
    }
  }

  if (cycle.predicted_next_cycle) {
    let predictedStart = cycle.predicted_next_cycle;
    for (let cycleIndex = 0; cycleIndex < 8; cycleIndex += 1) {
      for (let dayOffset = 0; dayOffset < periodLength; dayOffset += 1) {
        setStatus(
          statusMap,
          addDays(predictedStart, dayOffset),
          "predicted_period",
        );
      }
      predictedStart = addDays(predictedStart, cycleLength);
    }
  }

  return statusMap;
}

/**
 * Compute an ISO date string from year, month, day.
 */
function dayIsoHelper(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Compute the visible date range for calendar queries.
 * Returns: [visibleRangeStart, visibleRangeEnd]
 * Window = previous month + current month + next month (approx 90 days).
 */
function getVisibleDateRange(
  visibleMonth?: number,
  visibleYear?: number,
): [string, string] | null {
  if (visibleMonth === undefined || visibleYear === undefined) {
    return null;
  }

  // Start: first day of previous month
  const prevMonth = visibleMonth === 0 ? 11 : visibleMonth - 1;
  const prevYear = visibleMonth === 0 ? visibleYear - 1 : visibleYear;
  const fromDate = dayIsoHelper(prevYear, prevMonth, 1);

  // End: last day of next month
  const nextMonth = visibleMonth === 11 ? 0 : visibleMonth + 1;
  const nextYear = visibleMonth === 11 ? visibleYear + 1 : visibleYear;
  const lastDayOfNext = new Date(nextYear, nextMonth + 1, 0).getDate();
  const toDate = dayIsoHelper(nextYear, nextMonth, lastDayOfNext);

  return [fromDate, toDate];
}

export interface UseCycleCalendarOptions {
  /** Pre-computed cycle data (used for server-side rendering / testing) */
  cycleData?: CycleDataMap;
  /** Visible month (0–11) for optimized date range queries */
  visibleMonth?: number;
  /** Visible year for optimized date range queries */
  visibleYear?: number;
}

export function useCycleCalendar(options?: UseCycleCalendarOptions): CycleDataMap {
  const { data: profile } = useProfile();
  const { data: cycleDataRaw } = useCurrentCycle(
    profile?.cycle_length_average ?? 28,
    profile?.period_duration_average ?? 5,
  );
  const { data: completedCycles = [] } = useCycleHistory(8);

  // Optimize: use date range query if visibleMonth/Year provided; fallback to 365-day limit
  const dateRange = getVisibleDateRange(options?.visibleMonth, options?.visibleYear);
  const { data: dailyLogsByRange = [] } = useDailyLogsByDateRange(
    dateRange?.[0] ?? "2000-01-01",
    dateRange?.[1] ?? "2099-12-31",
  );
  const { data: dailyLogsLegacy = [] } = useDailyLogs(dateRange ? 0 : 365); // Only use if no date range

  const dailyLogs = dateRange ? dailyLogsByRange : dailyLogsLegacy;

  const periodLength = profile?.period_duration_average ?? 5;
  const cycleLength = profile?.cycle_length_average ?? 28;

  return useMemo(() => {
    if (options?.cycleData) {
      return options.cycleData;
    }

    return buildCycleDataMap(
      cycleDataRaw?.cycle,
      completedCycles,
      dailyLogs,
      periodLength,
      cycleLength,
    );
  }, [
    // ─── OPTIMIZATION: Use scalar values instead of object references ───
    // This prevents recomputation when objects are referentially new but
    // semantically identical (e.g., after non-mutation query refetches)
    options?.cycleData,
    // Extract stable scalar identifiers from cycle
    cycleDataRaw?.cycle?.id,
    cycleDataRaw?.cycle?.start_date,
    cycleDataRaw?.cycle?.end_date,
    // Use derived scalar from cycles array instead of array reference
    completedCycles.map(c => `${c.id}|${c.start_date}`).join(','),
    // Use derived scalar from logs instead of array reference
    dailyLogs.map(l => `${l.date}|${l.flow_level}`).join(','),
    periodLength,
    cycleLength,
  ]);
}
