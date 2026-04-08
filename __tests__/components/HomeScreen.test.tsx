/**
 * __tests__/components/HomeScreen.test.tsx
 * Tests for the optimized HomeScreen component.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react-native";
import React from "react";

import { renderWithProviders } from "../testUtils";
import { HomeScreen } from "@/src/screens/HomeScreen";

// Mock navigation
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

let mockCurrentCycleData: any = {
  cycleDay: 14,
  phaseLabel: "Ovulation Phase",
  phase: "ovulation",
  progress: 0.5,
  cycle: {
    id: "test-cycle",
    start_date: "2024-01-01",
  },
};

// Mock hooks
jest.mock("@/src/domain/auth", () => ({
  useProfile: () => ({
    data: {
      first_name: "Jane",
      cycle_length_average: 28,
      period_duration_average: 5,
    },
    isLoading: false,
    error: null,
  }),
}));

jest.mock("@/src/domain/calendar", () => ({
  useTodayLog: () => ({
    data: {
      hydration_glasses: 6,
      sleep_hours: 7.5,
      mood: "Good",
      energy_level: "High",
    },
    isLoading: false,
    error: null,
  }),
}));

jest.mock("@/src/domain/cycle", () => ({
  useCurrentCycle: () => ({
    data: mockCurrentCycleData,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  buildMiniCalendar: () => [
    { day: "Mon", date: 15, isCurrent: true, hasPeriod: false },
    { day: "Tue", date: 16, isCurrent: false, hasPeriod: false },
  ],
  useCycleHistory: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
}));

jest.mock("@/src/domain/logging", () => ({
  useRealtimeSync: jest.fn(),
}));

jest.mock("@/hooks/useCareCircle", () => ({
  useCareCircle: () => ({
    data: {
      asPrimary: [],
      asViewer: [],
    },
    isLoading: false,
    error: null,
  }),
}));

describe("HomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentCycleData = {
      cycleDay: 14,
      phaseLabel: "Ovulation Phase",
      phase: "ovulation",
      progress: 0.5,
      cycle: {
        id: "test-cycle",
        start_date: "2024-01-01",
      },
    };
  });

  it("renders greeting with user name", async () => {
    renderWithProviders(
      <HomeScreen />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Good (Morning|Afternoon|Evening|Night),\s*Jane/),
      ).toBeTruthy();
    });
  });

  it("displays cycle day and phase", async () => {
    renderWithProviders(
      <HomeScreen />
    );

    await waitFor(() => {
      expect(screen.getByText("14")).toBeTruthy();
      expect(screen.getByText("Ovulation Phase")).toBeTruthy();
    });
  });

  it("does not render disabled hydration widget", async () => {
    renderWithProviders(
      <HomeScreen />
    );

    await waitFor(() => {
      expect(screen.queryByText("6/8")).toBeNull();
      expect(screen.queryByText("Glasses today")).toBeNull();
    });
  });

  it("does not render disabled sleep widget", async () => {
    renderWithProviders(
      <HomeScreen />
    );

    await waitFor(() => {
      expect(screen.queryByText("7h 30m")).toBeNull();
      expect(screen.queryByText("Last night")).toBeNull();
    });
  });

  it("displays mood and energy levels", async () => {
    renderWithProviders(
      <HomeScreen />
    );

    await waitFor(() => {
      expect(screen.getByText("Good")).toBeTruthy();
      expect(screen.getByText("High Energy")).toBeTruthy();
    });
  });

  it("renders action buttons", async () => {
    renderWithProviders(
      <HomeScreen />
    );

    await waitFor(() => {
      expect(screen.getByText("Log Period")).toBeTruthy();
      expect(screen.getByText("Log Today's Flow & Mood")).toBeTruthy();
    });
  });

  it("renders dashboard content with current data", async () => {
    renderWithProviders(
      <HomeScreen />
    );

    await waitFor(() => {
      expect(screen.getByText("Log Period")).toBeTruthy();
      expect(screen.getByText("Current mood")).toBeTruthy();
      expect(screen.getByText("Readiness")).toBeTruthy();
    });
  });

  it("routes both log entry points to canonical log screen", async () => {
    renderWithProviders(
      <HomeScreen />
    );

    await waitFor(() => {
      expect(screen.getByTestId("home-log-primary-button")).toBeTruthy();
      expect(screen.getByTestId("home-log-fab")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("home-log-primary-button"));
    fireEvent.press(screen.getByTestId("home-log-fab"));

    expect(mockPush).toHaveBeenCalledWith("/log");
    expect(mockPush).toHaveBeenCalledTimes(2);
  });

  it("hides daily log CTA when there is no active period", async () => {
    mockCurrentCycleData = {
      cycleDay: 1,
      phaseLabel: "Cycle Phase",
      phase: null,
      progress: 0,
      cycle: null,
    };

    renderWithProviders(
      <HomeScreen />
    );

    await waitFor(() => {
      expect(screen.queryByTestId("home-log-primary-button")).toBeNull();
      expect(
        screen.getByText("Start a period to enable daily logging."),
      ).toBeTruthy();
      expect(screen.getByTestId("home-log-fab")).toBeTruthy();
    });
  });

  it("shows Care Circle entry card when not connected", async () => {
    renderWithProviders(
      <HomeScreen />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Build Your Care Circle/i) ||
          screen.queryByTestId("care-circle-card"),
      ).toBeTruthy();
    });
  });

  it("hides Care Circle entry card when already connected", async () => {
    jest.unmock("@/hooks/useCareCircle");
    jest.doMock("@/hooks/useCareCircle", () => ({
      useCareCircle: () => ({
        data: {
          asPrimary: [
            {
              id: "partner-1",
              user_id: "user-2",
            },
          ],
          asViewer: [],
        },
        isLoading: false,
        error: null,
      }),
    }));

    renderWithProviders(
      <HomeScreen />
    );

    await waitFor(() => {
      // Care Circle card should not appear when connected
      expect(screen.queryByTestId("care-circle-card")).toBeNull();
    });
  });

  it("navigates to care-circle route when Care Circle card is tapped", async () => {
    renderWithProviders(
      <HomeScreen />
    );

    await waitFor(() => {
      const careCircleButton =
        screen.getByTestId("care-circle-cta") ||
        screen.getByText(/Build Your Care Circle/i);
      if (careCircleButton) {
        fireEvent.press(careCircleButton);
        expect(mockPush).toHaveBeenCalledWith("/care-circle");
      }
    });
  });
});
