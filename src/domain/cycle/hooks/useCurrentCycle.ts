/**
 * hooks/useCurrentCycle.ts
 * Fetches the active (open) cycle and derives all computed display values
 * that the Dashboard and Calendar screens need.
 *
 * An "active cycle" is a cycles row where end_date IS NULL.
 * Returns null when no cycle exists yet (new user before SetupScreen).
 */
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/src/lib/queryKeys";
import type { CyclePhase, CycleRow } from "@/types/database";
import { CYCLE_DEFAULTS } from "@/src/domain/constants/cycleDefaults";
import {
  diffDaysExclusive,
  parseLocalDate,
  dateRange as computeDateRange,
  addDays,
  todayLocal,
} from "@/src/domain/utils/dateUtils";

// Re-export from query keys registry for backward compatibility
export const CURRENT_CYCLE_KEY = QUERY_KEYS.currentCycle();

// ─── Pure helper functions (also used by CycleIntelligence in Phase 3) ───────

/** Returns the 1-based day number within the cycle (Day 1 = start_date). */
export function computeCycleDay(startDateIso: string): number {
  const todayStr = todayLocal();

  // diffDaysExclusive: 0 = same day, 1 = next day, etc.
  // We want cycleDay: 1 = start_date, 2 = next day, etc.
  // So cycleDay = diffDaysExclusive + 1
  return diffDaysExclusive(startDateIso, todayStr) + 1;
}

/**
 * Derives a CyclePhase label from the current cycle day.
 *
 * Uses the standard "luteal phase is always ~14 days" heuristic:
 *   ovulation = cycleLength - 14
 *
 * @param cycleDay   1-based day within the cycle
 * @param cycleLength  average cycle length (from profile, default 28)
 * @param periodLen  average period length (from profile, default 5)
 */
export function computePhase(
  cycleDay: number,
  cycleLength: number = CYCLE_DEFAULTS.CYCLE_LENGTH,
  periodLen: number = CYCLE_DEFAULTS.PERIOD_DURATION,
): CyclePhase {
  const ovulationDay = Math.max(
    periodLen + 2,
    cycleLength - CYCLE_DEFAULTS.LUTEAL_PHASE_LENGTH,
  );
  if (cycleDay <= periodLen) return "menstrual";
  if (cycleDay < ovulationDay) return "follicular";
  if (cycleDay <= ovulationDay + 1) return "ovulation";
  return "luteal";
}

/** Progress ratio 0–1 clamped to the cycle length. */
export function computeProgress(
  cycleDay: number,
  cycleLength: number = CYCLE_DEFAULTS.CYCLE_LENGTH,
): number {
  return Math.min(1, cycleDay / cycleLength);
}

const PHASE_LABELS: Record<CyclePhase, string> = {
  menstrual: "Menstrual Phase",
  follicular: "Follicular Phase",
  ovulation: "Ovulation Phase",
  luteal: "Luteal Phase",
};

export function getPhaseLabel(phase: CyclePhase): string {
  return PHASE_LABELS[phase];
}

// ─── Query hook ───────────────────────────────────────────────────────────────

export interface DerivedCycleData {
  cycle: CycleRow;
  cycleDay: number;
  phase: CyclePhase;
  phaseLabel: string;
  progress: number;
}

export function useCurrentCycle(
  cycleLength = CYCLE_DEFAULTS.CYCLE_LENGTH,
  periodLen = CYCLE_DEFAULTS.PERIOD_DURATION,
) {
  return useQuery<DerivedCycleData | null>({
    queryKey: QUERY_KEYS.currentCycle(),
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("cycles")
        .select("*")
        .eq("user_id", user.id)
        .is("end_date", null)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        if (__DEV__) {
          console.warn("[CurrentCycle] Query error:", error);
        }
        return null;
      }
      if (!data) return null;

      const cycle = data as unknown as CycleRow;

      // SAFETY: Validate required fields
      if (!cycle.id || !cycle.start_date) {
        console.warn("[CurrentCycle] Invalid cycle data:", cycle);
        return null;
      }

      const cycleDay = computeCycleDay(cycle.start_date);
      const phase = computePhase(cycleDay, cycleLength, periodLen);

      return {
        cycle,
        cycleDay,
        phase,
        phaseLabel: getPhaseLabel(phase),
        progress: computeProgress(cycleDay, cycleLength),
      };
    },
    // CRITICAL FIX: Reduce staleTime to 2 minutes (from 10)
    // This ensures fresher data for end period operations
    staleTime: 2 * 60 * 1000,
    // Simplified retry logic
    retry: (failureCount, error) => {
      if (error.message.includes("network") && failureCount < 1) {
        return true;
      }
      return false;
    },
    // Don't throw errors, return null instead
    throwOnError: false,
    // Add timeout through query options
    meta: {
      timeout: 3000,
    },
  });
}

/**
 * Generates a 7-day mini calendar window centred on today,
 * marking period and predicted period days from the cycle row.
 *
 * Replaces the static `miniCalendar` mock from uiMockData.ts.
 */
export function buildMiniCalendar(
  cycle: CycleRow | null,
  periodLen: number = CYCLE_DEFAULTS.PERIOD_DURATION,
): Array<{
  day: string;
  date: number;
  isCurrent: boolean;
  hasPeriod: boolean;
}> {
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const toLocalStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = new Date();
  const todayStr = toLocalStr(today);

  const periodDates = new Set<string>();

  if (cycle) {
    // Compute period date range
    let endDateStr = cycle.end_date;
    if (!endDateStr) {
      // Infer end date from period length
      const inferredEnd = parseLocalDate(cycle.start_date);
      inferredEnd.setDate(inferredEnd.getDate() + Math.max(0, periodLen - 1));
      endDateStr = toLocalStr(inferredEnd);
    }

    // Add all period dates
    const periodRange = computeDateRange(cycle.start_date, endDateStr);
    periodRange.forEach((dateStr) => periodDates.add(dateStr));

    // Add predicted next period dates
    if (cycle.predicted_next_cycle) {
      for (let i = 0; i < periodLen; i++) {
        const predictedDate = addDays(cycle.predicted_next_cycle, i);
        periodDates.add(predictedDate);
      }
    }
  }

  return [-3, -2, -1, 0, 1, 2, 3].map((offset) => {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    const dateStr = toLocalStr(d);
    return {
      day: DAY_NAMES[d.getDay()],
      date: d.getDate(),
      isCurrent: dateStr === todayStr,
      hasPeriod: periodDates.has(dateStr),
    };
  });
}
