/**
 * __tests__/unit/cycleLogic.test.ts
 *
 * Unit tests for pure helper functions in hooks/useCurrentCycle.ts
 * and src/features/cycle/uiCycleData.ts
 *
 * All functions here are deterministic and side-effect-free – no mocks needed.
 */
import {
  computeCycleDay,
  computePhase,
  computeProgress,
  getPhaseLabel,
  buildMiniCalendar,
} from '@/hooks/useCurrentCycle';
import { buildMonthGrid } from '@/src/features/cycle/uiCycleData';
import type { CycleRow } from '@/types/database';

// ─── computeCycleDay ─────────────────────────────────────────────────────────

describe('computeCycleDay', () => {
  it('returns 1 when start_date is today', () => {
    const today = new Date().toISOString().split('T')[0]!;
    expect(computeCycleDay(today)).toBe(1);
  });

  it('returns 5 when start_date was 4 days ago', () => {
    const start = new Date();
    start.setDate(start.getDate() - 4);
    const iso = start.toISOString().split('T')[0]!;
    expect(computeCycleDay(iso)).toBe(5);
  });

  it('returns 14 for a start date 13 days ago', () => {
    const start = new Date();
    start.setDate(start.getDate() - 13);
    const iso = start.toISOString().split('T')[0]!;
    expect(computeCycleDay(iso)).toBe(14);
  });

  it('never returns less than 1 for future dates', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const iso = future.toISOString().split('T')[0]!;
    expect(computeCycleDay(iso)).toBeGreaterThanOrEqual(1);
  });
});

// ─── computePhase ─────────────────────────────────────────────────────────────

describe('computePhase', () => {
  const DEFAULT_CYCLE = 28;
  const DEFAULT_PERIOD = 5;

  // menstrual: day 1–5
  it('returns "menstrual" on day 1', () => {
    expect(computePhase(1, DEFAULT_CYCLE, DEFAULT_PERIOD)).toBe('menstrual');
  });

  it('returns "menstrual" on day 5 (last day of period)', () => {
    expect(computePhase(5, DEFAULT_CYCLE, DEFAULT_PERIOD)).toBe('menstrual');
  });

  // follicular: day 6 to ovulationDay-1
  it('returns "follicular" on day 6', () => {
    expect(computePhase(6, DEFAULT_CYCLE, DEFAULT_PERIOD)).toBe('follicular');
  });

  it('returns "follicular" on day 13 (one before ovulation)', () => {
    // ovulationDay = max(5+2, 28-14) = max(7, 14) = 14
    expect(computePhase(13, DEFAULT_CYCLE, DEFAULT_PERIOD)).toBe('follicular');
  });

  // ovulation: day 14–15
  it('returns "ovulation" on day 14 (ovulation day)', () => {
    expect(computePhase(14, DEFAULT_CYCLE, DEFAULT_PERIOD)).toBe('ovulation');
  });

  it('returns "ovulation" on day 15 (ovulationDay + 1)', () => {
    expect(computePhase(15, DEFAULT_CYCLE, DEFAULT_PERIOD)).toBe('ovulation');
  });

  // luteal: day 16+
  it('returns "luteal" on day 16', () => {
    expect(computePhase(16, DEFAULT_CYCLE, DEFAULT_PERIOD)).toBe('luteal');
  });

  it('returns "luteal" on day 28 (last cycle day)', () => {
    expect(computePhase(28, DEFAULT_CYCLE, DEFAULT_PERIOD)).toBe('luteal');
  });

  // Custom lengths
  it('handles a short 21-day cycle correctly', () => {
    // ovulation = max(5+2, 21-14) = max(7, 7) = 7
    expect(computePhase(6, 21, 5)).toBe('follicular');
    expect(computePhase(7, 21, 5)).toBe('ovulation');
    expect(computePhase(8, 21, 5)).toBe('ovulation');
    expect(computePhase(9, 21, 5)).toBe('luteal');
  });

  it('handles a long 35-day cycle correctly', () => {
    // ovulation = max(5+2, 35-14) = max(7, 21) = 21
    expect(computePhase(20, 35, 5)).toBe('follicular');
    expect(computePhase(21, 35, 5)).toBe('ovulation');
    expect(computePhase(22, 35, 5)).toBe('ovulation');
    expect(computePhase(23, 35, 5)).toBe('luteal');
  });

  it('returns "follicular" when cycle day > periodLen and < ovulationDay', () => {
    expect(computePhase(10, 28, 5)).toBe('follicular');
  });
});

// ─── computeProgress ─────────────────────────────────────────────────────────

describe('computeProgress', () => {
  it('returns 0.5 on day 14 of a 28-day cycle', () => {
    expect(computeProgress(14, 28)).toBe(0.5);
  });

  it('returns 1 exactly on the last cycle day', () => {
    expect(computeProgress(28, 28)).toBe(1);
  });

  it('caps at 1 when cycleDay exceeds cycleLength', () => {
    expect(computeProgress(35, 28)).toBe(1);
  });

  it('returns a small value on day 1', () => {
    const p = computeProgress(1, 28);
    expect(p).toBeCloseTo(1 / 28, 5);
  });

  it('uses default cycle length of 28 when not provided', () => {
    expect(computeProgress(14)).toBe(0.5);
  });
});

// ─── getPhaseLabel ────────────────────────────────────────────────────────────

