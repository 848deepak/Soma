/**
 * src/services/cycleValidation.ts
 * Safety validation and recovery utilities for cycle data
 */

type ValidatableCycle = {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string | null;
  cycle_length: number | null;
};

/**
 * Validates a cycle object for required fields and data integrity
 */
export function validateCycle(cycle: ValidatableCycle): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!cycle) {
    errors.push("Cycle object is null or undefined");
    return { valid: false, errors };
  }

  if (!cycle.id) {
    errors.push("Cycle ID is missing");
  }

  if (!cycle.user_id) {
    errors.push("User ID is missing");
  }

  if (!cycle.start_date) {
    errors.push("Start date is missing");
  } else if (!isValidIsoDate(cycle.start_date)) {
    errors.push(
      `Invalid start date format: "${cycle.start_date}". Expected YYYY-MM-DD.`,
    );
  }

  // Optional validation: end_date format if present
  if (cycle.end_date && !isValidIsoDate(cycle.end_date)) {
    errors.push(
      `Invalid end date format: "${cycle.end_date}". Expected YYYY-MM-DD.`,
    );
  }

  // Logical validation: end_date must be after start_date if present
  if (
    cycle.end_date &&
    cycle.start_date &&
    cycle.end_date < cycle.start_date
  ) {
    errors.push(
      `End date (${cycle.end_date}) cannot be before start date (${cycle.start_date})`,
    );
  }

  // Validation: if end_date is set, cycle_length should be set
  if (cycle.end_date && !cycle.cycle_length) {
    errors.push(
      "Completed cycle is missing cycle_length. This will be auto-calculated.",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates ISO date format (YYYY-MM-DD)
 */
export function isValidIsoDate(dateString: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }

  const [year, month, day] = dateString.split("-").map(Number);

  // Basic validation
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // More thorough validation
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Calculates cycle length safely
 */
export function calculateCycleLength(
  startDate: string,
  endDate: string,
): number | null {
  if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) {
    return null;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - start.getTime();
  if (diffTime < 0) {
    return null;
  }

  const inclusiveDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // Min 1 day, max 90 days (realistic cycle)
  if (inclusiveDays < 1 || inclusiveDays > 90) {
    return null;
  }

  return inclusiveDays;
}

/**
 * Safety check for period ending constraints
 */
export function canEndPeriod(
  activeCycle: { id: string; start_date: string } | null,
  endDate?: string,
): { canEnd: boolean; reason?: string } {
  if (!activeCycle) {
    return {
      canEnd: false,
      reason: "No active period found",
    };
  }

  if (!isValidIsoDate(activeCycle.start_date)) {
    return {
      canEnd: false,
      reason:
        "Active period has invalid start date. Data may be corrupted.",
    };
  }

  const resolvedEndDate = endDate ?? todayIso();

  if (!isValidIsoDate(resolvedEndDate)) {
    return {
      canEnd: false,
      reason: `Invalid end date format: ${resolvedEndDate}`,
    };
  }

  if (resolvedEndDate < activeCycle.start_date) {
    return {
      canEnd: false,
      reason: `End date cannot be before start date (${activeCycle.start_date})`,
    };
  }

  // Sanity check: cycle length should be reasonable (1-90 days)
  const cycleLength = calculateCycleLength(activeCycle.start_date, resolvedEndDate);
  if (cycleLength === null || cycleLength > 90) {
    return {
      canEnd: false,
      reason: "Cycle length is unrealistic. Please check the dates.",
    };
  }

  return { canEnd: true };
}

/**
 * Get current date in ISO format (YYYY-MM-DD)
 */
export function todayIso(): string {
  const date = new Date();
  return date.toISOString().split("T")[0]!;
}

/**
 * Human-readable error message for cycle operations
 */
export function getUserFriendlyErrorMessage(error: Error | string): string {
  const message = typeof error === "string" ? error : error.message;

  if (message.includes("No active period")) {
    return "No active period to end. Please start a new period first.";
  }

  if (
    message.includes("Invalid") ||
    message.includes("format") ||
    message.includes("corrupted")
  ) {
    return (
      "There's an issue with your period data. " +
      "Please contact support if the problem persists."
    );
  }

  if (
    message.includes("network") ||
    message.includes("offline") ||
    message.includes("Failed")
  ) {
    return (
      "Connection issue. Your changes will sync when you're back online."
    );
  }

  if (message.includes("before start")) {
    return "End date must be on or after the period start date.";
  }

  if (message.includes("unrealistic") || message.includes("Cycle length")) {
    return "The period dates seem too far apart. Please check and try again.";
  }

  return message || "Something went wrong. Please try again.";
}
