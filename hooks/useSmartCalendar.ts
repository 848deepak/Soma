import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useDailyLogs } from '@/hooks/useDailyLogs';
import { toLocalDateIso } from '@/src/features/smartCalendar/dateUtils';
import { buildLogInsights, buildSmartSuggestions } from '@/src/features/smartCalendar/suggestions';
import type {
  SmartCalendarEvent,
  SmartLogInsights,
  SmartSuggestion,
} from '@/src/features/smartCalendar/types';
import {
  createEventFromNaturalLanguage,
  deleteEvent,
  listMergedEvents,
  subscribeToSmartEvents,
  updateEvent,
} from '@/src/services/smartCalendarService';

const SMART_CALENDAR_QUERY_KEY = (startDateIso: string, endDateIso: string) =>
  ['smart-calendar-events', startDateIso, endDateIso] as const;

export function useSmartCalendar(startDate: Date, endDate: Date) {
  const startDateIso = useMemo(() => toLocalDateIso(startDate), [startDate]);
  const endDateIso = useMemo(() => toLocalDateIso(endDate), [endDate]);
  const queryClient = useQueryClient();

  const { data: logs = [] } = useDailyLogs(60);

  const eventsQuery = useQuery<SmartCalendarEvent[]>({
    queryKey: SMART_CALENDAR_QUERY_KEY(startDateIso, endDateIso),
    queryFn: () => listMergedEvents({ startDateIso, endDateIso }, logs),
    staleTime: 45_000,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const subscription = subscribeToSmartEvents(() => {
      void queryClient.invalidateQueries({
        queryKey: SMART_CALENDAR_QUERY_KEY(startDateIso, endDateIso),
      });
    });

    return () => subscription.unsubscribe();
  }, [queryClient, startDateIso, endDateIso]);

  const suggestions = useMemo<SmartSuggestion[]>(() => {
    return buildSmartSuggestions(logs);
  }, [logs]);

  const logInsights = useMemo<SmartLogInsights>(() => {
    return buildLogInsights(logs);
  }, [logs]);

  return {
    events: eventsQuery.data ?? [],
    isLoading: eventsQuery.isLoading,
    isError: eventsQuery.isError,
    suggestions,
    logInsights,
    createFromText: async (input: string) => {
      const draft = await createEventFromNaturalLanguage(input);
      await queryClient.invalidateQueries({
        queryKey: SMART_CALENDAR_QUERY_KEY(startDateIso, endDateIso),
      });
      return draft;
    },
    updateEvent,
    deleteEvent,
  };
}
