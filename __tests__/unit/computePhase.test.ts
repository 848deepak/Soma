import { computeCycleDay, computePhase } from "@/src/domain/cycle/hooks/useCurrentCycle";

function toLocalIso(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function shiftDays(date: Date, offset: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

describe("computePhase", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 8, 12, 0, 0));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it("returns menstrual on day 1 with default cycle settings", () => {
    expect(computePhase(1, 28, 5)).toBe("menstrual");
  });

  it("returns menstrual on day 5 with default cycle settings", () => {
    expect(computePhase(5, 28, 5)).toBe("menstrual");
  });

  it("returns follicular on day 6 with default cycle settings", () => {
    expect(computePhase(6, 28, 5)).toBe("follicular");
  });

  it("returns ovulation on day 14 with default cycle settings", () => {
    expect(computePhase(14, 28, 5)).toBe("ovulation");
  });

  it("returns ovulation on day 15 with default cycle settings", () => {
    expect(computePhase(15, 28, 5)).toBe("ovulation");
  });

  it("returns luteal on day 28 with default cycle settings", () => {
    expect(computePhase(28, 28, 5)).toBe("luteal");
  });

  it("uses the actual ovulation math for an irregular 24-day cycle", () => {
    expect(computePhase(10, 24, 5)).toBe("ovulation");
    expect(computePhase(11, 24, 5)).toBe("ovulation");
  });

  it("defaults to menstrual when only the cycle day is provided", () => {
    expect(computePhase(1)).toBe("menstrual");
  });

  it("still returns a phase when the cycle day exceeds cycle length", () => {
    expect(() => computePhase(35, 28, 5)).not.toThrow();
    expect(computePhase(35, 28, 5)).toBe("luteal");
  });
});

describe("computeCycleDay", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 8, 12, 0, 0));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it("returns 1 when the start date is today", () => {
    const today = toLocalIso(new Date());
    expect(computeCycleDay(today)).toBe(1);
  });

  it("returns 2 when the start date was yesterday", () => {
    const yesterday = toLocalIso(shiftDays(new Date(), -1));
    expect(computeCycleDay(yesterday)).toBe(2);
  });

  it("returns 28 when the start date was 27 days ago", () => {
    const startDate = toLocalIso(shiftDays(new Date(), -27));
    expect(computeCycleDay(startDate)).toBe(28);
  });

  it("clamps future start dates to cycle day 1", () => {
    const futureStart = toLocalIso(shiftDays(new Date(), 1));
    expect(computeCycleDay(futureStart)).toBe(1);
  });
});