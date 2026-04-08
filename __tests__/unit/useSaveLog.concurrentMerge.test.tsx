import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { useSaveLog } from "@/hooks/useSaveLog";
import { supabase } from "@/lib/supabase";

jest.mock("@/src/services/analytics", () => ({
  trackEvent: jest.fn(),
}));

jest.mock("@/src/database/localDB", () => ({
  enqueueSync: jest.fn(),
}));

jest.mock("@/src/services/encryptionService", () => ({
  encryptionService: {
    encrypt: jest.fn(async (value: string) => value),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: {
      retry: false,
      // Prevent GC timeout handles from keeping Jest alive.
      gcTime: Infinity,
    },
  },
});

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe("useSaveLog concurrent merge safety", () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    queryClient.clear();

    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("preserves previously written fields when two saves happen concurrently", async () => {
    let dbRow: any = null;
    const upsertPayloads: Array<Record<string, unknown>> = [];

    const cyclesTable = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(async () => ({
        data: { id: "cycle-1", start_date: "2026-03-20" },
        error: null,
      })),
    };

    const dailyLogsSelectChain = {
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(async () => ({ data: dbRow, error: null })),
    };

    const dailyLogsTable = {
      select: jest.fn(() => dailyLogsSelectChain),
      upsert: jest.fn((payload: Record<string, unknown>) => {
        upsertPayloads.push(payload);
        return {
          select: () => ({
            single: async () => {
              await delay(30);
              dbRow = {
                id: "log-1",
                ...payload,
                created_at: "2026-03-26T10:00:00.000Z",
                updated_at: "2026-03-26T10:00:00.000Z",
              };
              return { data: dbRow, error: null };
            },
          }),
        };
      }),
    };

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "cycles") return cyclesTable;
      if (table === "daily_logs") return dailyLogsTable;
      throw new Error(`Unexpected table: ${table}`);
    });

    const { result, unmount } = renderHook(() => useSaveLog(), { wrapper: Wrapper });

    await act(async () => {
      await Promise.all([
        result.current.mutateAsync({ symptoms: ["Cramps"], notes: "Morning" }),
        result.current.mutateAsync({ mood: "Happy", flow_level: 2 }),
      ]);
    });

    expect(upsertPayloads).toHaveLength(2);

    const finalPayload = upsertPayloads[1]!;
    expect(finalPayload.symptoms).toEqual(["Cramps"]);
    expect(finalPayload.notes).toBe("Morning");
    expect(finalPayload.mood).toBe("Happy");
    expect(finalPayload.flow_level).toBe(2);

    unmount();
  });
});
