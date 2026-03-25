import { buildMiniCalendar } from "@/hooks/useCurrentCycle";
import { predictFertileWindow } from "@/services/CycleIntelligence";
import type { CompletedCycle, CycleRow } from "@/types/database";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0]!;
}

function makeCompletedCycle(startDate: string, length: number): CompletedCycle {
  const end = new Date(`${startDate}T00:00:00`);
  end.setDate(end.getDate() + length - 1);
  return {
    id: `cycle-${startDate}`,
    user_id: "user-1",
    start_date: startDate,
    end_date: end.toISOString().split("T")[0]!,
    cycle_length: length,
    predicted_ovulation: null,
    predicted_next_cycle: null,
    current_phase: "luteal",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

describe("Period end flow", () => {
  it("stops mini-calendar period highlight after explicit end_date", () => {
    const cycle: CycleRow = {
      id: "cycle-1",
      user_id: "user-1",
      start_date: isoDaysAgo(3),
      end_date: isoDaysAgo(1),
      cycle_length: 3,
      predicted_ovulation: null,
      predicted_next_cycle: null,
      current_phase: "menstrual",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mini = buildMiniCalendar(cycle, 7);
    expect(mini[3]?.isCurrent).toBe(true);
    expect(mini[3]?.hasPeriod).toBe(false);
  });

  it("uses only completed cycles with end_date for prediction", () => {
    const completed = makeCompletedCycle("2026-01-01", 28);
    const incompleteLike = {
      ...makeCompletedCycle("2026-02-01", 32),
      end_date: null,
    } as unknown as CompletedCycle;

    const prediction = predictFertileWindow(
      [completed, incompleteLike],
      "2026-03-01",
    );

    expect(prediction).not.toBeNull();
    expect(prediction?.cyclesUsed).toBe(1);
    expect(prediction?.averageCycleLength).toBe(28);
  });
});
