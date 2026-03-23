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
import type { CyclePhase, CycleRow } from "@/types/database";

export const CURRENT_CYCLE_KEY = ["current-cycle"] as const;

// ─── Pure helper functions (also used by CycleIntelligence in Phase 3) ───────

/** Returns the 1-based day number within the cycle (Day 1 = start_date). */
export function computeCycleDay(startDateIso: string): number {
  const start = new Date(startDateIso);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor(
    (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(1, diff + 1);
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
  cycleLength: number = 28,
  periodLen: number = 5,
): CyclePhase {
  const ovulationDay = Math.max(periodLen + 2, cycleLength - 14);
  if (cycleDay <= periodLen) return "menstrual";
  if (cycleDay < ovulationDay) return "follicular";
  if (cycleDay <= ovulationDay + 1) return "ovulation";
  return "luteal";
}

/** Progress ratio 0–1 clamped to the cycle length. */
export function computeProgress(
  cycleDay: number,
  cycleLength: number = 28,
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

export function useCurrentCycle(cycleLength = 28, periodLen = 5) {
  return useQuery<DerivedCycleData | null>({
    queryKey: CURRENT_CYCLE_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cycles")
        .select("*")
        .is("end_date", null)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("[CurrentCycle] Query error:", error);
        return null;
      }
      if (!data) return null;

      const cycle = data as unknown as CycleRow;
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
    // Cycle data doesn't change during a session – refresh every 10 min
    staleTime: 10 * 60 * 1000,
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
  periodLen: number = 5,
): Array<{
  day: string;
  date: number;
  isCurrent: boolean;
  hasPeriod: boolean;
}> {
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const periodDates = new Set<number>();

  if (cycle) {
    const start = new Date(cycle.start_date);
    // Current period window
    for (let i = 0; i < periodLen; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      periodDates.add(d.getDate());
    }
    // Predicted next period window
    if (cycle.predicted_next_cycle) {
      const next = new Date(cycle.predicted_next_cycle);
      for (let i = 0; i < periodLen; i++) {
        const d = new Date(next);
        d.setDate(next.getDate() + i);
        periodDates.add(d.getDate());
      }
    }
  }

  return [-3, -2, -1, 0, 1, 2, 3].map((offset) => {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    return {
      day: DAY_NAMES[d.getDay()],
      date: d.getDate(),
      isCurrent: offset === 0,
      hasPeriod: periodDates.has(d.getDate()),
    };
  });
}
