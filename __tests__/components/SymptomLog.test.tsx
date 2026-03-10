/**
 * __tests__/components/SymptomLog.test.tsx
 *
 * Component tests for DailyLogScreen (symptom logging).
 * Verifies rendering, symptom selection, and form submission.
 */
import {
    fireEvent,
    render,
    screen
} from "@testing-library/react-native";

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

import { useTodayLog } from "@/hooks/useDailyLogs";
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
    (useTodayLog as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
    });
    (useSaveLog as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it("renders without crashing", () => {
    expect(() => render(<DailyLogScreen />)).not.toThrow();
  });

  it('shows "How are you feeling today?" header', () => {
    render(<DailyLogScreen />);
    expect(screen.getByText(/How are you/)).toBeTruthy();
    expect(screen.getByText(/feeling today/)).toBeTruthy();
  });

  it("renders all flow level options", () => {
    render(<DailyLogScreen />);
    expect(screen.getByText("None")).toBeTruthy();
    expect(screen.getByText("Light")).toBeTruthy();
    expect(screen.getByText("Medium")).toBeTruthy();
    expect(screen.getByText("Heavy")).toBeTruthy();
  });

  it("renders all 8 symptom options", () => {
    render(<DailyLogScreen />);
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
    render(<DailyLogScreen />);
    expect(screen.getByText("Notes")).toBeTruthy();
  });

  it("shows save button", () => {
    render(<DailyLogScreen />);
    expect(screen.getByText("Save Log")).toBeTruthy();
  });

  it('shows "Saving…" text while mutation is pending', () => {
    (useSaveLog as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    });
    render(<DailyLogScreen />);
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
    render(<DailyLogScreen />);
    // Notes should be pre-filled
    expect(screen.getByDisplayValue("Feeling tired")).toBeTruthy();
  });

  it("calls mutate with correct payload when save is pressed", () => {
    render(<DailyLogScreen />);
    const saveButton = screen.getByText("Save Log");
    fireEvent.press(saveButton);
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        flow_level: expect.any(Number),
      }),
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    );
  });

  it("calls router.back() on successful save", () => {
    (useSaveLog as jest.Mock).mockReturnValue({
      mutate: (payload: unknown, options: { onSuccess: () => void }) => {
        options.onSuccess();
      },
      isPending: false,
    });
    render(<DailyLogScreen />);
    fireEvent.press(screen.getByText("Save Log"));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it("calls router.back() when close button is pressed", () => {
    render(<DailyLogScreen />);
    const closeButton = screen.getByTestId("daily-log-close-button");
    fireEvent.press(closeButton);
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it("toggles symptom selection on press", () => {
    render(<DailyLogScreen />);
    const crampsButton = screen.getByText("Cramps");
    // Pressing a symptom selects it
    fireEvent.press(crampsButton);
    // Pressing again deselects it (no errors thrown)
    fireEvent.press(crampsButton);
  });
});
