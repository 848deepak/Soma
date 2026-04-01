function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function toLocalDateIso(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function toLocalDateTimeIso(date: Date, time24: string): string {
  return `${toLocalDateIso(date)}T${time24}:00`;
}

export function addDays(base: Date, days: number): Date {
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

export function getNextWeekday(base: Date, targetWeekday: number): Date {
  const day = base.getDay();
  const delta = (targetWeekday + 7 - day) % 7;
  return addDays(base, delta === 0 ? 7 : delta);
}

export function startOfWeek(base: Date): Date {
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const weekday = date.getDay();
  date.setDate(date.getDate() - weekday);
  return date;
}

export function endOfWeek(base: Date): Date {
  const start = startOfWeek(base);
  return addDays(start, 6);
}

export function toDisplayTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${pad2(minutes)} ${suffix}`;
}

export function startOfDay(base: Date): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0);
}

export function endOfDay(base: Date): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59, 999);
}
