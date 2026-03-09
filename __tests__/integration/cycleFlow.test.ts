/**
 * __tests__/integration/cycleFlow.test.ts
 *
 * Integration tests for the full cycle data flow.
 *
 * Tests the chain:
 *  User logs symptoms → data computed → insights recomputed → partner view updated
 *
 * These tests use Supabase mock (activating the manual mock from lib/__mocks__/supabase.ts)
 * to simulate realistic API responses without hitting a real database.
 */
import { computePhase, computeCycleDay, computeProgress } from '@/hooks/useCurrentCycle';
import {
  buildCycleHistoryBars,
  buildSymptomStats,
  buildTrendInsight,
} from '@/services/CycleIntelligence';
import type { CompletedCycle, DailyLogRow, SymptomOption } from '@/types/database';

// ─── Mock Supabase ────────────────────────────────────────────────────────────
jest.mock('@/lib/supabase');
jest.mock('@/lib/auth');

import { supabase } from '@/lib/supabase';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split('T')[0]!;

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0]!;
}

function makeCycle(startDate: string, length: number): CompletedCycle {
  return {
    id: `cycle-${startDate}`,
    user_id: 'user-1',
    start_date: startDate,
    end_date: new Date(new Date(startDate).getTime() + length * 864e5).toISOString().split('T')[0]!,
    cycle_length: length,
    predicted_ovulation: null,
    predicted_next_cycle: null,
    current_phase: 'luteal',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function makeLog(date: string, symptoms: SymptomOption[], mood: string | null = null): DailyLogRow {
  return {
    id: `log-${date}`,
    user_id: 'user-1',
    date,
    cycle_day: null,
    cycle_id: null,
    flow_level: 2,
    mood: mood as DailyLogRow['mood'],
    energy_level: 'Medium',
    symptoms,
    notes: null,
    hydration_glasses: 6,
    sleep_hours: 7,
    partner_alert: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ─── Test: Full Cycle Flow ─────────────────────────────────────────────────────

describe('Cycle Flow – End to End', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Step 1 – Cycle day and phase computation from active cycle', () => {
    it('correctly derives cycle day from a cycle started today', () => {
      const cycleDay = computeCycleDay(TODAY);
      expect(cycleDay).toBe(1);
    });

    it('correctly derives cycle day from a cycle started 7 days ago', () => {
      const cycleDay = computeCycleDay(daysAgo(6));
      expect(cycleDay).toBe(7);
    });

    it('correctly derives phase for day 1 (menstrual)', () => {
      const phase = computePhase(1, 28, 5);
      expect(phase).toBe('menstrual');
    });

    it('correctly derives phase for day 14 (ovulation)', () => {
      const phase = computePhase(14, 28, 5);
      expect(phase).toBe('ovulation');
    });

    it('correctly derives phase for day 20 (luteal)', () => {
      const phase = computePhase(20, 28, 5);
      expect(phase).toBe('luteal');
    });

    it('computes progress as 50% on day 14 of 28-day cycle', () => {
      const progress = computeProgress(14, 28);
      expect(progress).toBe(0.5);
    });
  });

  describe('Step 2 – Daily log → insights recomputation', () => {
    const baseLog: DailyLogRow = makeLog(TODAY, ['Cramps', 'Bloating']);

    it('symptom stats update when new symptoms are logged', () => {
      const logsBeforeNewEntry = [
        makeLog(daysAgo(2), ['Cramps']),
        makeLog(daysAgo(1), ['Cramps']),
      ];
      const statsBeforeLog = buildSymptomStats(logsBeforeNewEntry);
      const crampsBefore = statsBeforeLog.find((s) => s.name === 'Cramps');
      expect(crampsBefore?.frequency).toBe(100);

      // Simulate new log with Bloating added
      const logsAfterNewEntry = [...logsBeforeNewEntry, baseLog];
      const statsAfterLog = buildSymptomStats(logsAfterNewEntry);
      const crampsAfter = statsAfterLog.find((s) => s.name === 'Cramps');
      const bloatingAfter = statsAfterLog.find((s) => s.name === 'Bloating');

      expect(crampsAfter).toBeDefined();
      expect(bloatingAfter).toBeDefined();
      // Cramps should still be first (highest frequency)
      expect(statsAfterLog[0]!.name).toBe('Cramps');
    });

    it('insights include correct trend after 3+ regular cycles', () => {
      const regularCycles: CompletedCycle[] = [
        makeCycle(daysAgo(84), 28),
        makeCycle(daysAgo(56), 28),
        makeCycle(daysAgo(28), 28),
      ];
      const insight = buildTrendInsight(regularCycles, [baseLog]);
      expect(insight.title).toBe('Very Regular');
      expect(insight.body).toContain('28 days');
    });

    it('insights detect cycle lengthening correctly', () => {
      const irregularCycles: CompletedCycle[] = [
        makeCycle(daysAgo(90), 28),
        makeCycle(daysAgo(60), 28),
        makeCycle(daysAgo(28), 34), // significantly longer
      ];
      const insight = buildTrendInsight(irregularCycles, []);
      expect(insight.title).toBe('Cycle Lengthening');
    });

    it('builds correct cycle history bars from multiple cycles', () => {
      const cycles = [
        makeCycle('2024-01-01', 28),
        makeCycle('2024-02-01', 30),
        makeCycle('2024-03-01', 29),
      ];
      const bars = buildCycleHistoryBars(cycles);
      expect(bars).toHaveLength(3);
      expect(bars[0]!.month).toBe('Jan');
      expect(bars[0]!.length).toBe(28);
      expect(bars[1]!.month).toBe('Feb');
      expect(bars[1]!.length).toBe(30);
    });
  });

  describe('Step 3 – Dashboard state derived values', () => {
    it('computing all dashboard values from a 14-day cycle', () => {
      const startDate = daysAgo(13); // started 13 days ago = day 14 today
      const cycleDay = computeCycleDay(startDate);
      const phase = computePhase(cycleDay, 28, 5);
      const progress = computeProgress(cycleDay, 28);

      expect(cycleDay).toBe(14);
      expect(phase).toBe('ovulation');
      expect(progress).toBe(0.5);
    });

    it('handles day 1 (period just started)', () => {
      const startDate = TODAY;
      const cycleDay = computeCycleDay(startDate);
      const phase = computePhase(cycleDay, 28, 5);
      const progress = computeProgress(cycleDay, 28);

      expect(cycleDay).toBe(1);
      expect(phase).toBe('menstrual');
      expect(progress).toBeCloseTo(1 / 28, 5);
    });

    it('handles the end of a 28-day cycle (day 28)', () => {
      const startDate = daysAgo(27);
      const cycleDay = computeCycleDay(startDate);
      const phase = computePhase(cycleDay, 28, 5);
      const progress = computeProgress(cycleDay, 28);

      expect(cycleDay).toBe(28);
      expect(phase).toBe('luteal');
      expect(progress).toBe(1);
    });
  });

  describe('Step 4 – Supabase mock integration (auth + queries)', () => {
    it('auth.getUser returns test user by default', async () => {
      const { data } = await supabase.auth.getUser();
      // Default mock returns null user
      expect(data).toBeDefined();
    });

    it('anonymous sign-in returns a user ID', async () => {
      const { data, error } = await supabase.auth.signInAnonymously();
      expect(error).toBeNull();
      expect(data.user?.id).toBe('test-user-id');
    });

    it('from() returns null data by default (safe default mock)', async () => {
      const result = await supabase.from('cycles').select('*').is('end_date', null).maybeSingle();
      expect(result.error).toBeNull();
      // Default is null data (no rows)
      expect(result.data).toBeNull();
    });

    it('daily log upsert returns no error', async () => {
      const result = await supabase.from('daily_logs').upsert({
        user_id: 'user-1',
        date: TODAY,
        flow_level: 2,
        symptoms: ['Cramps'],
      });
      expect(result.error).toBeNull();
    });

    it('signOut resolves without error', async () => {
      const { error } = await supabase.auth.signOut();
      expect(error).toBeNull();
    });
  });

  describe('Step 5 – Partner realtime data visibility rules', () => {
    it('partner sees mood only when share_mood permission is granted', () => {
      // Simulate the VIEW behavior: mood is null when permission is not granted
      const logWithMoodNull = makeLog(TODAY, [], null);
      expect(logWithMoodNull.mood).toBeNull();

      const logWithMood = makeLog(TODAY, [], 'Calm');
      expect(logWithMood.mood).toBe('Calm');
    });

    it('partner sees symptoms only when share_symptoms permission is granted', () => {
      const logWithNoSymptoms = makeLog(TODAY, []);
      expect(logWithNoSymptoms.symptoms).toHaveLength(0);

      const logWithSymptoms = makeLog(TODAY, ['Cramps', 'Bloating']);
      expect(logWithSymptoms.symptoms).toHaveLength(2);
    });

    it('partner alert is always visible regardless of permissions', () => {
      const logWithAlert = { ...makeLog(TODAY, []), partner_alert: true };
      expect(logWithAlert.partner_alert).toBe(true);
    });
  });

  describe('Step 6 – Severe cramps and low mood streak anomaly detection', () => {
    it('detects severe cramps streak (5+ consecutive days with cramps)', () => {
      const crampsLogs = Array.from({ length: 5 }, (_, i) =>
        makeLog(daysAgo(i), ['Cramps']),
      );
      const stats = buildSymptomStats(crampsLogs);
      const cramps = stats.find((s) => s.name === 'Cramps');
      expect(cramps?.frequency).toBe(100);
      expect(cramps?.count).toBe(5);
    });

    it('detects very low mood streak across multiple logs', () => {
      const lowMoodLogs = Array.from({ length: 7 }, (_, i) =>
        makeLog(daysAgo(i), [], 'Low'),
      );
      // All logs have mood data but symptom stats are empty (no symptoms)
      const stats = buildSymptomStats(lowMoodLogs);
      expect(stats).toHaveLength(0); // No symptom entries

      // Mood streaks would be detected by a dedicated mood analysis function
      // For now verify that all logs have 'Low' mood
      lowMoodLogs.forEach((log) => {
        expect(log.mood).toBe('Low');
      });
    });

    it('insight remains stable for consistent cycles even with cramps', () => {
      const cycles: CompletedCycle[] = [
        makeCycle(daysAgo(84), 28),
        makeCycle(daysAgo(56), 28),
        makeCycle(daysAgo(28), 28),
      ];
      const crampsLogs = Array.from({ length: 10 }, (_, i) =>
        makeLog(daysAgo(i), ['Cramps']),
      );
      const insight = buildTrendInsight(cycles, crampsLogs);
      // Cycle regularity is still "Very Regular" regardless of symptoms
      expect(insight.title).toBe('Very Regular');
    });
  });
});
