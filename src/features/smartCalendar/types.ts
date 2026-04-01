export type SmartEventType = 'manual' | 'ai' | 'log';

export type SmartRecurrenceFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'weekdays'
  | 'weekends';

export interface SmartRecurrenceRule {
  frequency: SmartRecurrenceFrequency;
  interval?: number;
  byWeekday?: number[];
  untilDate?: string | null;
}

export interface SmartCalendarEvent {
  id: string;
  userId: string;
  title: string;
  startTime: string;
  endTime: string;
  type: SmartEventType;
  location: string | null;
  tags: string[];
  participants: string[];
  recurrence: SmartRecurrenceRule | null;
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface SmartEventDraft {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  participants: string[];
  tags: string[];
  recurrence: SmartRecurrenceRule | null;
  rawText: string;
  confidence: number;
  needsReview: boolean;
  editableFields: Array<
    'title' | 'date' | 'startTime' | 'endTime' | 'location' | 'participants' | 'recurrence'
  >;
}

export interface SmartSuggestion {
  id: string;
  title: string;
  rationale: string;
  suggestedStartTime: string;
  suggestedEndTime: string;
  confidence: number;
  source: 'habit' | 'mood' | 'sleep' | 'productivity';
  tags: string[];
}

export interface SmartLogInsights {
  totalLogs: number;
  lowMoodCount: number;
  avgSleepHours: number | null;
  avgHydrationGlasses: number | null;
  topSymptoms: string[];
  latestMood: string | null;
  latestEnergyLevel: string | null;
}

export type SmartCalendarViewMode = 'month' | 'week' | 'day' | 'list';

export const SMART_EVENT_COLORS: Record<SmartEventType, string> = {
  manual: '#2B5F9E',
  ai: '#0C7E66',
  log: '#95602A',
};
