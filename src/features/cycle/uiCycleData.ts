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
  predictedPeriodDays: number[];
  fertileWindow: number[];
  ovulationDay: number;
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
