import { resetPredictionsAction } from "@/hooks/useCycleActions";

jest.mock("@/lib/supabase");

import { supabase } from "@/lib/supabase";

describe("resetPredictionsAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
  });

  it("recalculates predictions for active cycles without deleting logs", async () => {
    const selectChain = {
      eq: jest.fn().mockReturnValue({
        is: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [{ id: "cycle-1", start_date: "2026-03-01" }],
            error: null,
          }),
        }),
      }),
    };

    const updateEqUser = jest.fn().mockResolvedValue({ error: null });
    const updateEqId = jest.fn().mockReturnValue({ eq: updateEqUser });
    const update = jest.fn().mockReturnValue({ eq: updateEqId });

    const cyclesFrom = {
      select: jest.fn().mockReturnValue(selectChain),
      update,
      delete: jest.fn(),
    };

    const logsFrom = {
      delete: jest.fn(),
    };

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "cycles") return cyclesFrom;
      if (table === "daily_logs") return logsFrom;
      return { select: jest.fn(), update: jest.fn(), delete: jest.fn() };
    });

    const result = await resetPredictionsAction({
      cycleLength: 28,
      periodLength: 5,
    });

    expect(result).toEqual({ updatedCycles: 1 });
    expect(update).toHaveBeenCalledWith({
      predicted_ovulation: "2026-03-14",
      predicted_next_cycle: "2026-03-29",
    });
    expect(logsFrom.delete).not.toHaveBeenCalled();
    expect(cyclesFrom.delete).not.toHaveBeenCalled();
  });

  it("returns zero updates when there is no active cycle", async () => {
    const selectChain = {
      eq: jest.fn().mockReturnValue({
        is: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    };

    const cyclesFrom = {
      select: jest.fn().mockReturnValue(selectChain),
      update: jest.fn(),
      delete: jest.fn(),
    };

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "cycles") return cyclesFrom;
      return { select: jest.fn(), update: jest.fn(), delete: jest.fn() };
    });

    const result = await resetPredictionsAction({
      cycleLength: 30,
      periodLength: 6,
    });

    expect(result).toEqual({ updatedCycles: 0 });
    expect(cyclesFrom.update).not.toHaveBeenCalled();
    expect(cyclesFrom.delete).not.toHaveBeenCalled();
  });

  it("updates predictions for each active cycle and never invokes delete paths", async () => {
    const selectChain = {
      eq: jest.fn().mockReturnValue({
        is: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [
              { id: "cycle-1", start_date: "2026-03-01" },
              { id: "cycle-2", start_date: "2026-03-10" },
            ],
            error: null,
          }),
        }),
      }),
    };

    const updatePayloads: Array<Record<string, string>> = [];
    const update = jest.fn().mockImplementation((payload: Record<string, string>) => {
      updatePayloads.push(payload);
      const eqUser = jest.fn().mockResolvedValue({ error: null });
      const eqId = jest.fn().mockReturnValue({ eq: eqUser });
      return { eq: eqId };
    });

    const cyclesFrom = {
      select: jest.fn().mockReturnValue(selectChain),
      update,
      delete: jest.fn(),
    };

    const logsFrom = {
      delete: jest.fn(),
    };

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "cycles") return cyclesFrom;
      if (table === "daily_logs") return logsFrom;
      return { select: jest.fn(), update: jest.fn(), delete: jest.fn() };
    });

    const result = await resetPredictionsAction({
      cycleLength: 30,
      periodLength: 6,
    });

    expect(result).toEqual({ updatedCycles: 2 });
    expect(update).toHaveBeenCalledTimes(2);
    expect(updatePayloads).toEqual([
      {
        predicted_ovulation: "2026-03-16",
        predicted_next_cycle: "2026-03-31",
      },
      {
        predicted_ovulation: "2026-03-25",
        predicted_next_cycle: "2026-04-09",
      },
    ]);
    expect(logsFrom.delete).not.toHaveBeenCalled();
    expect(cyclesFrom.delete).not.toHaveBeenCalled();
  });

  it("rejects invalid cycle length before any table updates", async () => {
    const cyclesFrom = {
      select: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "cycles") return cyclesFrom;
      return { select: jest.fn(), update: jest.fn(), delete: jest.fn() };
    });

    await expect(
      resetPredictionsAction({
        cycleLength: 10,
        periodLength: 5,
      }),
    ).rejects.toThrow("Cycle length must be between 15 and 60 days.");

    expect(cyclesFrom.select).not.toHaveBeenCalled();
    expect(cyclesFrom.update).not.toHaveBeenCalled();
    expect(cyclesFrom.delete).not.toHaveBeenCalled();
  });
});
