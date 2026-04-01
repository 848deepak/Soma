import { endCurrentPeriod, logPeriodRangeAction } from "@/hooks/useCycleActions";

jest.mock("@/lib/supabase");
jest.mock("@/src/database/localDB", () => ({
  enqueueSync: jest.fn(),
}));
jest.mock("@/src/services/encryptionService", () => ({
  encryptionService: {
    encrypt: jest.fn().mockResolvedValue("encrypted-payload"),
  },
}));

import { supabase } from "@/lib/supabase";
import { enqueueSync } from "@/src/database/localDB";

type MaybeSingleResult = {
  data: { id: string; start_date: string } | null;
  error: Error | null;
};

type UpdateResult = {
  error: Error | null;
};

function mockCycleSelect(result: MaybeSingleResult) {
  const maybeSingle = jest.fn().mockResolvedValue(result);
  const limit = jest.fn().mockReturnValue({ maybeSingle });
  const order = jest.fn().mockReturnValue({ limit });
  const is = jest.fn().mockReturnValue({ order });
  const eq = jest.fn().mockReturnValue({ is });
  const select = jest.fn().mockReturnValue({ eq });

  return { select, maybeSingle };
}

function mockCycleUpdate(result: UpdateResult) {
  const eqUser = jest.fn().mockResolvedValue(result);
  const eqId = jest.fn().mockReturnValue({ eq: eqUser });
  const update = jest.fn().mockReturnValue({ eq: eqId });

  return { update, eqUser };
}

describe("endCurrentPeriod", () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("ends active period and computes inclusive cycle length", async () => {
    const selectChain = mockCycleSelect({
      data: { id: "cycle-1", start_date: "2026-03-01" },
      error: null,
    });
    const updateChain = mockCycleUpdate({ error: null });

    (supabase.from as jest.Mock).mockImplementation(() => ({
      select: selectChain.select,
      update: updateChain.update,
    }));

    const result = await endCurrentPeriod({
      userId: "user-1",
      endDate: "2026-03-05",
    });

    expect(result).toEqual({
      cycleId: "cycle-1",
      startDate: "2026-03-01",
      endDate: "2026-03-05",
      cycleLength: 5,
      queued: false,
    });
    expect(enqueueSync).not.toHaveBeenCalled();
  });

  it("throws when there is no active period", async () => {
    const selectChain = mockCycleSelect({ data: null, error: null });
    const updateChain = mockCycleUpdate({ error: null });

    (supabase.from as jest.Mock).mockImplementation(() => ({
      select: selectChain.select,
      update: updateChain.update,
    }));

    await expect(
      endCurrentPeriod({ userId: "user-1", endDate: "2026-03-05" }),
    ).rejects.toThrow("No active period to end.");
  });

  it("queues period end update when network update fails", async () => {
    const selectChain = mockCycleSelect({
      data: { id: "cycle-1", start_date: "2026-03-01" },
      error: null,
    });
    const updateChain = mockCycleUpdate({
      error: new Error("Network request failed"),
    });

    (supabase.from as jest.Mock).mockImplementation(() => ({
      select: selectChain.select,
      update: updateChain.update,
    }));

    const result = await endCurrentPeriod({
      userId: "user-1",
      endDate: "2026-03-05",
    });

    expect(result.queued).toBe(true);
    expect(enqueueSync).toHaveBeenCalledWith(
      "cycles",
      "cycle-1",
      "upsert",
      "encrypted-payload",
    );
  });

  it("retries active-cycle fetch on transient network failure", async () => {
    const maybeSingle = jest
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: new Error("Network request failed"),
      })
      .mockResolvedValueOnce({
        data: { id: "cycle-1", start_date: "2026-03-01" },
        error: null,
      });

    const select = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        is: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({ maybeSingle }),
          }),
        }),
      }),
    });

    const updateChain = mockCycleUpdate({ error: null });

    (supabase.from as jest.Mock).mockImplementation(() => ({
      select,
      update: updateChain.update,
    }));

    const result = await endCurrentPeriod({
      userId: "user-1",
      endDate: "2026-03-05",
    });

    expect(result.queued).toBe(false);
    expect(maybeSingle).toHaveBeenCalledTimes(2);
  });
});

describe("logPeriodRangeAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
  });

  it("supports start-only period logging when no active cycle exists", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const selectChain = {
      eq: jest.fn().mockReturnValue({
        is: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({ maybeSingle }),
          }),
        }),
      }),
    };

    const insert = jest.fn().mockResolvedValue({ error: null });

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue(selectChain),
      insert,
    });

    const result = await logPeriodRangeAction({ startDate: "2026-03-01" });

    expect(result).toEqual({ hasEndDate: false });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        start_date: "2026-03-01",
        current_phase: "menstrual",
      }),
    );
  });

  it("supports explicit period end when an active cycle exists", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { id: "cycle-1", start_date: "2026-03-01" },
      error: null,
    });
    const selectChain = {
      eq: jest.fn().mockReturnValue({
        is: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({ maybeSingle }),
          }),
        }),
      }),
    };

    const eqUser = jest.fn().mockResolvedValue({ error: null });
    const eqId = jest.fn().mockReturnValue({ eq: eqUser });
    const update = jest.fn().mockReturnValue({ eq: eqId });

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue(selectChain),
      update,
    });

    const result = await logPeriodRangeAction({
      startDate: "2026-03-01",
      endDate: "2026-03-05",
    });

    expect(result).toEqual({ hasEndDate: true });
    expect(update).toHaveBeenCalledWith({ end_date: "2026-03-05", cycle_length: 5 });
  });

  it("queues start-only period when insert fails due to network", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const selectChain = {
      eq: jest.fn().mockReturnValue({
        is: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({ maybeSingle }),
          }),
        }),
      }),
    };

    const insert = jest
      .fn()
      .mockResolvedValue({ error: new Error("Network request failed") });

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue(selectChain),
      insert,
    });

    const result = await logPeriodRangeAction({ startDate: "2026-03-01" });

    expect(result).toEqual({ hasEndDate: false });
    expect(enqueueSync).toHaveBeenCalledWith(
      "cycles",
      "cycle:user-1:2026-03-01",
      "upsert",
      "encrypted-payload",
    );
  });

  it("queues active period end when update fails due to network", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { id: "cycle-1", start_date: "2026-03-01" },
      error: null,
    });
    const selectChain = {
      eq: jest.fn().mockReturnValue({
        is: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({ maybeSingle }),
          }),
        }),
      }),
    };

    const eqUser = jest
      .fn()
      .mockResolvedValue({ error: new Error("Network request failed") });
    const eqId = jest.fn().mockReturnValue({ eq: eqUser });
    const update = jest.fn().mockReturnValue({ eq: eqId });

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue(selectChain),
      update,
    });

    const result = await logPeriodRangeAction({
      startDate: "2026-03-01",
      endDate: "2026-03-05",
    });

    expect(result).toEqual({ hasEndDate: true });
    expect(enqueueSync).toHaveBeenCalledWith(
      "cycles",
      "cycle-1",
      "upsert",
      "encrypted-payload",
    );
  });
});
