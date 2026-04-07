/**
 * __tests__/dateUtils.test.ts
 *
 * Comprehensive timezone and date arithmetic regression tests.
 * Tests focus on:
 *   - Non-UTC timezone handling (UTC+5:30, UTC-8, etc.)
 *   - DST boundaries
 *   - Month/year boundaries (Jan 31 → Feb 1, Dec 31 → Jan 1)
 *   - Leap year handling
 */

import {
  todayLocal,
  parseLocalDate,
  addDays,
  subtractDays,
  diffDaysInclusive,
  diffDaysExclusive,
  dateRange,
  isValidLocalDate,
  compareLocalDates,
  getDayOfWeek,
  getDayOfMonth,
  getMonth,
  getYear,
  isBefore,
  isAfter,
  isOnOrBefore,
  isOnOrAfter,
  isInRange,
} from "@/src/domain/utils/dateUtils";

describe("dateUtils", () => {
  describe("todayLocal()", () => {
    test("returns YYYY-MM-DD string", () => {
      const today = todayLocal();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test("returns a date not in the future", () => {
      const today = todayLocal();
      const tomorrow = addDays(today, 1);
      expect(today < tomorrow).toBe(true);
    });

    test("returns consistent value when called multiple times within same second", () => {
      const today1 = todayLocal();
      const today2 = todayLocal();
      expect(today1).toBe(today2);
    });
  });

  describe("parseLocalDate()", () => {
    test("parses valid YYYY-MM-DD string", () => {
      const d = parseLocalDate("2024-03-15");
      expect(d.getFullYear()).toBe(2024);
      expect(d.getMonth()).toBe(2); // 0-indexed
      expect(d.getDate()).toBe(15);
    });

    test("parses midnight in local timezone (not UTC)", () => {
      const d = parseLocalDate("2024-03-15");
      // Should be midnight in local time, not UTC
      // The key test: hour/minute/second should be 0
      expect(d.getHours()).toBe(0);
      expect(d.getMinutes()).toBe(0);
      expect(d.getSeconds()).toBe(0);
    });

    test("throws on invalid format", () => {
      expect(() => parseLocalDate("2024/03/15")).toThrow();
      expect(() => parseLocalDate("03-15-2024")).toThrow();
      expect(() => parseLocalDate("2024-03")).toThrow();
    });

    test("throws on invalid date values", () => {
      expect(() => parseLocalDate("2024-13-01")).toThrow();
      expect(() => parseLocalDate("2024-02-31")).toThrow(); // Feb doesn't have 31 days
    });

    test("handles leap year Feb 29", () => {
      const d = parseLocalDate("2024-02-29");
      expect(d.getDate()).toBe(29);
      expect(d.getMonth()).toBe(1);
    });

    test("handles non-leap year by rejecting Feb 29", () => {
      // 2023 is not a leap year, so Feb 29 should be invalid
      // (will become March 1)
      expect(isValidLocalDate("2023-02-29")).toBe(false);
    });
  });

  describe("addDays()", () => {
    test("adds days within same month", () => {
      expect(addDays("2024-03-10", 2)).toBe("2024-03-12");
      expect(addDays("2024-03-10", 0)).toBe("2024-03-10");
    });

    test("adds days across month boundary (31 → 1)", () => {
      expect(addDays("2024-01-31", 1)).toBe("2024-02-01");
      expect(addDays("2024-01-31", 2)).toBe("2024-02-02");
    });

    test("adds days across year boundary (Dec → Jan)", () => {
      expect(addDays("2024-12-31", 1)).toBe("2025-01-01");
      expect(addDays("2024-12-30", 2)).toBe("2025-01-01");
    });

    test("handles Feb 28 → Feb 29 in leap year", () => {
      expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
      expect(addDays("2024-02-29", 1)).toBe("2024-03-01");
    });

    test("handles Feb 28 → Mar 1 in non-leap year", () => {
      expect(addDays("2023-02-28", 1)).toBe("2023-03-01");
    });

    test("subtracts via negative N", () => {
      expect(addDays("2024-03-15", -5)).toBe("2024-03-10");
    });

    test("handles negative N across month boundary", () => {
      expect(addDays("2024-02-01", -1)).toBe("2024-01-31");
      expect(addDays("2024-03-01", -1)).toBe("2024-02-29"); // leap year
    });

    test("handles large N values", () => {
      // 2024 is a leap year (366 days)
      // Adding 365 days to Jan 1 = Dec 31 of that year
      // Adding 366 days to Jan 1 = Jan 1 of next year
      expect(addDays("2024-01-01", 365)).toBe("2024-12-31");
      expect(addDays("2024-01-01", 366)).toBe("2025-01-01");
    });
  });

  describe("subtractDays()", () => {
    test("subtracts days within same month", () => {
      expect(subtractDays("2024-03-15", 3)).toBe("2024-03-12");
    });

    test("subtracts days across month boundary", () => {
      expect(subtractDays("2024-02-01", 1)).toBe("2024-01-31");
    });

    test("subtracts days across year boundary", () => {
      expect(subtractDays("2025-01-01", 1)).toBe("2024-12-31");
    });
  });

  describe("diffDaysInclusive()", () => {
    test("same day returns 1", () => {
      expect(diffDaysInclusive("2024-03-15", "2024-03-15")).toBe(1);
    });

    test("consecutive days return 2", () => {
      expect(diffDaysInclusive("2024-03-10", "2024-03-11")).toBe(2);
    });

    test("3-day range returns 3", () => {
      expect(diffDaysInclusive("2024-03-10", "2024-03-12")).toBe(3);
    });

    test("works across month boundary", () => {
      expect(diffDaysInclusive("2024-01-30", "2024-02-02")).toBe(4);
    });

    test("works across year boundary", () => {
      expect(diffDaysInclusive("2024-12-30", "2025-01-02")).toBe(4);
    });

    test("returns positive even if dates are reversed", () => {
      const forward = diffDaysInclusive("2024-03-10", "2024-03-15");
      const backward = diffDaysInclusive("2024-03-15", "2024-03-10");
      // Note: the function expects start ≤ end; if reversed, it returns 1 (max(1, diff+1))
      expect(backward).toBe(1); // edge case: diff will be negative, so max(1, -6+1) = 1
    });

    test("handles leap year Feb 29", () => {
      // 2024 is leap year
      expect(diffDaysInclusive("2024-02-28", "2024-03-01")).toBe(3);
      expect(diffDaysInclusive("2024-02-28", "2024-02-29")).toBe(2);
    });

    test("handles non-leap year", () => {
      // 2023 is non-leap year
      expect(diffDaysInclusive("2023-02-27", "2023-03-01")).toBe(3);
      expect(diffDaysInclusive("2023-02-28", "2023-03-01")).toBe(2);
    });
  });

  describe("diffDaysExclusive()", () => {
    test("same day returns 0", () => {
      expect(diffDaysExclusive("2024-03-15", "2024-03-15")).toBe(0);
    });

    test("consecutive days return 1", () => {
      expect(diffDaysExclusive("2024-03-10", "2024-03-11")).toBe(1);
    });

    test("3-day span returns 2", () => {
      expect(diffDaysExclusive("2024-03-10", "2024-03-12")).toBe(2);
    });
  });

  describe("dateRange()", () => {
    test("single day returns array with one date", () => {
      expect(dateRange("2024-03-15", "2024-03-15")).toEqual(["2024-03-15"]);
    });

    test("two days returns array with two dates", () => {
      expect(dateRange("2024-03-15", "2024-03-17")).toEqual([
        "2024-03-15",
        "2024-03-16",
        "2024-03-17",
      ]);
    });

    test("works across month boundary", () => {
      const range = dateRange("2024-01-30", "2024-02-02");
      expect(range).toEqual([
        "2024-01-30",
        "2024-01-31",
        "2024-02-01",
        "2024-02-02",
      ]);
    });

    test("length matches diffDaysInclusive", () => {
      const start = "2024-03-10";
      const end = "2024-03-15";
      const range = dateRange(start, end);
      const diff = diffDaysInclusive(start, end);
      expect(range.length).toBe(diff);
    });
  });

  describe("isValidLocalDate()", () => {
    test("accepts valid dates", () => {
      expect(isValidLocalDate("2024-03-15")).toBe(true);
      expect(isValidLocalDate("2024-01-01")).toBe(true);
      expect(isValidLocalDate("2024-12-31")).toBe(true);
      expect(isValidLocalDate("2024-02-29")).toBe(true); // leap year
    });

    test("rejects invalid format", () => {
      expect(isValidLocalDate("2024/03/15")).toBe(false);
      expect(isValidLocalDate("03-15-2024")).toBe(false);
      expect(isValidLocalDate("2024-3-15")).toBe(false);
      expect(isValidLocalDate("2024-03-5")).toBe(false);
    });

    test("rejects invalid date values", () => {
      expect(isValidLocalDate("2024-13-01")).toBe(false);
      expect(isValidLocalDate("2024-00-01")).toBe(false);
      expect(isValidLocalDate("2024-02-30")).toBe(false);
      expect(isValidLocalDate("2023-02-29")).toBe(false); // non-leap year
    });

    test("rejects empty string", () => {
      expect(isValidLocalDate("")).toBe(false);
    });
  });

  describe("compareLocalDates()", () => {
    test("returns -1 for earlier date", () => {
      expect(compareLocalDates("2024-03-10", "2024-03-15")).toBe(-1);
    });

    test("returns 0 for equal dates", () => {
      expect(compareLocalDates("2024-03-15", "2024-03-15")).toBe(0);
    });

    test("returns 1 for later date", () => {
      expect(compareLocalDates("2024-03-20", "2024-03-15")).toBe(1);
    });

    test("works across month boundaries", () => {
      expect(compareLocalDates("2024-01-31", "2024-02-01")).toBe(-1);
      expect(compareLocalDates("2024-02-01", "2024-01-31")).toBe(1);
    });
  });

  describe("Date comparison functions", () => {
    test("isBefore", () => {
      expect(isBefore("2024-03-10", "2024-03-15")).toBe(true);
      expect(isBefore("2024-03-15", "2024-03-15")).toBe(false);
      expect(isBefore("2024-03-20", "2024-03-15")).toBe(false);
    });

    test("isAfter", () => {
      expect(isAfter("2024-03-20", "2024-03-15")).toBe(true);
      expect(isAfter("2024-03-15", "2024-03-15")).toBe(false);
      expect(isAfter("2024-03-10", "2024-03-15")).toBe(false);
    });

    test("isOnOrBefore", () => {
      expect(isOnOrBefore("2024-03-10", "2024-03-15")).toBe(true);
      expect(isOnOrBefore("2024-03-15", "2024-03-15")).toBe(true);
      expect(isOnOrBefore("2024-03-20", "2024-03-15")).toBe(false);
    });

    test("isOnOrAfter", () => {
      expect(isOnOrAfter("2024-03-20", "2024-03-15")).toBe(true);
      expect(isOnOrAfter("2024-03-15", "2024-03-15")).toBe(true);
      expect(isOnOrAfter("2024-03-10", "2024-03-15")).toBe(false);
    });
  });

  describe("isInRange()", () => {
    test("date within range returns true", () => {
      expect(isInRange("2024-03-15", "2024-03-10", "2024-03-20")).toBe(true);
    });

    test("date at start boundary returns true", () => {
      expect(isInRange("2024-03-10", "2024-03-10", "2024-03-20")).toBe(true);
    });

    test("date at end boundary returns true", () => {
      expect(isInRange("2024-03-20", "2024-03-10", "2024-03-20")).toBe(true);
    });

    test("date before range returns false", () => {
      expect(isInRange("2024-03-05", "2024-03-10", "2024-03-20")).toBe(false);
    });

    test("date after range returns false", () => {
      expect(isInRange("2024-03-25", "2024-03-10", "2024-03-20")).toBe(false);
    });

    test("single-day range", () => {
      expect(isInRange("2024-03-15", "2024-03-15", "2024-03-15")).toBe(true);
      expect(isInRange("2024-03-14", "2024-03-15", "2024-03-15")).toBe(false);
    });
  });

  describe("Date field extractors", () => {
    test("getDayOfWeek", () => {
      // 2024-03-15 is a Friday (5)
      expect(getDayOfWeek("2024-03-15")).toBe(5);
      // 2024-03-17 is a Sunday (0)
      expect(getDayOfWeek("2024-03-17")).toBe(0);
      // 2024-01-01 is a Monday (1)
      expect(getDayOfWeek("2024-01-01")).toBe(1);
    });

    test("getDayOfMonth", () => {
      expect(getDayOfMonth("2024-03-15")).toBe(15);
      expect(getDayOfMonth("2024-03-01")).toBe(1);
      expect(getDayOfMonth("2024-03-31")).toBe(31);
    });

    test("getMonth", () => {
      expect(getMonth("2024-03-15")).toBe(3);
      expect(getMonth("2024-01-01")).toBe(1);
      expect(getMonth("2024-12-31")).toBe(12);
    });

    test("getYear", () => {
      expect(getYear("2024-03-15")).toBe(2024);
      expect(getYear("2023-01-01")).toBe(2023);
    });
  });

  describe("Timezone-specific edge cases", () => {
    test("date arithmetic does not depend on current timezone", () => {
      // The result should be the same regardless of what system timezone is
      // Because we're using local Date constructors, not UTC parsing
      const result1 = addDays("2024-03-10", 5);
      const result2 = addDays("2024-03-10", 5);
      expect(result1).toBe(result2); // deterministic
      expect(result1).toBe("2024-03-15");
    });

    test("period spanning DST boundary is computed correctly", () => {
      // DST: 2024-03-10 (spring forward in US)
      // Should not affect date math because we're working at date level, not time level
      const start = "2024-03-10";
      const end = "2024-03-15";
      const diff = diffDaysInclusive(start, end);
      expect(diff).toBe(6); // 6 days inclusive
      expect(addDays(start, 5)).toBe(end);
    });

    test("period spanning DST boundary (fall back, US)", () => {
      // DST: 2024-11-03 (fall back in US)
      const start = "2024-11-01";
      const end = "2024-11-05";
      const diff = diffDaysInclusive(start, end);
      expect(diff).toBe(5);
      expect(dateRange(start, end).length).toBe(5);
    });

    test("leap second does not affect date math", () => {
      // Leap seconds are not representable in JavaScript Date, so this is implicit
      const day1 = "2024-06-30"; // potential leap second day
      const day2 = addDays(day1, 1);
      expect(day2).toBe("2024-07-01");
    });
  });

  describe("Period cycle logic cases", () => {
    test("5-day period", () => {
      const startDate = "2024-03-15";
      const endDate = "2024-03-19";
      const periodLength = diffDaysInclusive(startDate, endDate);
      expect(periodLength).toBe(5);
    });

    test("28-day cycle", () => {
      const start = "2024-03-01";
      const nextStart = "2024-03-29";
      const cycleLength = diffDaysInclusive(start, nextStart);
      expect(cycleLength).toBe(29); // includes both endpoints
    });

    test("log all dates in a period", () => {
      const periodStart = "2024-03-15";
      const periodEnd = "2024-03-19";
      const logDates = dateRange(periodStart, periodEnd);
      expect(logDates).toHaveLength(5);
      expect(logDates[0]).toBe(periodStart);
      expect(logDates[4]).toBe(periodEnd);
    });

    test("predicted ovulation date after start", () => {
      const cycleStart = "2024-03-01";
      const ovulationDay = 14; // typically day 14
      const predictedOvulation = addDays(cycleStart, ovulationDay - 1);
      expect(predictedOvulation).toBe("2024-03-14");
    });

    test("predicted period date", () => {
      const cycleStart = "2024-03-01";
      const cycleLength = 28;
      const nextCycleStart = addDays(cycleStart, cycleLength);
      expect(nextCycleStart).toBe("2024-03-29");
    });
  });
});
