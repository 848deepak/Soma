import { renderHook, waitFor } from "@testing-library/react-native";
import * as Network from "expo-network";
import { AppState } from "react-native";

import { usePeriodAutoEnd } from "@/hooks/usePeriodAutoEnd";

jest.mock("@/lib/supabase");
jest.mock("@/src/domain/cycle", () => {
  const actual = jest.requireActual("@/src/domain/cycle");
  return {
    ...actual,
    endCurrentPeriod: jest.fn(),
  };
});
jest.mock("@/src/context/AuthProvider", () => ({
  useAuthContext: jest.fn(),
}));
jest.mock("@/src/services/analytics", () => ({
  trackEvent: jest.fn(),
}));
jest.mock("@/src/services/remoteConfig", () => ({
  getPeriodAutoEndDays: jest.fn(),
}));
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: jest.fn(),
}));

import { useQueryClient } from "@tanstack/react-query";
import { endCurrentPeriod } from "@/src/domain/cycle";
import { supabase } from "@/lib/supabase";
import { useAuthContext } from "@/src/context/AuthProvider";
import { trackEvent } from "@/src/services/analytics";
import { getPeriodAutoEndDays } from "@/src/services/remoteConfig";

describe("usePeriodAutoEnd", () => {
  const invalidateQueries = jest.fn();
  const getQueryData = jest.fn();
  const addNetworkStateListenerMock =
    Network.addNetworkStateListener as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.setSystemTime(new Date("2026-03-24T12:00:00.000Z"));

    (useAuthContext as jest.Mock).mockReturnValue({ user: { id: "user-1" } });
    (useQueryClient as jest.Mock).mockReturnValue({
      invalidateQueries,
      getQueryData,
    });
    (getPeriodAutoEndDays as jest.Mock).mockResolvedValue(7);
    (endCurrentPeriod as jest.Mock).mockResolvedValue({ queued: false });

    getQueryData.mockReturnValue(null);

    const maybeSingle = jest.fn().mockResolvedValue({
      data: { id: "cycle-1", start_date: "2026-03-15" },
      error: null,
    });
    const limit = jest.fn().mockReturnValue({ maybeSingle });
    const order = jest.fn().mockReturnValue({ limit });
    const is = jest.fn().mockReturnValue({ order });
    const eq = jest.fn().mockReturnValue({ is });
    const select = jest.fn().mockReturnValue({ eq });

    (supabase.from as jest.Mock).mockReturnValue({ select });
  });

  it("auto-ends when active cycle age meets threshold", async () => {
    renderHook(() => usePeriodAutoEnd());

    await waitFor(() => {
      expect(endCurrentPeriod).toHaveBeenCalledWith({
        userId: "user-1",
        endDate: "2026-03-21",
        fallbackCycle: { id: "cycle-1", start_date: "2026-03-15" },
      });
    });

    expect(trackEvent).toHaveBeenCalledWith("period_auto_ended", {
      threshold_days: 7,
      active_days: 10,
      queued_for_sync: false,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["current-cycle"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["cycle-history"],
    });
  });

  it("does not auto-end when active cycle age is below threshold", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { id: "cycle-1", start_date: "2026-03-22" },
      error: null,
    });
    const limit = jest.fn().mockReturnValue({ maybeSingle });
    const order = jest.fn().mockReturnValue({ limit });
    const is = jest.fn().mockReturnValue({ order });
    const eq = jest.fn().mockReturnValue({ is });
    const select = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    renderHook(() => usePeriodAutoEnd());

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith("cycles");
    });

    expect(endCurrentPeriod).not.toHaveBeenCalled();
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("registers listeners and cleans up on unmount", async () => {
    const appStateRemove = jest.fn();
    const networkRemove = jest.fn();

    const appStateSpy = jest
      .spyOn(AppState, "addEventListener")
      .mockReturnValue({ remove: appStateRemove } as never);
    addNetworkStateListenerMock.mockReturnValue({ remove: networkRemove });

    const { unmount } = renderHook(() => usePeriodAutoEnd());

    await waitFor(() => {
      expect(AppState.addEventListener).toHaveBeenCalledWith(
        "change",
        expect.any(Function),
      );
      expect(Network.addNetworkStateListener).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });

    unmount();

    expect(appStateRemove).toHaveBeenCalledTimes(1);
    expect(networkRemove).toHaveBeenCalledTimes(1);

    appStateSpy.mockRestore();
  });
});
