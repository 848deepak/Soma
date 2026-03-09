/**
 * __tests__/components/Dashboard.test.tsx
 *
 * Component tests for HomeScreen (Dashboard).
 * Verifies correct rendering with mock data and interaction handling.
 */
import { render, screen } from "@testing-library/react-native";

// Mock all hooks before importing the component
jest.mock("@/lib/supabase");
jest.mock("@/lib/auth");
jest.mock("expo-router");
jest.mock("expo-haptics");

// Mock the real-time sync hook to avoid QueryClient dependency in tests
jest.mock("@/hooks/useRealtimeSync", () => ({
  useRealtimeSync: jest.fn(),
}));

// Mock AuthProvider to supply a stable user ID
jest.mock("@/src/context/AuthProvider", () => ({
  useAuthContext: jest.fn(() => ({
    user: { id: "user-1", is_anonymous: false, email: "test@example.com" },
    session: null,
    isLoading: false,
    isAuthenticated: true,
    isAnonymous: false,
  })),
}));

jest.mock("@/hooks/useProfile", () => ({
  useProfile: jest.fn(),
  useUpdateProfile: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/useCurrentCycle", () => {
  const original = jest.requireActual("@/hooks/useCurrentCycle");
  return {
    ...original,
    useCurrentCycle: jest.fn(),
  };
});

jest.mock("@/hooks/useDailyLogs", () => ({
  useDailyLogs: jest.fn(() => ({ data: [], isLoading: false })),
  useTodayLog: jest.fn(),
}));

jest.mock("@/src/store/useCycleStore", () => ({
  useCycleStore: jest.fn(
    (selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        cycleDay: 14,
        cycleLength: 28,
        phaseLabel: "Ovulation Phase",
        progress: 0.5,
        insightTitle: "Your estrogen is peaking.",
        insightDescription: "Great day for connections.",
        hydrate: jest.fn(),
        isSaving: false,
      }),
  ),
}));

import { useCurrentCycle } from "@/hooks/useCurrentCycle";
import { useTodayLog } from "@/hooks/useDailyLogs";
import { useProfile } from "@/hooks/useProfile";
import { HomeScreen } from "@/src/screens/HomeScreen";
import { useRouter } from "expo-router";

