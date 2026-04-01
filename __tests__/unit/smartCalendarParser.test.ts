import { parseNaturalLanguageEvent } from '@/src/features/smartCalendar/nlpParser';

describe('parseNaturalLanguageEvent', () => {
  const baseDate = new Date(2026, 3, 1, 10, 0, 0); // April 1, 2026

  it('parses relative day and 12-hour time', () => {
    const result = parseNaturalLanguageEvent('Workout tomorrow at 7 am', baseDate);

    expect(result.title).toBe('Workout');
    expect(result.date).toBe('2026-04-02');
    expect(result.startTime).toBe('07:00');
    expect(result.endTime).toBe('08:00');
    expect(result.tags).toContain('fitness');
  });

  it('parses next weekday, time, location, and participant', () => {
    const result = parseNaturalLanguageEvent(
      'Meeting with Rahul next Monday at 3pm at office',
      baseDate,
    );

    expect(result.title).toContain('Meeting with Rahul');
    expect(result.startTime).toBe('15:00');
    expect(result.location?.toLowerCase()).toContain('office');
    expect(result.participants).toContain('Rahul');
  });

  it('parses recurrence phrase', () => {
    const result = parseNaturalLanguageEvent('Yoga every Friday at 6:30am', baseDate);

    expect(result.recurrence).not.toBeNull();
    expect(result.recurrence?.frequency).toBe('weekly');
    expect(result.recurrence?.byWeekday).toEqual([5]);
  });

  it('supports time range tokens and noon', () => {
    const result = parseNaturalLanguageEvent('Deep work today from noon to 2pm', baseDate);

    expect(result.startTime).toBe('12:00');
    expect(result.endTime).toBe('14:00');
  });

  it('falls back safely when parsing uncertain input', () => {
    const result = parseNaturalLanguageEvent('sometime maybe soon', baseDate);

    expect(result.title.length).toBeGreaterThan(0);
    expect(result.date).toBe('2026-04-01');
    expect(result.needsReview).toBe(true);
  });
});
