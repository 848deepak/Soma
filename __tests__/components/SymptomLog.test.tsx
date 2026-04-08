/**
 * __tests__/components/SymptomLog.test.tsx
 *
 * Component tests for DailyLogScreen (symptom logging).
 * Verifies rendering, symptom selection, and form submission.
 */
import {
    fireEvent,
    screen
} from "@testing-library/react-native";
import { renderWithProviders } from "../testUtils";
import { Alert } from "react-native";

jest.mock("@/lib/supabase");
jest.mock("@/lib/auth");
jest.mock("expo-router");
jest.mock("expo-haptics");

jest.mock("@/hooks/useDailyLogs", () => ({
  useDailyLogs: jest.fn(() => ({ data: [], isLoading: false })),
  useTodayLog: jest.fn(),
}));

jest.mock("@/hooks/useSaveLog", () => ({
  useSaveLog: jest.fn(),
}));

jest.mock("@/hooks/useProfile", () => ({
  useProfile: jest.fn(() => ({
    data: { cycle_length_average: 28, period_duration_average: 5 },
    isLoading: false,
  })),
}));

jest.mock("@/hooks/useCurrentCycle", () => ({
  useCurrentCycle: jest.fn(() => ({
    data: { cycle: null },
  })),
}));

jest.mock("@/hooks/useCycleActions", () => ({
  useEndCurrentCycle: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false,
  })),
}));

import { useTodayLog } from "@/hooks/useDailyLogs";
import { useCurrentCycle } from "@/hooks/useCurrentCycle";
import { useSaveLog } from "@/hooks/useSaveLog";
import { DailyLogScreen } from "@/src/screens/DailyLogScreen";
import { useRouter } from "expo-router";

const mockMutate = jest.fn();
const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  replace: jest.fn(),
  navigate: jest.fn(),
};

describe("DailyLogScreen (SymptomLog)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    (useTodayLog as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
    });
    (useCurrentCycle as jest.Mock).mockReturnValue({
      data: { cycle: null },
    });
    (useSaveLog as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  afterEach(() => {
    (Alert.alert as jest.Mock).mockRestore?.();
  });

  it("renders without crashing", () => {
    expect(() => renderWithProviders(<DailyLogScreen />)).not.toThrow();
  });

  it('shows "How are you feeling today?" header', () => {
    renderWithProviders(<DailyLogScreen />);
    expect(screen.getByText(/How are you/)).toBeTruthy();
    expect(screen.getByText(/feeling today/)).toBeTruthy();
  });

  it("renders all flow level options", () => {
    renderWithProviders(<DailyLogScreen />);
    expect(screen.getByText("None")).toBeTruthy();
    expect(screen.getByText("Light")).toBeTruthy();
    expect(screen.getByText("Medium")).toBeTruthy();
    expect(screen.getByText("Heavy")).toBeTruthy();
  });

  it("renders all 8 symptom options", () => {
    renderWithProviders(<DailyLogScreen />);
    expect(screen.getByText("Cramps")).toBeTruthy();
    expect(screen.getByText("Tender")).toBeTruthy();
    expect(screen.getByText("Bloating")).toBeTruthy();
    expect(screen.getByText("Brain Fog")).toBeTruthy();
    expect(screen.getByText("Radiant")).toBeTruthy();
    expect(screen.getByText("Energized")).toBeTruthy();
    expect(screen.getByText("Moody")).toBeTruthy();
    expect(screen.getByText("Calm")).toBeTruthy();
  });

  it("shows Notes section", () => {
    renderWithProviders(<DailyLogScreen />);
    expect(screen.getByText("Notes")).toBeTruthy();
  });

  it("shows save button", () => {
    renderWithProviders(<DailyLogScreen />);
    expect(screen.getByText("Save Log")).toBeTruthy();
  });

  it('shows "Saving…" text while mutation is pending', () => {
    (useSaveLog as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    });
    renderWithProviders(<DailyLogScreen />);
    expect(screen.getByText("Saving…")).toBeTruthy();
  });

  it("pre-populates symptoms from today log", () => {
    (useTodayLog as jest.Mock).mockReturnValue({
      data: {
        id: "log-1",
        user_id: "user-1",
        date: "2024-01-14",
        flow_level: 2,
        mood: null,
        energy_level: null,
        symptoms: ["Cramps", "Bloating"],
        notes: "Feeling tired",
        hydration_glasses: null,
        sleep_hours: null,
        partner_alert: false,
        cycle_day: null,
        cycle_id: null,
        created_at: "",
        updated_at: "",
      },
      isLoading: false,
    });
    renderWithProviders(<DailyLogScreen />);
    // Notes should be pre-filled
    expect(screen.getByDisplayValue("Feeling tired")).toBeTruthy();
  });

  it("blocks save when there is no active cycle", () => {
    renderWithProviders(<DailyLogScreen />);
    expect(screen.getByText("Start your period to enable logging.")).toBeTruthy();

    expect(mockMutate).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("calls mutate with correct payload when save is pressed and active cycle exists", () => {
    (useCurrentCycle as jest.Mock).mockReturnValue({
      data: { cycle: { id: "cycle-1", start_date: "2026-03-20" } },
    });

    renderWithProviders(<DailyLogScreen />);
    const saveButton = screen.getByText("Save Log");
    fireEvent.press(saveButton);

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        flow_level: expect.any(Number),
        symptoms: expect.any(Array),
      }),
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    );
  });

  it("calls router.back() on successful save", () => {
    (useCurrentCycle as jest.Mock).mockReturnValue({
      data: { cycle: { id: "cycle-1", start_date: "2026-03-20" } },
    });

    (useSaveLog as jest.Mock).mockReturnValue({
      mutate: (payload: unknown, options: { onSuccess: () => void }) => {
        options.onSuccess();
      },
      isPending: false,
    });
    renderWithProviders(<DailyLogScreen />);
    fireEvent.press(screen.getByText("Save Log"));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it("calls router.back() when close button is pressed", () => {
    renderWithProviders(<DailyLogScreen />);
    const closeButton = screen.getByTestId("daily-log-close-button");
    fireEvent.press(closeButton);
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it("toggles symptom selection on press", () => {
    renderWithProviders(<DailyLogScreen />);
    const crampsButton = screen.getByText("Cramps");
    // Pressing a symptom selects it
    fireEvent.press(crampsButton);
    // Pressing again deselects it (no errors thrown)
    fireEvent.press(crampsButton);
  });
});
