import { fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "../testUtils";
import {
    SmartCalendarScreen,
    type CycleDataMap,
} from "@/src/screens/SmartCalendarScreen";

jest.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({
    data: {
      cycle_length_average: 28,
      period_duration_average: 5,
    },
  }),
}));

jest.mock("@/hooks/useCurrentCycle", () => ({
  useCurrentCycle: () => ({
    data: {
      cycle: {
        start_date: "2026-03-18",
        predicted_next_cycle: "2026-04-14",
        predicted_ovulation: "2026-04-01",
      },
    },
  }),
}));

jest.mock("@/hooks/useCycleHistory", () => ({
  useCycleHistory: () => ({ data: [] }),
}));

jest.mock("@/hooks/useDailyLogs", () => ({
  useDailyLogs: () => ({ data: [] }),
}));

function renderScreen(cycleData?: CycleDataMap) {
  return renderWithProviders(
    <SmartCalendarScreen cycleData={cycleData} />
  );
}

describe("SmartCalendarScreen", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-01T10:00:00Z"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("renders cycle calendar heading and legend", () => {
    renderScreen();

    expect(screen.getByText("Period")).toBeTruthy();
    expect(screen.getByText("Fertile")).toBeTruthy();
    expect(screen.getByText("Ovulation")).toBeTruthy();
    expect(screen.getByText("Predicted")).toBeTruthy();
  });

  it("toggles to year overview and selects a mini month", () => {
    renderScreen();

    fireEvent.press(screen.getByText("April 2026"));
    fireEvent.press(screen.getAllByText("JAN")[0]!);

    expect(screen.getByText(/January\s+\d{4}/)).toBeTruthy();
  });

  it("renders provided cycle status and updates selected day detail", () => {
    renderScreen({
      "2026-04-01": "period",
      "2026-04-02": "predicted_period",
    });

    const dayButton = screen.getByLabelText("Day 1, period, today");
    fireEvent.press(dayButton);

    expect(screen.getByText("period day")).toBeTruthy();
  });
});
