/**
 * src/domain/utils/dateUtils.ts
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CRITICAL: All dates are YYYY-MM-DD strings anchored to user's LOCAL timezone.
 *
 * DO NOT:
 *   - new Date('YYYY-MM-DD')  [...parses as UTC midnight, then shifts]
 *   - .toISOString().slice(0,10)  [...UTC-based]
 *   - .getUTCDate()  [...UTC-based]
 *
 * DO:
 *   - new Date(year, month-1, day)  [...local midnight]
 *   - todayLocal()  [...current date in user's timezone]
 *   - parseLocalDate(dateStr)  [...safe parsing]
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Get today's date as YYYY-MM-DD in the user's LOCAL timezone.
 * This is the canonical "current date" for all cycle logic.
 */
export function todayLocal(): string {
  const d = new Date();
  return dateToLocalString(d);
}

/**
 * Convert a Date object to YYYY-MM-DD in local timezone.
 * Internal helper used by other functions.
 */
function dateToLocalString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string to a Date at local midnight.
 * CRITICAL: Do NOT use new Date('YYYY-MM-DD'), which parses as UTC and shifts.
 *
 * @example
 *   parseLocalDate('2024-03-15')  // 2024-03-15 at 00:00 LOCAL time
 */
export function parseLocalDate(dateStr: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD.`);
  }

  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error(`Invalid date values in: ${dateStr}`);
  }

  if (month < 1 || month > 12) {
    throw new Error(`Invalid month in: ${dateStr}. Month must be 1-12.`);
  }

  if (day < 1 || day > 31) {
    throw new Error(`Invalid day in: ${dateStr}. Day must be 1-31.`);
  }

  // Local constructor: new Date(year, month-1, day) → local midnight
  const d = new Date(year, month - 1, day);

  // Validate that the date was constructed correctly (catches Feb 30, April 31, etc.)
  if (d.getMonth() !== month - 1 || d.getDate() !== day) {
    throw new Error(`Invalid date: ${dateStr} is not a valid calendar date.`);
  }

  return d;
}

/**
 * Add N days to a YYYY-MM-DD string.
 * Handles month/year boundaries correctly via Date object arithmetic.
 *
 * @example
 *   addDays('2024-01-31', 1)  // '2024-02-01'
 *   addDays('2024-02-28', 1)  // '2024-02-29' (leap year)
 */
export function addDays(dateStr: string, daysToAdd: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + daysToAdd);
  return dateToLocalString(d);
}

/**
 * Subtract N days from a YYYY-MM-DD string.
 * Handles month/year boundaries correctly.
 *
 * @example
 *   subtractDays('2024-03-01', 1)  // '2024-02-29' (leap year)
 */
export function subtractDays(dateStr: string, daysToSubtract: number): string {
  return addDays(dateStr, -daysToSubtract);
}

/**
 * Difference in INCLUSIVE days between two YYYY-MM-DD strings.
 * Same date = 1 day (not 0).
 *
 * CRITICAL: Uses local date arithmetic, not millisecond arithmetic.
 * Avoids DST boundary issues by working purely with Date object fields.
 *
 * @example
 *   diffDaysInclusive('2024-03-10', '2024-03-10')  // 1 (same day)
 *   diffDaysInclusive('2024-03-10', '2024-03-12')  // 3
 */
export function diffDaysInclusive(startDateStr: string, endDateStr: string): number {
  const startDate = parseLocalDate(startDateStr);
  const endDate = parseLocalDate(endDateStr);

  // Both are at local midnight; difference in days is clean millisecond arithmetic
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // Inclusive: same day = 1, next day = 2, etc.
  return Math.max(1, diffDays + 1);
}

/**
 * Difference in EXCLUSIVE days between two YYYY-MM-DD strings.
 * Same date = 0 days.
 *
 * Useful when you need raw day count without "inclusive" semantics.
 *
 * @example
 *   diffDaysExclusive('2024-03-10', '2024-03-10')  // 0 (same day)
 *   diffDaysExclusive('2024-03-10', '2024-03-12')  // 2
 */
export function diffDaysExclusive(startDateStr: string, endDateStr: string): number {
  return Math.max(0, diffDaysInclusive(startDateStr, endDateStr) - 1);
}

/**
 * Get all inclusive dates between start and end (both included).
 * Returns array of YYYY-MM-DD strings.
 *
 * @example
 *   dateRange('2024-03-10', '2024-03-12')
 *   // ['2024-03-10', '2024-03-11', '2024-03-12']
 */
export function dateRange(
  startDateStr: string,
  endDateStr: string,
): string[] {
  const result: string[] = [];
  let current = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);

  while (current.getTime() <= end.getTime()) {
    result.push(dateToLocalString(current));
    current.setDate(current.getDate() + 1);
  }

  return result;
}

/**
 * Validate that a string is valid YYYY-MM-DD format and is a valid date.
 */
export function isValidLocalDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }

  try {
    const d = parseLocalDate(dateStr);
    // Ensure the parsed date is valid (e.g., not Feb 30)
    return dateToLocalString(d) === dateStr;
  } catch {
    return false;
  }
}

/**
 * Compare two YYYY-MM-DD dates.
 * Returns:
 *   -1 if date1 < date2
 *    0 if date1 === date2
 *   +1 if date1 > date2
 */
export function compareLocalDates(date1Str: string, date2Str: string): -1 | 0 | 1 {
  if (date1Str < date2Str) return -1;
  if (date1Str > date2Str) return 1;
  return 0;
}

/**
 * Get the day of week (0=Sunday, 1=Monday, ..., 6=Saturday) for a YYYY-MM-DD date.
 */
export function getDayOfWeek(dateStr: string): number {
  const d = parseLocalDate(dateStr);
  return d.getDay();
}

/**
 * Get the day of month (1-31) for a YYYY-MM-DD date.
 */
export function getDayOfMonth(dateStr: string): number {
  const d = parseLocalDate(dateStr);
  return d.getDate();
}

/**
 * Get the month (1-12) for a YYYY-MM-DD date.
 */
export function getMonth(dateStr: string): number {
  const d = parseLocalDate(dateStr);
  return d.getMonth() + 1;
}

/**
 * Get the year for a YYYY-MM-DD date.
 */
export function getYear(dateStr: string): number {
  const d = parseLocalDate(dateStr);
  return d.getFullYear();
}

/**
 * Check if a date is before another date.
 */
export function isBefore(date1Str: string, date2Str: string): boolean {
  return compareLocalDates(date1Str, date2Str) === -1;
}

/**
 * Check if a date is after another date.
 */
export function isAfter(date1Str: string, date2Str: string): boolean {
  return compareLocalDates(date1Str, date2Str) === 1;
}

/**
 * Check if a date is on or before another date.
 */
export function isOnOrBefore(date1Str: string, date2Str: string): boolean {
  return compareLocalDates(date1Str, date2Str) <= 0;
}

/**
 * Check if a date is on or after another date.
 */
export function isOnOrAfter(date1Str: string, date2Str: string): boolean {
  return compareLocalDates(date1Str, date2Str) >= 0;
}

/**
 * Check if a date falls within a range (inclusive).
 */
export function isInRange(
  dateStr: string,
  startStr: string,
  endStr: string,
): boolean {
  return isOnOrAfter(dateStr, startStr) && isOnOrBefore(dateStr, endStr);
}
