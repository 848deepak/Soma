import type { CycleStatus } from "@/hooks/useCycleCalendar";
import { cycleCalendarMotion, cycleCalendarTheme } from "@/src/theme/tokens";

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export type StatusPaint = {
  fill: string;
  borderColor: string;
  borderWidth: number;
  opacity: number;
};

export type MonthSwipeDirection = "next" | "prev";
export type MonthTransitionDirection = 1 | -1;
export type CalendarMonthState = {
  month: number;
  year: number;
};

export function dayIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseIso(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function formatMonthYear(month: number, year: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}

export function getStatusPaint(
  status: CycleStatus,
  isDark: boolean,
): StatusPaint {
  const theme = isDark ? cycleCalendarTheme.dark : cycleCalendarTheme.light;

  if (!status) {
    return {
      fill: "transparent",
      borderColor: "transparent",
      borderWidth: 0,
      opacity: 1,
    };
  }

  if (status === "period") {
    return {
      fill: theme.periodFill,
      borderColor: "transparent",
      borderWidth: 0,
      opacity: 1,
    };
  }

  if (status === "predicted_period") {
    return {
      fill: theme.predictedPeriodFill,
      borderColor: theme.predictedPeriodBorder,
      borderWidth: 1,
      opacity: 0.55,
    };
  }

  if (status === "ovulation") {
    return {
      fill: theme.ovulationFill,
      borderColor: theme.ovulationBorder,
      borderWidth: 2,
      opacity: 1,
    };
  }

  if (status === "predicted_fertile") {
    return {
      fill: theme.predictedFertileFill,
      borderColor: "transparent",
      borderWidth: 0,
      opacity: 0.55,
    };
  }

  return {
    fill: theme.fertileFill,
    borderColor: "transparent",
    borderWidth: 0,
    opacity: 1,
  };
}

export function buildMiniMonthDots(
  year: number,
  month: number,
  cycleDataMap: Record<string, CycleStatus>,
): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let daysWithStatus = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    if (cycleDataMap[dayIso(year, month, day)]) {
      daysWithStatus += 1;
    }
  }

  return daysWithStatus;
}

export function shouldCaptureMonthPan(dx: number): boolean {
  return Math.abs(dx) > cycleCalendarMotion.swipeActivationDx;
}

export function resolveMonthSwipeDirection(
  dx: number,
  vx: number,
): MonthSwipeDirection | null {
  const crossedDistance =
    Math.abs(dx) >= cycleCalendarMotion.swipeDistanceThreshold;
  const crossedVelocity =
    Math.abs(vx) >= cycleCalendarMotion.swipeVelocityThreshold;

  if (!crossedDistance && !crossedVelocity) {
    return null;
  }

  const swipeScore = dx + vx * cycleCalendarMotion.swipeVelocityWeight;
  return swipeScore < 0 ? "next" : "prev";
}

export function resolveMonthSelectionDirection(
  currentMonth: number,
  targetMonth: number,
): MonthTransitionDirection {
  return targetMonth >= currentMonth ? 1 : -1;
}

export function getPreviousMonthState(
  currentMonth: number,
  currentYear: number,
): CalendarMonthState {
  if (currentMonth === 0) {
    return { month: 11, year: currentYear - 1 };
  }

  return { month: currentMonth - 1, year: currentYear };
}

export function getNextMonthState(
  currentMonth: number,
  currentYear: number,
): CalendarMonthState {
  if (currentMonth === 11) {
    return { month: 0, year: currentYear + 1 };
  }

  return { month: currentMonth + 1, year: currentYear };
}

export function resolveTransitionDirectionFromNavigation(
  direction: MonthSwipeDirection,
): MonthTransitionDirection {
  return direction === "next" ? 1 : -1;
}

export function getAdjacentMonthState(
  currentMonth: number,
  currentYear: number,
  direction: MonthSwipeDirection,
): CalendarMonthState {
  return direction === "next"
    ? getNextMonthState(currentMonth, currentYear)
    : getPreviousMonthState(currentMonth, currentYear);
}
