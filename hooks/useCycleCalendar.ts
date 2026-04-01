import { useMemo } from "react";

import { useCurrentCycle } from "@/hooks/useCurrentCycle";
import { useCycleHistory } from "@/hooks/useCycleHistory";
import { useDailyLogs } from "@/hooks/useDailyLogs";
import { useProfile } from "@/hooks/useProfile";
import { predictFertileWindow } from "@/services/CycleIntelligence";
import type { CompletedCycle, CycleRow, DailyLogRow } from "@/types/database";

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

function dayIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseIso(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

function addDays(iso: string, days: number): string {
  const date = parseIso(iso);
  date.setDate(date.getDate() + days);
  return dayIso(date.getFullYear(), date.getMonth(), date.getDate());
}

function inRange(startIso: string, endIso: string): string[] {
  const result: string[] = [];
  const start = parseIso(startIso);
  const end = parseIso(endIso);
  const cursor = new Date(start);

  while (cursor <= end) {
    result.push(
      dayIso(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()),
    );
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
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

export function useCycleCalendar(cycleData?: CycleDataMap): CycleDataMap {
  const { data: profile } = useProfile();
  const { data: cycleDataRaw } = useCurrentCycle(
    profile?.cycle_length_average ?? 28,
    profile?.period_duration_average ?? 5,
  );
  const { data: completedCycles = [] } = useCycleHistory(8);
  const { data: dailyLogs = [] } = useDailyLogs(365);

  const periodLength = profile?.period_duration_average ?? 5;
  const cycleLength = profile?.cycle_length_average ?? 28;

  return useMemo(() => {
    if (cycleData) {
      return cycleData;
    }

    return buildCycleDataMap(
      cycleDataRaw?.cycle,
      completedCycles,
      dailyLogs,
      periodLength,
      cycleLength,
    );
  }, [
    cycleData,
    cycleDataRaw?.cycle,
    completedCycles,
    dailyLogs,
    periodLength,
    cycleLength,
  ]);
}
