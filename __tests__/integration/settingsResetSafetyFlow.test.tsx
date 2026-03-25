import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Alert } from "react-native";

import { SettingsScreen } from "@/src/screens/SettingsScreen";

const mockResetPredictionsMutateAsync = jest.fn();
const mockDeleteAllDataMutateAsync = jest.fn();
const mockStartNewCycleMutateAsync = jest.fn();
const mockEndCurrentCycleMutateAsync = jest.fn();
const mockUpdateProfileMutateAsync = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

jest.mock("@/lib/supabase");
jest.mock("@/lib/auth", () => ({
  signOut: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/src/services/analytics", () => ({
  track: jest.fn(),
}));

jest.mock("@/src/services/notificationService", () => ({
  cancelAllNotifications: jest.fn(),
  requestPermissions: jest.fn().mockResolvedValue({ granted: true }),
  scheduleDailyLogReminder: jest.fn(),
}));

jest.mock("@/hooks/useProfile", () => ({
  useProfile: jest.fn(() => ({
    data: {
      id: "user-1",
      first_name: "Jane",
      username: "jane",
      date_of_birth: "1994-03-01",
      cycle_length_average: 28,
      period_duration_average: 5,
      created_at: "2025-01-01T00:00:00.000Z",
    },
    isLoading: false,
  })),
  useUpdateProfile: jest.fn(() => ({
    mutateAsync: mockUpdateProfileMutateAsync,
    isPending: false,
  })),
}));

jest.mock("@/hooks/useCurrentCycle", () => ({
  useCurrentCycle: jest.fn(() => ({
    data: {
      cycle: {
        id: "cycle-1",
        start_date: "2026-03-18",
      },
    },
  })),
}));

jest.mock("@/hooks/useCycleActions", () => ({
  useStartNewCycle: jest.fn(() => ({
    mutateAsync: mockStartNewCycleMutateAsync,
    isPending: false,
  })),
  useEndCurrentCycle: jest.fn(() => ({
    mutateAsync: mockEndCurrentCycleMutateAsync,
    isPending: false,
  })),
  useResetPredictions: jest.fn(() => ({
    mutateAsync: mockResetPredictionsMutateAsync,
    isPending: false,
  })),
  useDeleteAllData: jest.fn(() => ({
    mutateAsync: mockDeleteAllDataMutateAsync,
    isPending: false,
  })),
}));

describe("Settings reset safety flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResetPredictionsMutateAsync.mockResolvedValue({ updatedCycles: 1 });
    mockDeleteAllDataMutateAsync.mockResolvedValue(undefined);
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    (Alert.alert as jest.Mock).mockRestore?.();
  });

  it("reset predictions confirmation triggers non-destructive mutation only", async () => {
    render(<SettingsScreen />);

    expect(screen.getByText("Reset Predictions")).toBeTruthy();
    expect(
      screen.getByText("Reset Predictions updates forecast dates only. It never deletes logs."),
    ).toBeTruthy();

    fireEvent.press(screen.getByText("Reset Predictions"));

    const resetPromptCall = (Alert.alert as jest.Mock).mock.calls.find(
      (call) => call[0] === "Reset predictions?",
    );
    expect(resetPromptCall).toBeTruthy();

    const resetButtons = resetPromptCall?.[2] as
      | Array<{ text: string; onPress?: () => void | Promise<void> }>
      | undefined;
    const resetAction = resetButtons?.find((button) => button.text === "Reset");

    await act(async () => {
      await resetAction?.onPress?.();
    });

    expect(mockResetPredictionsMutateAsync).toHaveBeenCalledWith({
      cycleLength: 28,
      periodLength: 5,
    });
    expect(mockDeleteAllDataMutateAsync).not.toHaveBeenCalled();

    expect(Alert.alert).toHaveBeenCalledWith(
      "Predictions updated",
      "Cycle predictions were recalculated successfully.",
    );
  });

  it("delete all data remains a separate explicit destructive flow", async () => {
    render(<SettingsScreen />);

    fireEvent.press(screen.getByText("Delete Account"));

    const deletePromptCall = (Alert.alert as jest.Mock).mock.calls.find(
      (call) => call[0] === "Delete all data?",
    );
    expect(deletePromptCall).toBeTruthy();

    const deleteButtons = deletePromptCall?.[2] as
      | Array<{ text: string; onPress?: () => void | Promise<void> }>
      | undefined;
    const deleteAction = deleteButtons?.find((button) => button.text === "Delete");

    await act(async () => {
      await deleteAction?.onPress?.();
    });

    expect(mockDeleteAllDataMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockResetPredictionsMutateAsync).not.toHaveBeenCalled();
  });
});
