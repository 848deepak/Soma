/**
 * __tests__/unit/advancedIntelligence.test.ts
 *
 * Unit tests for Phase 9 CycleIntelligence functions:
 *   predictFertileWindow, estimateOvulation, assessPMSRisk
 */
import {
  derivePeriodVisualizationDays,
  predictFertileWindow,
  estimateOvulation,
  assessPMSRisk,
} from '@/services/CycleIntelligence';
import type { CompletedCycle, DailyLogRow } from '@/types/database';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeCycle(startDate: string, length: number): CompletedCycle {
  return {
    id: `c-${startDate}`,
    user_id: 'user-1',
    start_date: startDate,
    end_date: '2024-12-01',
    cycle_length: length,
    predicted_ovulation: null,
    predicted_next_cycle: null,
    current_phase: null,
    created_at: startDate,
    updated_at: startDate,
  };
}

function makeLog(
  date: string,
  symptoms: DailyLogRow['symptoms'] = [],
  cycleDay: number | null = null,
): DailyLogRow {
  return {
    id: `log-${date}`,
    user_id: 'user-1',
    date,
    cycle_day: cycleDay,
    cycle_id: null,
    flow_level: null,
    mood: null,
    energy_level: null,
    symptoms,
    notes: null,
    hydration_glasses: null,
    sleep_hours: null,
    partner_alert: false,
    created_at: date,
    updated_at: date,
  };
}

const START = '2024-01-01';

// ─── derivePeriodVisualizationDays ──────────────────────────────────────────

describe('derivePeriodVisualizationDays', () => {
  it('keeps only logged days as actual period days', () => {
    const result = derivePeriodVisualizationDays({
      month: 2,
      year: 2026,
      periodLength: 5,
      loggedPeriodDays: [10, 11],
      predictedPeriodStartDate: '2026-03-10',
    });

    expect(result.periodDays).toEqual([10, 11]);
  });

  it('does not allow predictions to override logged days', () => {
    const result = derivePeriodVisualizationDays({
      month: 2,
      year: 2026,
      periodLength: 5,
      loggedPeriodDays: [10, 11],
      predictedPeriodStartDate: '2026-03-10',
    });

    // Predicted range is Mar 10-14; logged days 10/11 must stay actual only.
    expect(result.predictedPeriodDays).toEqual([12, 13, 14]);
  });

  it('returns full predicted range when there is no overlap with logged days', () => {
    const result = derivePeriodVisualizationDays({
      month: 2,
      year: 2026,
      periodLength: 3,
      loggedPeriodDays: [1, 2],
      predictedPeriodStartDate: '2026-03-10',
    });

    expect(result.periodDays).toEqual([1, 2]);
    expect(result.predictedPeriodDays).toEqual([10, 11, 12]);
  });
});

// ─── predictFertileWindow ────────────────────────────────────────────────────

describe('predictFertileWindow', () => {
  it('returns null when no cycles are provided', () => {
    expect(predictFertileWindow([], START)).toBeNull();
  });

  it('returns a prediction when at least one cycle exists', () => {
    const result = predictFertileWindow([makeCycle('2023-12-01', 28)], START);
    expect(result).not.toBeNull();
  });

  describe('28-day cycle (standard)', () => {
    const cycles = [makeCycle('2023-12-01', 28)];
    let result: ReturnType<typeof predictFertileWindow>;

    beforeAll(() => {
      result = predictFertileWindow(cycles, START);
    });

    it('sets averageCycleLength to 28', () => {
      expect(result?.averageCycleLength).toBe(28);
    });

    it('predicts ovulation on day 14 (2024-01-14)', () => {
      expect(result?.ovulationDate).toBe('2024-01-14');
    });

    it('starts fertile window 5 days before ovulation (2024-01-09)', () => {
      expect(result?.windowStart).toBe('2024-01-09');
    });

    it('ends fertile window 1 day after ovulation (2024-01-15)', () => {
      expect(result?.windowEnd).toBe('2024-01-15');
    });

    it('reports 1 cycle used', () => {
      expect(result?.cyclesUsed).toBe(1);
    });
  });

  describe('30-day cycle', () => {
    it('predicts ovulation on day 16', () => {
      const result = predictFertileWindow([makeCycle('2023-12-01', 30)], START);
      expect(result?.ovulationDate).toBe('2024-01-16');
    });

    it('starts fertile window 5 days before ovulation (day 11)', () => {
      const result = predictFertileWindow([makeCycle('2023-12-01', 30)], START);
      expect(result?.windowStart).toBe('2024-01-11');
    });
  });

  describe('moving average uses last 6 cycles', () => {
    it('caps at 6 cycles even when more are provided', () => {
      const cycles = Array.from({ length: 8 }, (_, i) =>
        makeCycle(`2023-0${(i % 9) + 1}-01`, 28),
      );
      const result = predictFertileWindow(cycles, START);
      expect(result?.cyclesUsed).toBe(6);
    });

    it('blends different cycle lengths into a moving average', () => {
      // 3 cycles of 28 + 3 cycles of 32 → average = 30
      const cycles = [
        makeCycle('2023-01-01', 28),
        makeCycle('2023-02-01', 28),
        makeCycle('2023-03-01', 28),
        makeCycle('2023-04-01', 32),
        makeCycle('2023-05-01', 32),
        makeCycle('2023-06-01', 32),
      ];
      const result = predictFertileWindow(cycles, START);
      expect(result?.averageCycleLength).toBe(30);
    });
  });

  describe('windowStart precedes ovulationDate which precedes windowEnd', () => {
    it('maintains correct date order', () => {
      const result = predictFertileWindow([makeCycle('2023-12-01', 28)], START);
      expect(result!.windowStart < result!.ovulationDate).toBe(true);
      expect(result!.ovulationDate < result!.windowEnd).toBe(true);
    });
  });
});

