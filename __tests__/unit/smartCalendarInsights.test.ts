import { buildLogInsights, buildSmartSuggestions } from '@/src/features/smartCalendar/suggestions';
import type { DailyLogRow } from '@/types/database';

function makeLog(input: Partial<DailyLogRow> & { date: string }): DailyLogRow {
  return {
    id: `log-${input.date}`,
    user_id: 'user-1',
    date: input.date,
    cycle_day: input.cycle_day ?? null,
    cycle_id: input.cycle_id ?? null,
    flow_level: input.flow_level ?? null,
    mood: input.mood ?? null,
    energy_level: input.energy_level ?? null,
    symptoms: input.symptoms ?? [],
    notes: input.notes ?? null,
    hydration_glasses: input.hydration_glasses ?? null,
    sleep_hours: input.sleep_hours ?? null,
    partner_alert: input.partner_alert ?? false,
    created_at: input.created_at ?? `${input.date}T08:00:00Z`,
    updated_at: input.updated_at ?? `${input.date}T08:00:00Z`,
  };
}

describe('smart calendar inbuilt log intelligence', () => {
  it('builds suggestions from logs only', () => {
    const logs: DailyLogRow[] = [
      makeLog({ date: '2026-03-25', mood: 'Low', sleep_hours: 5.5, hydration_glasses: 3, energy_level: 'High' }),
      makeLog({ date: '2026-03-26', mood: 'Irritable', sleep_hours: 5, hydration_glasses: 4, energy_level: 'High' }),
      makeLog({ date: '2026-03-27', sleep_hours: 6.2, hydration_glasses: 2, energy_level: 'High' }),
      makeLog({ date: '2026-03-28', sleep_hours: 5.8, hydration_glasses: 3, energy_level: 'Medium' }),
      makeLog({ date: '2026-03-29', sleep_hours: 6.5, hydration_glasses: 4, energy_level: 'High' }),
      makeLog({ date: '2026-03-30', sleep_hours: 5.9, hydration_glasses: 4, energy_level: 'High' }),
      makeLog({ date: '2026-03-31', sleep_hours: 6.1, hydration_glasses: 2, energy_level: 'Medium' }),
    ];

    const suggestions = buildSmartSuggestions(logs);
    const ids = suggestions.map((item) => item.id);

    expect(ids).toContain('mood-support-checkin');
    expect(ids).toContain('sleep-recovery');
    expect(ids).toContain('hydration-routine');
    expect(ids).toContain('habit-energy-window');
  });

  it('builds log insights from tracked fields', () => {
    const logs: DailyLogRow[] = [
      makeLog({ date: '2026-03-30', mood: 'Low', energy_level: 'Medium', sleep_hours: 6, hydration_glasses: 4, symptoms: ['Cramps'] }),
      makeLog({ date: '2026-03-31', mood: 'Calm', energy_level: 'High', sleep_hours: 8, hydration_glasses: 6, symptoms: ['Cramps', 'Bloating'] }),
      makeLog({ date: '2026-04-01', mood: 'Happy', energy_level: 'High', sleep_hours: 7, hydration_glasses: 7, symptoms: ['Bloating'] }),
    ];

    const insights = buildLogInsights(logs);

    expect(insights.totalLogs).toBe(3);
    expect(insights.lowMoodCount).toBe(1);
    expect(insights.avgSleepHours).toBe(7);
    expect(insights.avgHydrationGlasses).toBe(5.7);
    expect(insights.latestMood).toBe('Happy');
    expect(insights.latestEnergyLevel).toBe('High');
    expect(insights.topSymptoms).toEqual(['Cramps', 'Bloating']);
  });
});
