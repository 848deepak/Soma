import { buildCycleDataMap } from "@/hooks/useCycleCalendar";
import type { CompletedCycle, CycleRow, DailyLogRow } from "@/types/database";

function makeCycle(overrides: Partial<CycleRow>): CycleRow {
  return {
    id: "cycle-1",
    user_id: "user-1",
    start_date: "2026-03-20",
    end_date: null,
    cycle_length: null,
    predicted_ovulation: null,
    predicted_next_cycle: null,
    current_phase: null,
    created_at: "2026-03-20T00:00:00Z",
    updated_at: "2026-03-20T00:00:00Z",
    ...overrides,
  };
}

function makeLog(overrides: Partial<DailyLogRow>): DailyLogRow {
  return {
    id: "log-1",
    user_id: "user-1",
    date: "2026-04-01",
    cycle_day: 13,
    cycle_id: "cycle-1",
    flow_level: 1,
    mood: null,
    energy_level: null,
    symptoms: [],
    notes: null,
    hydration_glasses: null,
    sleep_hours: null,
    partner_alert: false,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

describe("buildCycleDataMap", () => {
  it("returns logged period status when there is no cycle", () => {
    const map = buildCycleDataMap(
      null,
      [] as CompletedCycle[],
      [makeLog({ date: "2026-04-03", flow_level: 2 })],
      5,
      28,
    );

    expect(map["2026-04-03"]).toBe("period");
  });

  it("keeps logged period over predicted period on the same date", () => {
    const map = buildCycleDataMap(
      makeCycle({ predicted_next_cycle: "2026-04-10" }),
      [] as CompletedCycle[],
      [makeLog({ date: "2026-04-10", flow_level: 3 })],
      5,
      28,
    );

    expect(map["2026-04-10"]).toBe("period");
    expect(map["2026-04-11"]).toBe("predicted_period");
  });

  it("marks ovulation day distinctly from predicted fertile days", () => {
    const map = buildCycleDataMap(
      makeCycle({ predicted_ovulation: "2026-04-15" }),
      [] as CompletedCycle[],
      [] as DailyLogRow[],
      5,
      28,
    );

    expect(map["2026-04-15"]).toBe("ovulation");
    expect(map["2026-04-14"]).toBe("predicted_fertile");
    expect(map["2026-04-16"]).toBe("predicted_fertile");
  });

  it("prioritizes ovulation over overlapping predicted period", () => {
    const map = buildCycleDataMap(
      makeCycle({
        predicted_ovulation: "2026-04-10",
        predicted_next_cycle: "2026-04-10",
      }),
      [] as CompletedCycle[],
      [] as DailyLogRow[],
      5,
      28,
    );

    expect(map["2026-04-10"]).toBe("ovulation");
  });
});
