import type { DailyLogRow } from '@/types/database';
import type { SmartCalendarEvent } from '@/src/features/smartCalendar/types';

function buildDateTime(date: string, hhmm: string): string {
  return `${date}T${hhmm}:00`;
}

export function convertDailyLogToCalendarEvents(
  log: DailyLogRow,
  userId: string,
): SmartCalendarEvent[] {
  const events: SmartCalendarEvent[] = [];

  if (log.mood || log.energy_level || log.flow_level !== null) {
    events.push({
      id: `log-core-${log.id}`,
      userId,
      title: `Daily check-in${log.mood ? ` • ${log.mood}` : ''}`,
      startTime: buildDateTime(log.date, '08:00'),
      endTime: buildDateTime(log.date, '08:20'),
      type: 'log',
      location: null,
      tags: ['mood', 'cycle'],
      participants: [],
      recurrence: null,
      metadata: {
        sourceLogId: log.id,
        mood: log.mood,
        energy: log.energy_level,
        flowLevel: log.flow_level,
      },
      createdAt: log.created_at,
      updatedAt: log.updated_at,
    });
  }

  if ((log.sleep_hours ?? 0) > 0) {
    events.push({
      id: `log-sleep-${log.id}`,
      userId,
      title: `Sleep logged • ${log.sleep_hours}h`,
      startTime: buildDateTime(log.date, '06:30'),
      endTime: buildDateTime(log.date, '06:45'),
      type: 'log',
      location: null,
      tags: ['sleep'],
      participants: [],
      recurrence: null,
      metadata: {
        sourceLogId: log.id,
        sleepHours: log.sleep_hours,
      },
      createdAt: log.created_at,
      updatedAt: log.updated_at,
    });
  }

  if ((log.hydration_glasses ?? 0) > 0) {
    events.push({
      id: `log-hydration-${log.id}`,
      userId,
      title: `Hydration • ${log.hydration_glasses} glasses`,
      startTime: buildDateTime(log.date, '20:00'),
      endTime: buildDateTime(log.date, '20:10'),
      type: 'log',
      location: null,
      tags: ['hydration'],
      participants: [],
      recurrence: null,
      metadata: {
        sourceLogId: log.id,
        hydrationGlasses: log.hydration_glasses,
      },
      createdAt: log.created_at,
      updatedAt: log.updated_at,
    });
  }

  if (log.symptoms.length > 0) {
    events.push({
      id: `log-symptoms-${log.id}`,
      userId,
      title: `Symptoms logged (${log.symptoms.length})`,
      startTime: buildDateTime(log.date, '21:00'),
      endTime: buildDateTime(log.date, '21:15'),
      type: 'log',
      location: null,
      tags: ['symptom'],
      participants: [],
      recurrence: null,
      metadata: {
        sourceLogId: log.id,
        symptoms: log.symptoms,
      },
      createdAt: log.created_at,
      updatedAt: log.updated_at,
    });
  }

  return events;
}

export function mergeAndSortEvents(
  baseEvents: SmartCalendarEvent[],
  logEvents: SmartCalendarEvent[],
): SmartCalendarEvent[] {
  return [...baseEvents, ...logEvents].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
}
