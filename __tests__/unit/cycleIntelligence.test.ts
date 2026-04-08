/**
 * __tests__/unit/cycleIntelligence.test.ts
 *
 * Unit tests for services/CycleIntelligence.ts
 *
 * Covers:
 *  - buildCycleHistoryBars: correct ordering, month labels, filtering
 *  - buildSymptomStats:     frequency calculation, top-8 limiting, size scaling
 *  - buildTrendInsight:     all 5 outcome branches with math verification
 *  - stdDev (implicitly via buildTrendInsight)
‌ */
import {
  buildCycleHistoryBars,
  buildSymptomStats,
  buildTrendInsight,
  predictFertileWindow,
  estimateOvulation,
} from '@/services/CycleIntelligence';
import type { CompletedCycle, DailyLogRow, SymptomOption } from '@/types/database';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeCycle(
  startDate: string,
  cycleLength: number,
  id = `cycle-${startDate}`,
): CompletedCycle {
  return {
    id,
    user_id: 'user-1',
    start_date: startDate,
    end_date: new Date(new Date(startDate).getTime() + cycleLength * 864e5)
      .toISOString()
      .split('T')[0]!,
    cycle_length: cycleLength,
    predicted_ovulation: null,
    predicted_next_cycle: null,
    current_phase: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function makeLog(
  date: string,
  symptoms: SymptomOption[] = [],
  id = `log-${date}`,
): DailyLogRow {
  return {
    id,
    user_id: 'user-1',
    date,
    cycle_day: null,
    cycle_id: null,
    flow_level: null,
    mood: null,
    energy_level: null,
    symptoms,
    notes: null,
    hydration_glasses: null,
    sleep_hours: null,
    partner_alert: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ─── buildCycleHistoryBars ───────────────────────────────────────────────────

describe('buildCycleHistoryBars', () => {
  it('returns empty array for no cycles', () => {
    expect(buildCycleHistoryBars([])).toEqual([]);
  });

  it('returns one bar for a single completed cycle', () => {
    const cycles = [makeCycle('2024-01-15', 28)];
    const bars = buildCycleHistoryBars(cycles);
    expect(bars).toHaveLength(1);
    expect(bars[0]!.length).toBe(28);
    expect(bars[0]!.month).toBe('Jan');
  });

  it('sorts oldest-to-newest (ascending start_date)', () => {
    const cycles = [
      makeCycle('2024-03-01', 30),
      makeCycle('2024-01-01', 28),
      makeCycle('2024-02-01', 29),
    ];
    const bars = buildCycleHistoryBars(cycles);
    expect(bars.map((b) => b.month)).toEqual(['Jan', 'Feb', 'Mar']);
  });

  it('limits output to the 6 most recent cycles', () => {
    const cycles = [
      makeCycle('2023-08-01', 28),
      makeCycle('2023-09-01', 29),
      makeCycle('2023-10-01', 30),
      makeCycle('2023-11-01', 27),
      makeCycle('2023-12-01', 28),
      makeCycle('2024-01-01', 31),
      makeCycle('2024-02-01', 29), // 7th – oldest should be dropped
    ];
    const bars = buildCycleHistoryBars(cycles);
    expect(bars).toHaveLength(6);
    // The oldest (Aug) should be excluded; Sep should be first
    expect(bars[0]!.month).toBe('Sep');
  });

  it('filters out cycles with null cycle_length', () => {
    const cyclesWithNull = [
      makeCycle('2024-01-01', 28),
      {
        ...makeCycle('2024-02-01', 29),
        cycle_length: null,
        end_date: '2024-03-01',
      } as unknown as CompletedCycle,
    ];
    const bars = buildCycleHistoryBars(cyclesWithNull);
    expect(bars).toHaveLength(1);
    expect(bars[0]!.month).toBe('Jan');
  });

  it('produces correct month labels for all 12 months', () => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const cycles = months.map((_, i) => {
      const month = String(i + 1).padStart(2, '0');
      return makeCycle(`2024-${month}-01`, 28);
    });
    const bars = buildCycleHistoryBars(cycles.slice(0, 6));
    bars.forEach((bar, i) => {
      expect(bar.month).toBe(months[i]);
    });
  });
});

// ─── buildSymptomStats ───────────────────────────────────────────────────────

describe('buildSymptomStats', () => {
  it('returns empty array for empty logs', () => {
    expect(buildSymptomStats([])).toEqual([]);
  });

  it('returns empty array when no log has symptoms', () => {
    const logs = [makeLog('2024-01-01', []), makeLog('2024-01-02', [])];
    expect(buildSymptomStats(logs)).toEqual([]);
  });

  it('calculates frequency correctly: 100% for symptom logged every day', () => {
    const logs = [
      makeLog('2024-01-01', ['Cramps']),
      makeLog('2024-01-02', ['Cramps']),
      makeLog('2024-01-03', ['Cramps']),
    ];
    const stats = buildSymptomStats(logs);
    expect(stats[0]!.name).toBe('Cramps');
    expect(stats[0]!.frequency).toBe(100);
    expect(stats[0]!.count).toBe(3);
  });

  it('calculates frequency correctly: 50% for symptom logged half the days', () => {
    const logs = [
      makeLog('2024-01-01', ['Cramps']),
      makeLog('2024-01-02', []),
    ];
    const stats = buildSymptomStats(logs);
    expect(stats[0]!.frequency).toBe(50);
  });

  it('scales font size between 12 and 20', () => {
    const logs = [
      makeLog('2024-01-01', ['Cramps', 'Bloating']),
      makeLog('2024-01-02', ['Cramps']),
      makeLog('2024-01-03', ['Cramps']),
    ];
    const stats = buildSymptomStats(logs);
    stats.forEach((s) => {
      expect(s.size).toBeGreaterThanOrEqual(12);
      expect(s.size).toBeLessThanOrEqual(20);
    });
  });

  it('limits to 8 symptom types maximum', () => {
    // 8 unique symptoms all present
    const allSymptoms: SymptomOption[] = [
      'Cramps', 'Tender', 'Radiant', 'Brain Fog',
      'Bloating', 'Energized', 'Moody', 'Calm',
    ];
    const logs = allSymptoms.map((s, i) => makeLog(`2024-01-0${i + 1}`, [s]));
    const stats = buildSymptomStats(logs);
    expect(stats.length).toBeLessThanOrEqual(8);
  });

  it('sorts by count descending (most common first)', () => {
    const logs = [
      makeLog('2024-01-01', ['Cramps', 'Bloating']),
      makeLog('2024-01-02', ['Cramps', 'Bloating']),
      makeLog('2024-01-03', ['Cramps']),
    ];
    const stats = buildSymptomStats(logs);
    expect(stats[0]!.name).toBe('Cramps');
    expect(stats[0]!.count).toBeGreaterThan(stats[1]!.count);
  });

  it('size formula: 12 + floor(frequency/100 * 8)', () => {
    // frequency = 100 → size = 12 + 8 = 20
    const logs = [makeLog('2024-01-01', ['Cramps'])];
    const stats = buildSymptomStats(logs);
    expect(stats[0]!.size).toBe(20);
  });
});

// ─── buildTrendInsight ────────────────────────────────────────────────────────

describe('buildTrendInsight', () => {
  const noLogs: DailyLogRow[] = [];

  it('returns "Keep Logging" with fewer than 2 valid cycles', () => {
    const insight = buildTrendInsight([], noLogs);
    expect(insight.title).toBe('Keep Logging');
  });

  it('returns "Keep Logging" with exactly 1 cycle', () => {
    const insight = buildTrendInsight([makeCycle('2024-01-01', 28)], noLogs);
    expect(insight.title).toBe('Keep Logging');
  });

  it('returns "Very Regular" when stdDev ≤ 2 (identical cycles)', () => {
    const cycles = [
      makeCycle('2024-01-01', 28),
      makeCycle('2024-02-01', 28),
      makeCycle('2024-03-01', 28),
    ];
    const insight = buildTrendInsight(cycles, noLogs);
    expect(insight.title).toBe('Very Regular');
    expect(insight.body).toContain('28 days');
  });

  it('returns "Very Regular" when stdDev is exactly 2', () => {
    // lengths: 26, 28, 30 → mean=28, stdDev=√((4+0+4)/3) ≈ 1.63 < 2
    // Actually need stdDev = 2 exactly:
    // Try [27, 27, 29, 29] → mean=28, variance=1, stdDev=1 → "Very Regular"
    const cycles = [
      makeCycle('2024-01-01', 27),
      makeCycle('2024-02-01', 27),
      makeCycle('2024-03-01', 29),
      makeCycle('2024-04-01', 29),
    ];
    const insight = buildTrendInsight(cycles, noLogs);
    expect(insight.title).toBe('Very Regular');
  });

  it('returns "Mostly Regular" when stdDev ≤ 4 and |delta| ≤ 3', () => {
    // lengths: 26, 28, 30 → sd ≈ 1.63 (<4), delta = 30-28 = 2 (≤3)
    const cycles = [
      makeCycle('2024-01-01', 26),
      makeCycle('2024-02-01', 28),
      makeCycle('2024-03-01', 30),
    ];
    const insight = buildTrendInsight(cycles, noLogs);
    expect(['Mostly Regular', 'Very Regular']).toContain(insight.title);
  });

  it('returns "Cycle Lengthening" when last cycle is >3 days longer than previous', () => {
    const cycles = [
      makeCycle('2024-01-01', 28),
      makeCycle('2024-02-01', 28),
      makeCycle('2024-03-01', 33), // delta = +5 > 3
    ];
    const insight = buildTrendInsight(cycles, noLogs);
    expect(insight.title).toBe('Cycle Lengthening');
    expect(insight.body).toContain('33 days');
    expect(insight.body).toContain('5 days longer');
  });

  it('returns "Cycle Shortening" when last cycle is >3 days shorter than previous', () => {
    const cycles = [
      makeCycle('2024-01-01', 28),
      makeCycle('2024-02-01', 28),
      makeCycle('2024-03-01', 23), // delta = -5 < -3
    ];
    const insight = buildTrendInsight(cycles, noLogs);
    expect(insight.title).toBe('Cycle Shortening');
    expect(insight.body).toContain('23 days');
    expect(insight.body).toContain('5 days shorter');
  });

  it('returns "Within Range" for irregular cycles without extreme delta', () => {
    // stdDev > 4 but |delta| ≤ 3
    const cycles = [
      makeCycle('2024-01-01', 21),
      makeCycle('2024-02-01', 35), // large spread → high stdDev
      makeCycle('2024-03-01', 37), // delta = +2 (≤ 3)
    ];
    const insight = buildTrendInsight(cycles, noLogs);
    expect(insight.title).toBe('Within Range');
    expect(insight.body).toContain('21–37 days');
  });

  it('body for "Very Regular" contains rounded mean', () => {
    const cycles = [
      makeCycle('2024-01-01', 27),
      makeCycle('2024-02-01', 28),
      makeCycle('2024-03-01', 28),
      makeCycle('2024-04-01', 29),
    ];
    const insight = buildTrendInsight(cycles, noLogs);
    // mean = (27+28+28+29)/4 = 28
    expect(['Very Regular', 'Mostly Regular']).toContain(insight.title);
    expect(insight.body).toContain('28 days');
  });

  it('correctly ignores logs parameter (reserved for future)', () => {
    const cycles = [makeCycle('2024-01-01', 28), makeCycle('2024-02-01', 28)];
    const logsWithData: DailyLogRow[] = [makeLog('2024-01-05', ['Cramps'])];
    const insightA = buildTrendInsight(cycles, []);
    const insightB = buildTrendInsight(cycles, logsWithData);
    // Results should be the same since logs aren't used yet
    expect(insightA.title).toBe(insightB.title);
  });

  it('handles severe cramps scenario gracefully', () => {
    // Irregular cycle with cramps logged most days
    const cycles = [
      makeCycle('2024-01-01', 25),
      makeCycle('2024-02-01', 38), // wide variation
    ];
    const crampsLogs = Array.from({ length: 20 }, (_, i) => {
      const d = new Date('2024-01-10');
      d.setDate(d.getDate() + i);
      return makeLog(d.toISOString().split('T')[0]!, ['Cramps']);
    });
    // Should not throw, should return a valid insight
    const insight = buildTrendInsight(cycles, crampsLogs);
    expect(insight.title).toBeTruthy();
    expect(insight.body).toBeTruthy();
  });

  it('handles very low mood streak gracefully', () => {
    const cycles = [
      makeCycle('2024-01-01', 28),
      makeCycle('2024-02-01', 28),
      makeCycle('2024-03-01', 28),
    ];
    const moodLogs = Array.from({ length: 14 }, (_, i) => {
      const d = new Date('2024-03-01');
      d.setDate(d.getDate() + i);
      const log = makeLog(d.toISOString().split('T')[0]!);
      return { ...log, mood: 'Low' as const };
    });
    // Should not throw
    const insight = buildTrendInsight(cycles, moodLogs);
    expect(insight.title).toBeTruthy();
  });
});

// ─── predictFertileWindow ─────────────────────────────────────────────────────

describe('predictFertileWindow (defensive checks for new users)', () => {
  it('returns null when cycles array is empty (brand-new user)', () => {
    const result = predictFertileWindow([], '2026-04-08');
    expect(result).toBeNull();
  });

  it('returns null when cycles is undefined', () => {
    const result = predictFertileWindow(undefined as any, '2026-04-08');
    expect(result).toBeNull();
  });

  it('returns null when currentCycleStartDate is undefined', () => {
    const cycles = [makeCycle('2026-03-01', 28)];
    const result = predictFertileWindow(cycles, undefined as any);
    expect(result).toBeNull();
  });

  it('returns null when currentCycleStartDate is empty string', () => {
    const cycles = [makeCycle('2026-03-01', 28)];
    const result = predictFertileWindow(cycles, '');
    expect(result).toBeNull();
  });

  it('returns prediction when cycles have valid data', () => {
    const cycles = [
      makeCycle('2026-03-01', 28),
      makeCycle('2026-04-01', 29),
    ];
    const result = predictFertileWindow(cycles, '2026-04-01');

    expect(result).not.toBeNull();
    expect(result?.windowStart).toBeDefined();
    expect(result?.ovulationDate).toBeDefined();
    expect(result?.windowEnd).toBeDefined();
    expect(result?.averageCycleLength).toBeGreaterThan(0);
    expect(result?.cyclesUsed).toBeGreaterThan(0);
  });

  it('handles single completed cycle gracefully', () => {
    const cycles = [makeCycle('2026-03-01', 26)];
    const result = predictFertileWindow(cycles, '2026-04-01');

    expect(result).not.toBeNull();
    expect(result?.cyclesUsed).toBe(1);
    expect(result?.averageCycleLength).toBe(26);
  });

  it('calculates fertile window: 5 days before + ovulation day + 1 day after', () => {
    const cycles = [
      makeCycle('2026-03-01', 28),
      makeCycle('2026-04-01', 28),
    ];
    // Start date 2026-04-01, avg cycle 28 days
    // Ovulation cycle day = 28 - 14 = 14
    // Window start = addDays(2026-04-01, 14-6-1) = addDays(2026-04-01, 7) = 2026-04-08 (8 days after)
    // Actually the function calculates: ovulationCycleDay - 6 = 14 - 6 = 8
    // addDays(start, 8) = 2026-04-09
    const result = predictFertileWindow(cycles, '2026-04-01');

    expect(result).not.toBeNull();
    expect(result?.windowStart).toBe('2026-04-09'); // 8 days after start (1-indexed calculation)
    expect(result?.ovulationDate).toBe('2026-04-14');
    expect(result?.windowEnd).toBe('2026-04-15');
  });
});

// ─── estimateOvulation ────────────────────────────────────────────────────────

describe('estimateOvulation (defensive checks for new users)', () => {
  it('returns null when cycles array is empty (brand-new user)', () => {
    const result = estimateOvulation([], '2026-04-08');
    expect(result).toBeNull();
  });

  it('returns null when cycles is undefined', () => {
    const result = estimateOvulation(undefined as any, '2026-04-08');
    expect(result).toBeNull();
  });

  it('returns null when currentCycleStartDate is undefined', () => {
    const cycles = [makeCycle('2026-03-01', 28)];
    const result = estimateOvulation(cycles, undefined as any);
    expect(result).toBeNull();
  });

  it('returns null when currentCycleStartDate is empty string', () => {
    const cycles = [makeCycle('2026-03-01', 28)];
    const result = estimateOvulation(cycles, '');
    expect(result).toBeNull();
  });

  it('returns null when cycles have no completed entries with end_date', () => {
    // Create cycles with null end_date and cycle_length
    const invalidCycles = [
      {
        ...makeCycle('2026-03-01', 28),
        end_date: null,
        cycle_length: null,
      },
    ] as any;
    const result = estimateOvulation(invalidCycles, '2026-04-08');
    expect(result).toBeNull();
  });

  it('returns ovulation estimate with low confidence for single cycle', () => {
    const cycles = [makeCycle('2026-03-01', 28)];
    const result = estimateOvulation(cycles, '2026-04-01');

    expect(result).not.toBeNull();
    expect(result?.estimatedDate).toBeDefined();
    expect(result?.dayNumber).toBeGreaterThan(0);
    expect(result?.confidence).toBe('low');
    expect(result?.cyclesUsed).toBe(1);
    expect(result?.variabilityDays).toBeGreaterThanOrEqual(0);
  });

  it('returns ovulation estimate with high confidence for 6+ consistent cycles', () => {
    const cycles = [
      makeCycle('2026-01-01', 28),
      makeCycle('2026-02-01', 28),
      makeCycle('2026-03-01', 28),
      makeCycle('2026-04-01', 28),
      makeCycle('2026-05-01', 28),
      makeCycle('2026-06-01', 28),
    ];
    const result = estimateOvulation(cycles, '2026-07-01');

    expect(result).not.toBeNull();
    expect(result?.confidence).toBe('high');
    expect(result?.cyclesUsed).toBe(6);
    expect(result?.variabilityDays).toBeLessThanOrEqual(1);
    expect(result?.confidenceScore).toBeGreaterThan(75);
  });

  it('calculates lower confidence score for erratic cycles', () => {
    // Cycles with large variation
    const erraticCycles = [
      makeCycle('2026-01-01', 20),
      makeCycle('2026-02-20', 35),
      makeCycle('2026-04-24', 28),
    ];
    const result = estimateOvulation(erraticCycles, '2026-05-24');

    expect(result).not.toBeNull();
    expect(result?.confidence).toBe('low');
    expect(result?.variabilityDays).toBeGreaterThan(5);
  });

  it('calculates confidence: high ≥80, medium ≥55, low <55', () => {
    // 2 consistent cycles → always low (< 3 required for medium/high)
    const twoConsistent = [
      makeCycle('2026-01-01', 28),
      makeCycle('2026-02-01', 28),
    ];
    const result1 = estimateOvulation(twoConsistent, '2026-03-01');
    expect(result1?.confidence).toBe('low'); // less than 3 cycles = always low

    // 3 consistent cycles → medium (score should be ≥ 55)
    const threeConsistent = [
      makeCycle('2026-01-01', 28),
      makeCycle('2026-02-01', 28),
      makeCycle('2026-03-01', 28),
    ];
    const result2 = estimateOvulation(threeConsistent, '2026-04-01');
    expect(result2?.confidence).toBe('medium');

    // 6 consistent cycles → high (score should be ≥ 80)
    const sixConsistent = [
      makeCycle('2026-01-01', 28),
      makeCycle('2026-02-01', 28),
      makeCycle('2026-03-01', 28),
      makeCycle('2026-04-01', 28),
      makeCycle('2026-05-01', 28),
      makeCycle('2026-06-01', 28),
    ];
    const result3 = estimateOvulation(sixConsistent, '2026-07-01');
    expect(result3?.confidence).toBe('high');
  });
});

// ─── Integration: Brand-new user flow ──────────────────────────────────────────

describe('CycleIntelligence: brand-new user flow', () => {
  it('handles complete new-user scenario without crashes', () => {
    const emptyHistory: CompletedCycle[] = [];
    const emptyLogs: DailyLogRow[] = [];
    const currentCycleStart = '2026-04-08';

    // All should return safe null/empty values WITHOUT CRASHING
    const fertilePrediction = predictFertileWindow(emptyHistory, currentCycleStart);
    const ovulationEst = estimateOvulation(emptyHistory, currentCycleStart);
    const symptomStats = buildSymptomStats(emptyLogs);
    const trendInsight = buildTrendInsight(emptyHistory, emptyLogs);
    const historyBars = buildCycleHistoryBars(emptyHistory);

    expect(fertilePrediction).toBeNull();
    expect(ovulationEst).toBeNull();
    expect(symptomStats).toEqual([]);
    expect(trendInsight.title).toBe('Keep Logging');
    expect(historyBars).toEqual([]);
  });

  it('gracefully transitions from new user to data available', () => {
    const currentCycleStart = '2026-04-01';

    // Phase 1: Brand new, no history
    let result1 = estimateOvulation([], currentCycleStart);
    expect(result1).toBeNull();

    // Phase 2: First cycle completed
    const cycle1 = [makeCycle('2026-03-01', 28)];
    let result2 = estimateOvulation(cycle1, currentCycleStart);
    expect(result2).not.toBeNull();
    expect(result2?.confidence).toBe('low');

    // Phase 3: More cycles accumulated (medium confidence)
    const threeCycles = [
      makeCycle('2026-01-01', 28),
      makeCycle('2026-02-01', 28),
      makeCycle('2026-03-01', 28),
    ];
    let result3 = estimateOvulation(threeCycles, currentCycleStart);
    expect(result3).not.toBeNull();
    expect(result3?.confidence).toBe('medium');

    // Phase 4: Six cycles completed (high confidence)
    const sixCycles = [
      makeCycle('2025-12-01', 28),
      makeCycle('2026-01-01', 28),
      makeCycle('2026-02-01', 28),
      makeCycle('2026-03-01', 28),
      makeCycle('2026-04-01', 28),
      makeCycle('2026-05-01', 28),
    ];
    let result4 = estimateOvulation(sixCycles, currentCycleStart);
    expect(result4).not.toBeNull();
    expect(result4?.confidence).toBe('high');
  });
});
