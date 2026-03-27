import type { DailyLogRow, LogPayload } from '@/types/database';

import { mergeDailyLogForUpsert } from '@/hooks/useSaveLog';

function makeExisting(overrides: Partial<DailyLogRow> = {}): DailyLogRow {
  return {
    id: 'log-1',
    user_id: 'user-1',
    date: '2026-03-26',
    cycle_day: 3,
    cycle_id: 'cycle-1',
    flow_level: 2,
    mood: 'Happy',
    energy_level: 'Medium',
    symptoms: ['Cramps'],
    notes: 'Morning note',
    hydration_glasses: 4,
    sleep_hours: 7.5,
    partner_alert: true,
    created_at: '2026-03-26T09:00:00.000Z',
    updated_at: '2026-03-26T09:00:00.000Z',
    ...overrides,
  };
}

describe('mergeDailyLogForUpsert', () => {
  it('preserves existing fields when payload omits them', () => {
    const existing = makeExisting();
    const payload: LogPayload = { flow_level: 3 };

    const merged = mergeDailyLogForUpsert(existing, payload, {
      user_id: 'user-1',
      date: '2026-03-26',
      cycle_id: 'cycle-1',
      cycle_day: 3,
    });

    expect(merged.flow_level).toBe(3);
    expect(merged.mood).toBe('Happy');
    expect(merged.notes).toBe('Morning note');
    expect(merged.symptoms).toEqual(['Cramps']);
  });

  it('applies explicit null and empty array when provided', () => {
    const existing = makeExisting();
    const payload: LogPayload = {
      notes: null,
      symptoms: [],
      mood: null,
      partner_alert: false,
    };

    const merged = mergeDailyLogForUpsert(existing, payload, {
      user_id: 'user-1',
      date: '2026-03-26',
      cycle_id: 'cycle-1',
      cycle_day: 3,
    });

    expect(merged.notes).toBeNull();
    expect(merged.symptoms).toEqual([]);
    expect(merged.mood).toBeNull();
    expect(merged.partner_alert).toBe(false);
  });

  it('uses safe defaults for first log of day (no existing row)', () => {
    const payload: LogPayload = { flow_level: 1 };

    const merged = mergeDailyLogForUpsert(null, payload, {
      user_id: 'user-1',
      date: '2026-03-26',
      cycle_id: null,
      cycle_day: null,
    });

    expect(merged.flow_level).toBe(1);
    expect(merged.mood).toBeNull();
    expect(merged.symptoms).toEqual([]);
    expect(merged.notes).toBeNull();
    expect(merged.partner_alert).toBe(false);
  });
});
