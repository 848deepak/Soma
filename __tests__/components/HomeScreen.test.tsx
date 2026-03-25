/**
 * __tests__/components/HomeScreen.test.tsx
 * Tests for the optimized HomeScreen component.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import { AuthProvider } from "@/src/context/AuthProvider";
import { HomeScreen } from "@/src/screens/HomeScreen";

// Mock navigation
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock hooks
jest.mock("@/hooks/useProfile", () => ({
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

jest.mock("@/hooks/useDailyLogs", () => ({
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

jest.mock("@/hooks/useCurrentCycle", () => ({
  useCurrentCycle: () => ({
    data: {
      cycleDay: 14,
      phaseLabel: "Ovulation Phase",
      phase: "ovulation",
      progress: 0.5,
      cycle: {
        id: "test-cycle",
        start_date: "2024-01-01",
      },
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  buildMiniCalendar: () => [
    { day: "Mon", date: 15, isCurrent: true, hasPeriod: false },
    { day: "Tue", date: 16, isCurrent: false, hasPeriod: false },
  ],
}));

jest.mock("@/hooks/useRealtimeSync", () => ({
  useRealtimeSync: jest.fn(),
}));

jest.mock("@/src/store/useCycleStore", () => ({
  useCycleStore: (selector: any) => {
    const mockStore = {
      hydrate: jest.fn(),
    };
    return typeof selector === "function" ? selector(mockStore) : mockStore;
  },
}));

// Test wrapper
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

describe("HomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders greeting with user name", async () => {
    render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Good Morning,\s*Jane/)).toBeTruthy();
    });
  });

  it("displays cycle day and phase", async () => {
    render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("14")).toBeTruthy();
      expect(screen.getByText("Ovulation Phase")).toBeTruthy();
    });
  });

  it("does not render disabled hydration widget", async () => {
    render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.queryByText("6/8")).toBeNull();
      expect(screen.queryByText("Glasses today")).toBeNull();
    });
  });

  it("does not render disabled sleep widget", async () => {
    render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.queryByText("7h 30m")).toBeNull();
      expect(screen.queryByText("Last night")).toBeNull();
    });
  });

  it("displays mood and energy levels", async () => {
    render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("Good")).toBeTruthy();
      expect(screen.getByText("High Energy")).toBeTruthy();
    });
  });

  it("renders action buttons", async () => {
    render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("Log Period")).toBeTruthy();
      expect(screen.getByText("Log Today's Flow & Mood")).toBeTruthy();
    });
  });

  it("renders dashboard content with current data", async () => {
    render(
      <TestWrapper>
        <HomeScreen />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("Log Period")).toBeTruthy();
      expect(screen.getByText("Current mood")).toBeTruthy();
      expect(screen.getByText("Readiness")).toBeTruthy();
    });
  });
});
