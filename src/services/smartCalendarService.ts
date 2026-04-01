import { supabase } from '@/lib/supabase';
import { convertDailyLogToCalendarEvents, mergeAndSortEvents } from '@/src/features/smartCalendar/logIntegration';
import { parseNaturalLanguageEvent } from '@/src/features/smartCalendar/nlpParser';
import type {
  SmartCalendarEvent,
  SmartEventDraft,
  SmartEventType,
} from '@/src/features/smartCalendar/types';
import type { DailyLogRow } from '@/types/database';

export interface EventFilters {
  startDateIso: string;
  endDateIso: string;
  includeTypes?: SmartEventType[];
}

function toDbEvent(event: SmartEventDraft, userId: string) {
  return {
    user_id: userId,
    title: event.title,
    start_time: `${event.date}T${event.startTime}:00`,
    end_time: `${event.date}T${event.endTime}:00`,
    type: 'ai',
    location: event.location,
    tags: event.tags,
    participants: event.participants,
    recurrence: event.recurrence,
    metadata: {
      rawText: event.rawText,
      parseConfidence: event.confidence,
      editableFields: event.editableFields,
    },
  };
}

function mapDbEvent(row: Record<string, unknown>): SmartCalendarEvent {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title),
    startTime: String(row.start_time),
    endTime: String(row.end_time),
    type: row.type as SmartEventType,
    location: (row.location as string | null) ?? null,
    tags: (row.tags as string[] | null) ?? [],
    participants: (row.participants as string[] | null) ?? [],
    recurrence: (row.recurrence as SmartCalendarEvent['recurrence']) ?? null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
    createdAt: (row.created_at as string | undefined) ?? undefined,
    updatedAt: (row.updated_at as string | undefined) ?? undefined,
  };
}

async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function createEventFromNaturalLanguage(input: string): Promise<SmartEventDraft | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const draft = parseNaturalLanguageEvent(input);
  const payload = toDbEvent(draft, userId);

  const { error } = await supabase.from('smart_events').insert(payload);
  if (error) throw error;

  return draft;
}

export async function createManualEvent(event: {
  title: string;
  startTime: string;
  endTime: string;
  location?: string | null;
  tags?: string[];
  participants?: string[];
  recurrence?: SmartCalendarEvent['recurrence'];
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const { error } = await supabase.from('smart_events').insert({
    user_id: userId,
    title: event.title,
    start_time: event.startTime,
    end_time: event.endTime,
    type: 'manual',
    location: event.location ?? null,
    tags: event.tags ?? [],
    participants: event.participants ?? [],
    recurrence: event.recurrence ?? null,
    metadata: event.metadata ?? {},
  });

  if (error) throw error;
}

export async function updateEvent(
  eventId: string,
  patch: Partial<{
    title: string;
    startTime: string;
    endTime: string;
    location: string | null;
    tags: string[];
    participants: string[];
    recurrence: SmartCalendarEvent['recurrence'];
    metadata: Record<string, unknown>;
  }>,
): Promise<void> {
  const payload = {
    title: patch.title,
    start_time: patch.startTime,
    end_time: patch.endTime,
    location: patch.location,
    tags: patch.tags,
    participants: patch.participants,
    recurrence: patch.recurrence,
    metadata: patch.metadata,
  };

  const { error } = await supabase.from('smart_events').update(payload).eq('id', eventId);
  if (error) throw error;
}

export async function deleteEvent(eventId: string): Promise<void> {
  const { error } = await supabase.from('smart_events').delete().eq('id', eventId);
  if (error) throw error;
}

export async function listSmartEvents(filters: EventFilters): Promise<SmartCalendarEvent[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  let query = supabase
    .from('smart_events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', `${filters.startDateIso}T00:00:00`)
    .lte('start_time', `${filters.endDateIso}T23:59:59`)
    .order('start_time', { ascending: true });

  if (filters.includeTypes && filters.includeTypes.length > 0) {
    query = query.in('type', filters.includeTypes);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => mapDbEvent(row as Record<string, unknown>));
}

export async function listMergedEvents(
  filters: EventFilters,
  logs: DailyLogRow[],
): Promise<SmartCalendarEvent[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const events = await listSmartEvents(filters);
  const logEvents = logs
    .filter(
      (log) =>
        log.date >= filters.startDateIso &&
        log.date <= filters.endDateIso,
    )
    .flatMap((log) => convertDailyLogToCalendarEvents(log, userId));
  return mergeAndSortEvents(events, logEvents);
}

export function subscribeToSmartEvents(onChange: () => void): { unsubscribe: () => void } {
  const channel = supabase
    .channel('smart-events-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'smart_events' },
      () => onChange(),
    )
    .subscribe();

  return {
    unsubscribe: () => {
      void supabase.removeChannel(channel);
    },
  };
}