// ─── estimateOvulation ───────────────────────────────────────────────────────

describe('estimateOvulation', () => {
  it('returns null when no cycles are provided', () => {
    expect(estimateOvulation([], START)).toBeNull();
  });

  describe('with a single 28-day cycle', () => {
    const cycles = [makeCycle('2023-12-01', 28)];

    it('estimates ovulation on day 14', () => {
      const result = estimateOvulation(cycles, START);
      expect(result?.dayNumber).toBe(14);
    });

    it('estimates ovulation date as 2024-01-14', () => {
      const result = estimateOvulation(cycles, START);
      expect(result?.estimatedDate).toBe('2024-01-14');
    });

    it('returns low confidence for a single cycle', () => {
      const result = estimateOvulation(cycles, START);
      expect(result?.confidence).toBe('low');
    });
  });

  describe('confidence levels', () => {
    it('returns medium confidence for 3 cycles with stdDev ≤ 5', () => {
      const cycles = [
        makeCycle('2023-01-01', 28),
        makeCycle('2023-02-01', 29),
        makeCycle('2023-03-01', 28),
      ];
      const result = estimateOvulation(cycles, START);
      expect(result?.confidence).toBe('medium');
    });

    it('returns high confidence for 6 cycles with stdDev ≤ 2', () => {
      const cycles = [
        makeCycle('2023-01-01', 28),
        makeCycle('2023-02-01', 28),
        makeCycle('2023-03-01', 28),
        makeCycle('2023-04-01', 28),
        makeCycle('2023-05-01', 28),
        makeCycle('2023-06-01', 28),
      ];
      const result = estimateOvulation(cycles, START);
      expect(result?.confidence).toBe('high');
    });

    it('returns low confidence for 6 cycles with high variability (stdDev > 5)', () => {
      const cycles = [
        makeCycle('2023-01-01', 21),
        makeCycle('2023-02-01', 35),
        makeCycle('2023-03-01', 25),
        makeCycle('2023-04-01', 40),
        makeCycle('2023-05-01', 22),
        makeCycle('2023-06-01', 34),
      ];
      const result = estimateOvulation(cycles, START);
      expect(result?.confidence).toBe('low');
    });

    it('returns low confidence for only 2 cycles (below medium threshold of 3)', () => {
      const cycles = [
        makeCycle('2023-01-01', 28),
        makeCycle('2023-02-01', 28),
      ];
      const result = estimateOvulation(cycles, START);
      expect(result?.confidence).toBe('low');
    });
  });

  describe('dayNumber uses moving average', () => {
    it('calculates dayNumber as round(avgLength) - 14', () => {
      // Average of 28 and 30 = 29 → dayNumber = 29 - 14 = 15
      const cycles = [makeCycle('2023-01-01', 28), makeCycle('2023-02-01', 30)];
      const result = estimateOvulation(cycles, START);
      expect(result?.dayNumber).toBe(15); // round(29) - 14 = 15
    });
  });
});

// ─── assessPMSRisk ───────────────────────────────────────────────────────────

