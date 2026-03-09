export type SymptomStat = {
  name: string;
  value: number;
  size?: number;
};

export type HomeWidget = {
  id: string;
  label: string;
  value: string;
  tone: 'sage' | 'mauve' | 'peach' | 'green';
};

export type CalendarDay = {
  day: string;
  date: number;
  isCurrent?: boolean;
  hasPeriod?: boolean;
};

export type DailyEntry = {
  id: string;
  title: string;
  subtitle: string;
  status: 'done' | 'pending';
};

export type MonthCalendarMeta = {
  monthLabel: string;
  year: number;
  currentDay: number;
  periodDays: number[];
  fertileWindow: number[];
  ovulationDay: number;
};

export const cycleUiMock = {
  greetingName: 'Alex',
  day: 14,
  phaseLabel: 'Ovulation Phase',
  progress: 0.5,
  insight: 'Your estrogen is peaking today. You might notice a natural glow and higher energy levels.',
  averageCycleLength: 29,
  cycleDeltaText: '2 days longer than last month\'s average',
  periodPrediction: 'Around April 2nd - April 6th',
};

export const symptomStats: SymptomStat[] = [
  { name: 'Cramps', value: 85, size: 24 },
  { name: 'Bloating', value: 70, size: 20 },
  { name: 'Tender', value: 65, size: 18 },
  { name: 'Mood Swings', value: 50, size: 16 },
  { name: 'Fatigue', value: 45, size: 15 },
  { name: 'Headache', value: 30, size: 14 },
];

export const cycleHistory = [28, 30, 29, 31, 29, 29];
export const cycleHistoryMonths = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

export const homeWidgets: HomeWidget[] = [
  { id: 'hydration', label: 'Glasses today', value: '6/8', tone: 'sage' },
  { id: 'sleep', label: 'Last night', value: '7h 12m', tone: 'mauve' },
  { id: 'mood', label: 'Current mood', value: 'Calm', tone: 'peach' },
  { id: 'energy', label: 'Energy level', value: 'High', tone: 'green' },
];

export const miniCalendar: CalendarDay[] = [
  { day: 'Mon', date: 12 },
  { day: 'Tue', date: 13 },
  { day: 'Wed', date: 14, isCurrent: true },
  { day: 'Thu', date: 15 },
  { day: 'Fri', date: 16, hasPeriod: true },
  { day: 'Sat', date: 17, hasPeriod: true },
  { day: 'Sun', date: 18, hasPeriod: true },
];

export const symptomOptions = ['Cramps', 'Tender', 'Radiant', 'Brain Fog', 'Bloating', 'Energized', 'Moody', 'Calm'];

export const monthCalendarMeta: MonthCalendarMeta = {
  monthLabel: 'March',
  year: 2026,
  currentDay: 6,
  periodDays: [16, 17, 18, 19, 20],
  fertileWindow: [10, 11, 12, 13, 14],
  ovulationDay: 12,
};

export const calendarWeekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function buildMonthGrid(daysInMonth: number, firstDayOfWeek: number): (number | null)[][] {
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = new Array(firstDayOfWeek).fill(null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }

  if (week.length > 0) {
    while (week.length < 7) {
      week.push(null);
    }
    weeks.push(week);
  }

  return weeks;
}

export const monthGrid = buildMonthGrid(31, 6);

export const dailyEntries: DailyEntry[] = [
  { id: '1', title: 'Flow & Mood', subtitle: 'Today, 8:20 AM', status: 'done' },
  { id: '2', title: 'Hydration Check', subtitle: 'Today, 1:10 PM', status: 'pending' },
  { id: '3', title: 'Evening Reflection', subtitle: 'Scheduled, 8:30 PM', status: 'pending' },
];