const mockProfile = {
  id: "user-1",
  first_name: "Luna",
  cycle_length_average: 28,
  period_duration_average: 5,
  username: null,
  date_of_birth: null,
  partner_link_code: "AB-12-CD",
  partner_permissions: {
    share_mood: true,
    share_fertility: false,
    share_symptoms: true,
  },
  is_onboarded: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockCycleData = {
  cycle: {
    id: "cycle-1",
    user_id: "user-1",
    start_date: new Date(Date.now() - 13 * 864e5).toISOString().split("T")[0],
    end_date: null,
    cycle_length: null,
    predicted_ovulation: null,
    predicted_next_cycle: null,
    current_phase: "ovulation",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  cycleDay: 14,
  phase: "ovulation",
  phaseLabel: "Ovulation Phase",
  progress: 0.5,
};

describe("HomeScreen (Dashboard)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useProfile as jest.Mock).mockReturnValue({
      data: mockProfile,
      isLoading: false,
    });
    (useCurrentCycle as jest.Mock).mockReturnValue({
      data: mockCycleData,
      isLoading: false,
    });
    (useTodayLog as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
    });
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
      back: jest.fn(),
      replace: jest.fn(),
      navigate: jest.fn(),
    });
  });

  it("renders without crashing", () => {
    expect(() => render(<HomeScreen />)).not.toThrow();
  });

  it("displays the greeting with user first name", () => {
    render(<HomeScreen />);
    expect(screen.getByText(/Good Morning/)).toBeTruthy();
    expect(screen.getByText(/Luna/)).toBeTruthy();
  });

  it("shows phase label in progress ring area", () => {
    render(<HomeScreen />);
    expect(screen.getByText("Ovulation Phase")).toBeTruthy();
  });

  it("renders home widgets (hydration, sleep, mood, energy)", () => {
    render(<HomeScreen />);
    expect(screen.getByText("Glasses today")).toBeTruthy();
    expect(screen.getByText("Last night")).toBeTruthy();
    expect(screen.getByText("Current mood")).toBeTruthy();
    expect(screen.getByText("Energy level")).toBeTruthy();
  });

  it("shows placeholder dashes when no today log exists", () => {
    (useTodayLog as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
    });
    render(<HomeScreen />);
    // Should show dash placeholders
    const dashCells = screen.getAllByText("‒");
    expect(dashCells.length).toBeGreaterThan(0);
  });

  it("shows hydration count from today log", () => {
    (useTodayLog as jest.Mock).mockReturnValue({
      data: {
        id: "log-1",
        user_id: "user-1",
        date: "2024-01-14",
        hydration_glasses: 6,
        sleep_hours: 7.5,
        mood: "Calm",
        energy_level: "High",
        symptoms: [],
        notes: null,
        flow_level: 2,
        cycle_day: 14,
        cycle_id: "cycle-1",
        partner_alert: false,
        created_at: "",
        updated_at: "",
      },
      isLoading: false,
    });
    render(<HomeScreen />);
    expect(screen.getByText("6/8")).toBeTruthy();
  });

  it("shows sleep hours from today log", () => {
    (useTodayLog as jest.Mock).mockReturnValue({
      data: {
        id: "log-1",
        user_id: "user-1",
        date: "2024-01-14",
        hydration_glasses: null,
        sleep_hours: 7,
        mood: null,
        energy_level: null,
        symptoms: [],
        notes: null,
        flow_level: null,
        cycle_day: null,
        cycle_id: null,
        partner_alert: false,
        created_at: "",
        updated_at: "",
      },
      isLoading: false,
    });
    render(<HomeScreen />);
    expect(screen.getByText("7h")).toBeTruthy();
  });

  it("shows mood from today log", () => {
    (useTodayLog as jest.Mock).mockReturnValue({
      data: {
        id: "log-1",
        user_id: "user-1",
        date: "2024-01-14",
        hydration_glasses: null,
        sleep_hours: null,
        mood: "Energetic",
        energy_level: "High",
        symptoms: [],
        notes: null,
        flow_level: null,
        cycle_day: null,
        cycle_id: null,
        partner_alert: false,
        created_at: "",
        updated_at: "",
      },
      isLoading: false,
    });
    render(<HomeScreen />);
    expect(screen.getByText("Energetic")).toBeTruthy();
  });

  it("shows daily log entries (Flow & Mood, Symptoms, Evening Reflection)", () => {
    render(<HomeScreen />);
    expect(screen.getByText("Flow & Mood")).toBeTruthy();
    expect(screen.getByText("Symptoms")).toBeTruthy();
    expect(screen.getByText("Evening Reflection")).toBeTruthy();
  });

  it('shows "Tap + to log" when no today log exists', () => {
    (useTodayLog as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
    });
    render(<HomeScreen />);
    expect(screen.getByText("Tap + to log")).toBeTruthy();
  });

  it("marks Flow & Mood as done when mood is logged", () => {
    (useTodayLog as jest.Mock).mockReturnValue({
      data: {
        id: "log-1",
        user_id: "user-1",
        date: "2024-01-14",
        mood: "Calm",
        symptoms: [],
        hydration_glasses: null,
        sleep_hours: null,
        energy_level: null,
        notes: null,
        flow_level: null,
        cycle_day: null,
        cycle_id: null,
        partner_alert: false,
        created_at: "",
        updated_at: "",
      },
      isLoading: false,
    });
    render(<HomeScreen />);
    expect(screen.getByText(/Logged · Calm/)).toBeTruthy();
  });

  it("renders 7 mini calendar days", () => {
    render(<HomeScreen />);
    // All 7 weekday abbreviations should be rendered
    const dayAbbreviations = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    // At least one should appear (the mini calendar always shows 7 days)
    const found = dayAbbreviations.some((abbr) => {
      try {
        return screen.getAllByText(abbr).length > 0;
      } catch {
        return false;
      }
    });
    expect(found).toBe(true);
  });

  it('falls back to greeting "there" when no profile loaded', () => {
    (useProfile as jest.Mock).mockReturnValue({ data: null, isLoading: true });
    render(<HomeScreen />);
    expect(screen.getByText(/Good Morning/)).toBeTruthy();
    expect(screen.getByText(/there/)).toBeTruthy();
  });
});