describe('assessPMSRisk', () => {
  const noCycles: CompletedCycle[] = [];

  it('returns low risk with score 0 for empty logs', () => {
    const result = assessPMSRisk(noCycles, []);
    expect(result).toEqual({ level: 'low', triggerSymptoms: [], score: 0 });
  });

  it('returns low risk when logs have no PMS symptoms', () => {
    const logs = [
      makeLog('2024-01-10', ['Energized', 'Radiant', 'Calm']),
      makeLog('2024-01-11', ['Energized']),
    ];
    const result = assessPMSRisk(noCycles, logs);
    expect(result.level).toBe('low');
    expect(result.score).toBe(0);
    expect(result.triggerSymptoms).toHaveLength(0);
  });

  describe('risk level thresholds', () => {
    it('returns low risk for score ≤ 30', () => {
      // 1 log with 1 PMS symptom (Cramps) out of 5 possible = 20% → low
      const logs = [makeLog('2024-01-10', ['Cramps'])];
      const result = assessPMSRisk(noCycles, logs);
      expect(result.level).toBe('low');
      expect(result.score).toBe(20);
    });

    it('returns medium risk for score between 31 and 60', () => {
      // 1 log with 3 PMS symptoms: Cramps, Bloating, Moody → 3/5 = 60 → NOT > 60 → medium
      const logs = [makeLog('2024-01-10', ['Cramps', 'Bloating', 'Moody'])];
      const result = assessPMSRisk(noCycles, logs);
      expect(result.level).toBe('medium');
      expect(result.score).toBe(60);
    });

    it('returns high risk for score > 60', () => {
      // 2 logs each with 4 PMS symptoms: Cramps, Bloating, Moody, Brain Fog
      // total = 8, max possible = 2×5 = 10 → score = 80 → high
      const logs = [
        makeLog('2024-01-10', ['Cramps', 'Bloating', 'Moody', 'Brain Fog']),
        makeLog('2024-01-11', ['Cramps', 'Bloating', 'Moody', 'Brain Fog']),
      ];
      const result = assessPMSRisk(noCycles, logs);
      expect(result.level).toBe('high');
      expect(result.score).toBe(80);
    });
  });

  describe('triggerSymptoms', () => {
    it('includes only PMS-associated symptoms', () => {
      const logs = [makeLog('2024-01-10', ['Cramps', 'Energized', 'Radiant'])];
      const result = assessPMSRisk(noCycles, logs);
      // Energized and Radiant are not PMS symptoms → should not be in triggerSymptoms
      expect(result.triggerSymptoms).toEqual(['Cramps']);
    });

    it('sorts trigger symptoms by frequency (most frequent first)', () => {
      const logs = [
        makeLog('2024-01-10', ['Cramps', 'Bloating']),
        makeLog('2024-01-11', ['Cramps']),
        makeLog('2024-01-12', ['Cramps', 'Moody']),
      ];
      const result = assessPMSRisk(noCycles, logs);
      // Cramps: 3, Bloating: 1, Moody: 1 → Cramps is first
      expect(result.triggerSymptoms[0]).toBe('Cramps');
    });

    it('excludes non-PMS SymptomOptions (Energized, Radiant, Calm)', () => {
      const logs = [
        makeLog('2024-01-10', ['Energized', 'Radiant', 'Calm']),
        makeLog('2024-01-11', ['Energized', 'Calm']),
      ];
      const result = assessPMSRisk(noCycles, logs);
      expect(result.triggerSymptoms).toHaveLength(0);
    });

    it('identifies all 5 PMS symptoms when all are present', () => {
      const logs = [
        makeLog('2024-01-10', ['Cramps', 'Bloating', 'Moody', 'Brain Fog', 'Tender']),
      ];
      const result = assessPMSRisk(noCycles, logs);
      expect(result.triggerSymptoms).toHaveLength(5);
    });
  });

  describe('score calculation', () => {
    it('normalises score to 0–100 range', () => {
      const logs = [makeLog('2024-01-10', ['Cramps', 'Bloating'])];
      const result = assessPMSRisk(noCycles, logs);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('returns score 0 when no PMS symptoms across multiple logs', () => {
      const logs = [
        makeLog('2024-01-10', ['Energized']),
        makeLog('2024-01-11', ['Radiant', 'Calm']),
      ];
      const result = assessPMSRisk(noCycles, logs);
      expect(result.score).toBe(0);
    });

    it('returns score 100 when all PMS symptoms appear in every log (5 items, 1 log)', () => {
      // 5 PMS symptoms / (1 log × 5 PMS_SYMPTOMS) = 100%
      const logs = [
        makeLog('2024-01-10', ['Cramps', 'Bloating', 'Moody', 'Brain Fog', 'Tender']),
      ];
      const result = assessPMSRisk(noCycles, logs);
      expect(result.score).toBe(100);
      expect(result.level).toBe('high');
    });
  });
});
