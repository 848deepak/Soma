import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { CURRENT_CYCLE_KEY } from "@/hooks/useCurrentCycle";
import { useSaveLog } from "@/hooks/useSaveLog";
import { supabase } from "@/lib/supabase";

function createChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {
    select: jest.fn(),
    is: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    maybeSingle: jest.fn(),
    upsert: jest.fn(),
    single: jest.fn(),
  };

  chain.select.mockReturnValue(chain);
  chain.is.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.maybeSingle.mockResolvedValue(result);
  chain.upsert.mockReturnValue(chain);
  chain.single.mockResolvedValue(result);

  return chain;
}

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function renderUseSaveLogWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const hook = renderHook(() => useSaveLog(), { wrapper });
  return { ...hook, queryClient };
}

describe("useSaveLog active cycle guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
  });

  it("rejects log save when no active cycle exists", async () => {
    const cyclesChain = createChain({ data: null, error: null });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "cycles") return cyclesChain;
      return createChain({ data: null, error: null });
    });

    const { result } = renderHook(() => useSaveLog(), { wrapper: Wrapper });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ flow_level: 2 }),
      ).rejects.toThrow("No active period. Start your period to begin logging.");
    });

    expect(supabase.from).toHaveBeenCalledWith("cycles");
  });

  it("rejects log save when backend returns no active cycle even if cache is stale", async () => {
    const cyclesChain = createChain({ data: null, error: null });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "cycles") return cyclesChain;
      return createChain({ data: null, error: null });
    });

    const { result, queryClient } = renderUseSaveLogWithClient();

    queryClient.setQueryData(CURRENT_CYCLE_KEY, {
      cycle: {
        id: "stale-cycle",
        start_date: "2026-03-20",
      },
      cycleDay: 2,
      phase: "menstrual",
      phaseLabel: "Menstrual Phase",
      progress: 0.2,
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ flow_level: 2 }),
      ).rejects.toThrow("No active period. Start your period to begin logging.");
    });
  });
});