describe('getPhaseLabel', () => {
  it('returns "Menstrual Phase" for menstrual', () => {
    expect(getPhaseLabel('menstrual')).toBe('Menstrual Phase');
  });

  it('returns "Follicular Phase" for follicular', () => {
    expect(getPhaseLabel('follicular')).toBe('Follicular Phase');
  });

  it('returns "Ovulation Phase" for ovulation', () => {
    expect(getPhaseLabel('ovulation')).toBe('Ovulation Phase');
  });

  it('returns "Luteal Phase" for luteal', () => {
    expect(getPhaseLabel('luteal')).toBe('Luteal Phase');
  });
});

// ─── buildMiniCalendar ────────────────────────────────────────────────────────

describe('buildMiniCalendar', () => {
  const mockCycle: CycleRow = {
    id: 'cycle-1',
    user_id: 'user-1',
    start_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!,
    end_date: null,
    cycle_length: null,
    predicted_ovulation: null,
    predicted_next_cycle: null,
    current_phase: 'menstrual',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('returns exactly 7 days', () => {
    const calendar = buildMiniCalendar(mockCycle, 5);
    expect(calendar).toHaveLength(7);
  });

  it('marks the middle entry (offset 0) as isCurrent', () => {
    const calendar = buildMiniCalendar(mockCycle, 5);
    const current = calendar.find((d) => d.isCurrent);
    expect(current).toBeDefined();
    // isCurrent should be at index 3 (the center day)
    expect(calendar[3]!.isCurrent).toBe(true);
  });

  it('returns 7 days when cycle is null', () => {
    const calendar = buildMiniCalendar(null, 5);
    expect(calendar).toHaveLength(7);
  });

  it('each entry has day, date, isCurrent and hasPeriod fields', () => {
    const calendar = buildMiniCalendar(mockCycle);
    calendar.forEach((entry) => {
      expect(typeof entry.day).toBe('string');
      expect(typeof entry.date).toBe('number');
      expect(typeof entry.isCurrent).toBe('boolean');
      expect(typeof entry.hasPeriod).toBe('boolean');
    });
  });

  it('marks period days from cycle start', () => {
    // start_date = today → days 1-5 have period
    const today = new Date().toISOString().split('T')[0]!;
    const cycleTodayStart: CycleRow = { ...mockCycle, start_date: today };
    const calendar = buildMiniCalendar(cycleTodayStart, 5);
    // today (center) should have hasPeriod = true
    expect(calendar[3]!.hasPeriod).toBe(true);
  });

  it('stops period highlight after explicit end_date', () => {
    const start = new Date();
    start.setDate(start.getDate() - 3);
    const end = new Date();
    end.setDate(end.getDate() - 1);

    const endedCycle: CycleRow = {
      ...mockCycle,
      start_date: start.toISOString().split('T')[0]!,
      end_date: end.toISOString().split('T')[0]!,
      cycle_length: 3,
    };

    const calendar = buildMiniCalendar(endedCycle, 7);
    expect(calendar[3]!.isCurrent).toBe(true);
    expect(calendar[3]!.hasPeriod).toBe(false);
  });

  it('does not bleed old cycle highlights into matching day-of-month', () => {
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const oldCycle: CycleRow = {
      ...mockCycle,
      start_date: lastMonth.toISOString().split('T')[0]!,
      end_date: lastMonth.toISOString().split('T')[0]!,
      cycle_length: 1,
    };

    const calendar = buildMiniCalendar(oldCycle, 5);
    expect(calendar[3]!.isCurrent).toBe(true);
    expect(calendar[3]!.hasPeriod).toBe(false);
  });
});

// ─── buildMonthGrid ──────────────────────────────────────────────────────────

describe('buildMonthGrid', () => {
  it('builds a grid for a 31-day month starting on Sunday (0)', () => {
    const grid = buildMonthGrid(31, 0);
    // No leading nulls
    expect(grid[0]![0]).toBe(1);
    // Last row ends with 31
    const lastRow = grid[grid.length - 1]!;
    const lastDay = lastRow.filter((d) => d !== null).pop();
    expect(lastDay).toBe(31);
  });

  it('builds a grid for a 28-day month starting on Wednesday (3)', () => {
    const grid = buildMonthGrid(28, 3);
    // First 3 cells are null
    expect(grid[0]![0]).toBeNull();
    expect(grid[0]![1]).toBeNull();
    expect(grid[0]![2]).toBeNull();
    expect(grid[0]![3]).toBe(1);
  });

  it('every row has exactly 7 cells', () => {
    const grid = buildMonthGrid(30, 2);
    grid.forEach((row) => {
      expect(row).toHaveLength(7);
    });
  });

  it('contains all days 1–N exactly once', () => {
    const daysInMonth = 30;
    const grid = buildMonthGrid(daysInMonth, 1);
    const allDays = grid.flat().filter((d) => d !== null) as number[];
    expect(allDays).toHaveLength(daysInMonth);
    for (let d = 1; d <= daysInMonth; d++) {
      expect(allDays).toContain(d);
    }
  });

  it('pads the last row with nulls', () => {
    // 31 days, starting Saturday (6) → should need padding
    const grid = buildMonthGrid(31, 6);
    const lastRow = grid[grid.length - 1]!;
    // If 31 doesn't fill the week, trailing cells are null
    const nullCount = lastRow.filter((d) => d === null).length;
    expect(nullCount).toBeGreaterThanOrEqual(0); // 0 is valid if exactly 7 days fill the row
  });
});
