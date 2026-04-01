import {
    getAdjacentMonthState,
    getNextMonthState,
    getPreviousMonthState,
    resolveMonthSelectionDirection,
    resolveMonthSwipeDirection,
    resolveTransitionDirectionFromNavigation,
    shouldCaptureMonthPan,
} from "@/src/components/calendar/calendarUtils";

describe("calendar swipe helpers", () => {
  it("captures pan only when horizontal movement exceeds activation threshold", () => {
    expect(shouldCaptureMonthPan(8)).toBe(false);
    expect(shouldCaptureMonthPan(9)).toBe(true);
    expect(shouldCaptureMonthPan(-9)).toBe(true);
  });

  it("ignores short and slow swipes", () => {
    expect(resolveMonthSwipeDirection(12, 0.1)).toBeNull();
    expect(resolveMonthSwipeDirection(-12, 0.1)).toBeNull();
  });

  it("resolves to next month for left swipe based on distance", () => {
    expect(resolveMonthSwipeDirection(-30, 0)).toBe("next");
  });

  it("resolves to previous month for right swipe based on distance", () => {
    expect(resolveMonthSwipeDirection(30, 0)).toBe("prev");
  });

  it("uses velocity to resolve quick flicks", () => {
    expect(resolveMonthSwipeDirection(-10, -0.5)).toBe("next");
    expect(resolveMonthSwipeDirection(10, 0.5)).toBe("prev");
  });

  it("resolves month selection direction for mini month taps", () => {
    expect(resolveMonthSelectionDirection(3, 7)).toBe(1);
    expect(resolveMonthSelectionDirection(7, 3)).toBe(-1);
    expect(resolveMonthSelectionDirection(3, 3)).toBe(1);
  });

  it("returns previous month with year rollover", () => {
    expect(getPreviousMonthState(4, 2026)).toEqual({ month: 3, year: 2026 });
    expect(getPreviousMonthState(0, 2026)).toEqual({ month: 11, year: 2025 });
  });

  it("returns next month with year rollover", () => {
    expect(getNextMonthState(4, 2026)).toEqual({ month: 5, year: 2026 });
    expect(getNextMonthState(11, 2026)).toEqual({ month: 0, year: 2027 });
  });

  it("maps navigation direction to transition direction", () => {
    expect(resolveTransitionDirectionFromNavigation("next")).toBe(1);
    expect(resolveTransitionDirectionFromNavigation("prev")).toBe(-1);
  });

  it("returns adjacent month state for navigation direction", () => {
    expect(getAdjacentMonthState(11, 2026, "next")).toEqual({
      month: 0,
      year: 2027,
    });
    expect(getAdjacentMonthState(0, 2026, "prev")).toEqual({
      month: 11,
      year: 2025,
    });
  });
});
