import { addDays, getNextWeekday, toLocalDateIso } from '@/src/features/smartCalendar/dateUtils';
import type {
  SmartEventDraft,
  SmartRecurrenceRule,
} from '@/src/features/smartCalendar/types';

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function parseTimeToken(token: string): string | null {
  const normalized = token.trim().toLowerCase();

  if (normalized === 'noon') return '12:00';
  if (normalized === 'midnight') return '00:00';

  const twelveHour = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (twelveHour) {
    const rawHour = Number(twelveHour[1]);
    const minute = Number(twelveHour[2] ?? '0');
    if (rawHour < 1 || rawHour > 12 || minute > 59) return null;
    let hour = rawHour % 12;
    if (twelveHour[3].toLowerCase() === 'pm') hour += 12;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  const twentyFourHour = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHour) {
    const hour = Number(twentyFourHour[1]);
    const minute = Number(twentyFourHour[2]);
    if (hour > 23 || minute > 59) return null;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  return null;
}

function parseTimeRange(input: string): {
  start: string;
  end: string | null;
  hasExplicitTime: boolean;
} {
  const rangeMatch = input.match(
    /(?:from\s+)?(\d{1,2}(?::\d{2})?\s?(?:am|pm)|\d{1,2}:\d{2}|noon|midnight)\s*(?:-|to)\s*(\d{1,2}(?::\d{2})?\s?(?:am|pm)|\d{1,2}:\d{2}|noon|midnight)/i,
  );

  if (rangeMatch) {
    const start = parseTimeToken(rangeMatch[1]);
    const end = parseTimeToken(rangeMatch[2]);
    if (start && end) {
      return { start, end, hasExplicitTime: true };
    }
  }

  const singleTimeMatch = input.match(
    /(?:at\s+)?(\d{1,2}(?::\d{2})?\s?(?:am|pm)|\d{1,2}:\d{2}|noon|midnight)/i,
  );

  if (singleTimeMatch) {
    const start = parseTimeToken(singleTimeMatch[1]);
    if (start) {
      const [hours, minutes] = start.split(':').map(Number);
      const endHours = (hours + 1) % 24;
      const end = `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      return { start, end, hasExplicitTime: true };
    }
  }

  return { start: '09:00', end: '10:00', hasExplicitTime: false };
}

function parseRecurrence(input: string): SmartRecurrenceRule | null {
  const value = input.toLowerCase();

  if (/every\s+day|daily/.test(value)) {
    return { frequency: 'daily', interval: 1 };
  }

  if (/every\s+weekday|weekdays/.test(value)) {
    return { frequency: 'weekdays', interval: 1, byWeekday: [1, 2, 3, 4, 5] };
  }

  if (/every\s+weekend|weekends/.test(value)) {
    return { frequency: 'weekends', interval: 1, byWeekday: [0, 6] };
  }

  const weekdayMatch = value.match(/every\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/);
  if (weekdayMatch) {
    const weekday = WEEKDAYS[weekdayMatch[1] ?? ''];
    if (weekday !== undefined) {
      return { frequency: 'weekly', interval: 1, byWeekday: [weekday] };
    }
  }

  if (/every\s+week|weekly/.test(value)) {
    return { frequency: 'weekly', interval: 1 };
  }

  if (/every\s+month|monthly/.test(value)) {
    return { frequency: 'monthly', interval: 1 };
  }

  return null;
}

function parseDate(input: string, baseDate: Date): { date: string; hasExplicitDate: boolean } {
  const lower = input.toLowerCase();

  if (lower.includes('today')) {
    return { date: toLocalDateIso(baseDate), hasExplicitDate: true };
  }

  if (lower.includes('tomorrow')) {
    return { date: toLocalDateIso(addDays(baseDate, 1)), hasExplicitDate: true };
  }

  const nextWeekdayMatch = lower.match(/next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/);
  if (nextWeekdayMatch) {
    const weekday = WEEKDAYS[nextWeekdayMatch[1] ?? ''];
    if (weekday !== undefined) {
      return {
        date: toLocalDateIso(getNextWeekday(baseDate, weekday)),
        hasExplicitDate: true,
      };
    }
  }

  if (lower.includes('next week')) {
    return { date: toLocalDateIso(addDays(baseDate, 7)), hasExplicitDate: true };
  }

  const mdMatch = lower.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (mdMatch) {
    const month = Number(mdMatch[1]);
    const day = Number(mdMatch[2]);
    const yearRaw = mdMatch[3];
    const year = yearRaw ? Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw) : baseDate.getFullYear();
    const parsed = new Date(year, month - 1, day);
    if (!Number.isNaN(parsed.getTime())) {
      return { date: toLocalDateIso(parsed), hasExplicitDate: true };
    }
  }

  const isoMatch = lower.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    return { date: `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`, hasExplicitDate: true };
  }

  return { date: toLocalDateIso(baseDate), hasExplicitDate: false };
}

function extractLocation(input: string): string | null {
  const locationMatch = input.match(/\b(?:at|in)\s+([a-zA-Z0-9' -]{2,40})(?:$|\s(?:tomorrow|today|next|every|at\s))/i);
  if (!locationMatch) return null;
  return locationMatch[1]?.trim() ?? null;
}

function extractParticipants(input: string): string[] {
  const withMatch = input.match(/with\s+([a-zA-Z0-9 ,'-]+?)(?=\s+(?:today|tomorrow|next|every|at\b|in\b|on\b)|$)/i);
  if (!withMatch?.[1]) return [];
  return withMatch[1]
    .split(/,| and /i)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function cleanTitle(input: string): string {
  let title = input
    .replace(/\b(today|tomorrow|next\s+week|next\s+(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday))\b/gi, '')
    .replace(/\b(every\s+(?:day|weekday|weekdays|weekend|weekends|week|month|sunday|monday|tuesday|wednesday|thursday|friday|saturday)|daily|weekly|monthly)\b/gi, '')
    .replace(/\b(?:at|from)\s+\d{1,2}(?::\d{2})?\s?(?:am|pm)?(?:\s*(?:to|-)\s*\d{1,2}(?::\d{2})?\s?(?:am|pm)?)?/gi, '')
    .replace(/\b(?:at|in)\s+[a-zA-Z0-9' -]{2,40}\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!title) {
    title = 'Untitled event';
  }

  return title.charAt(0).toUpperCase() + title.slice(1);
}

function detectTags(input: string): string[] {
  const value = input.toLowerCase();
  const tags: string[] = [];

  if (/workout|run|gym|yoga|exercise/.test(value)) tags.push('fitness');
  if (/meeting|review|office|client/.test(value)) tags.push('work');
  if (/sleep|nap|bed/.test(value)) tags.push('sleep');
  if (/family|mom|dad|friend|rahul/.test(value)) tags.push('social');
  if (/doctor|therapy|checkup/.test(value)) tags.push('health');

  return tags;
}

export function parseNaturalLanguageEvent(input: string, baseDate: Date = new Date()): SmartEventDraft {
  const text = input.trim();
  const recurrence = parseRecurrence(text);
  const { start, end, hasExplicitTime } = parseTimeRange(text);
  const { date, hasExplicitDate } = parseDate(text, baseDate);
  const location = extractLocation(text);
  const participants = extractParticipants(text);
  const tags = detectTags(text);

  const title = cleanTitle(text);

  let confidence = 0.4;
  if (title !== 'Untitled event') confidence += 0.1;
  if (hasExplicitTime) confidence += 0.2;
  if (hasExplicitDate) confidence += 0.2;
  if (participants.length > 0) confidence += 0.05;
  if (location) confidence += 0.05;

  const needsReview = !hasExplicitDate || !hasExplicitTime || confidence < 0.82;

  return {
    title,
    date,
    startTime: start,
    endTime: end ?? '10:00',
    location,
    participants,
    tags,
    recurrence,
    rawText: text,
    confidence: Math.min(confidence, 0.98),
    needsReview,
    editableFields: [
      'title',
      'date',
      'startTime',
      'endTime',
      'location',
      'participants',
      'recurrence',
    ],
  };
}
