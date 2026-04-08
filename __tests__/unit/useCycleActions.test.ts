import { endCurrentPeriod } from "@/src/domain/cycle/hooks/useCycleActions";

jest.mock("@/lib/supabase");
jest.mock("@/src/services/OfflineQueueManager", () => ({
  OfflineQueueManager: {
    enqueue: jest.fn(),
  },
}));
jest.mock("@/src/services/encryptionService", () => ({
  encryptionService: {
    encrypt: jest.fn().mockResolvedValue("encrypted-payload"),
  },
}));

import { supabase } from "@/lib/supabase";
import { OfflineQueueManager } from "@/src/services/OfflineQueueManager";

type MaybeSingleResult = {
  data: { id: string; start_date: string } | null;
  error: Error | null;
};

type UpdateResult = {
  error: Error | null;
};

function buildCyclesMock(
  maybeSingleResult: MaybeSingleResult,
  updateResult: UpdateResult,
) {
  const maybeSingle = jest.fn().mockResolvedValue(maybeSingleResult);
  const selectLimit = jest.fn().mockReturnValue({ maybeSingle });
  const selectOrder = jest.fn().mockReturnValue({ limit: selectLimit });
  const selectIs = jest.fn().mockReturnValue({ order: selectOrder });
  const selectEq = jest.fn().mockReturnValue({ is: selectIs });
  const select = jest.fn().mockReturnValue({ eq: selectEq });

  const updateEqUser = jest.fn().mockResolvedValue(updateResult);
  const updateEqId = jest.fn().mockReturnValue({ eq: updateEqUser });
  const update = jest.fn().mockReturnValue({ eq: updateEqId });

  return { select, update, maybeSingle, updateEqUser };
}

describe("endCurrentPeriod", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 8, 12, 0, 0));
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it("updates the active cycle with the correct inclusive cycle length", async () => {
    const chains = buildCyclesMock(
      {
        data: { id: "cycle-1", start_date: "2024-03-01" },
        error: null,
      },
      { error: null },
    );

    (supabase.from as jest.Mock).mockImplementation(() => ({
      select: chains.select,
      update: chains.update,
    }));

    const result = await endCurrentPeriod({
      userId: "user-1",
      endDate: "2024-03-09",
    });

    expect(chains.update).toHaveBeenCalledWith({
      start_date: "2024-03-01",
      end_date: "2024-03-09",
      cycle_length: 9,
    });
    expect(result).toEqual({
      cycleId: "cycle-1",
      startDate: "2024-03-01",
      endDate: "2024-03-09",
      cycleLength: 9,
      queued: false,
    });
  });

  it("uses diffDaysInclusive math for a nine-day span", async () => {
    const chains = buildCyclesMock(
      {
        data: { id: "cycle-1", start_date: "2024-03-01" },
        error: null,
      },
      { error: null },
    );

    (supabase.from as jest.Mock).mockImplementation(() => ({
      select: chains.select,
      update: chains.update,
    }));

    const result = await endCurrentPeriod({
      userId: "user-1",
      endDate: "2024-03-09",
    });

    expect(result.cycleLength).toBe(9);
  });

  it("throws for an end date before the start date and skips the write path", async () => {
    const chains = buildCyclesMock(
      {
        data: { id: "cycle-1", start_date: "2024-03-10" },
        error: null,
      },
      { error: null },
    );

    (supabase.from as jest.Mock).mockImplementation(() => ({
      select: chains.select,
      update: chains.update,
    }));

    await expect(
      endCurrentPeriod({
        userId: "user-1",
        endDate: "2024-03-09",
      }),
    ).rejects.toThrow("Cannot end period on 2024-03-09");

    expect(chains.update).not.toHaveBeenCalled();
    expect(OfflineQueueManager.enqueue).not.toHaveBeenCalled();
  });

  it("queues the update for offline sync when the database write fails with a network error", async () => {
    const chains = buildCyclesMock(
      {
        data: { id: "cycle-1", start_date: "2024-03-01" },
        error: null,
      },
      { error: new Error("Network request failed") },
    );

    (supabase.from as jest.Mock).mockImplementation(() => ({
      select: chains.select,
      update: chains.update,
    }));

    const result = await endCurrentPeriod({
      userId: "user-1",
      endDate: "2024-03-09",
    });

    expect(result.queued).toBe(true);
    expect(OfflineQueueManager.enqueue).toHaveBeenCalledWith(
      "cycles",
      "upsert",
      expect.objectContaining({
        id: "cycle-1",
        user_id: "user-1",
        start_date: "2024-03-01",
        end_date: "2024-03-09",
        cycle_length: 9,
      }),
      expect.objectContaining({
        rowId: "cycle-1",
      }),
    );
  });
});