jest.mock("@/lib/supabase");

import { supabase } from "@/lib/supabase";
import { supabaseService } from "@/src/services/supabaseService";

describe("supabaseService.push", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses user_id,date conflict target for daily_logs upserts", async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({ upsert });

    const result = await supabaseService.push({
      table: "daily_logs",
      operation: "upsert",
      payload: { user_id: "u1", date: "2026-03-24", flow_level: 2 },
      entityId: "ignored",
    });

    expect(result).toEqual({ ok: true });
    expect(upsert).toHaveBeenCalledWith(
      { user_id: "u1", date: "2026-03-24", flow_level: 2 },
      { onConflict: "user_id,date" },
    );
  });

  it("uses user_id,start_date conflict target for cycles upserts", async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({ upsert });

    const result = await supabaseService.push({
      table: "cycles",
      operation: "upsert",
      payload: { id: "cycle-1", user_id: "u1", start_date: "2026-03-24" },
      entityId: "cycle-1",
    });

    expect(result).toEqual({ ok: true });
    expect(upsert).toHaveBeenCalledWith(
      { id: "cycle-1", user_id: "u1", start_date: "2026-03-24" },
      { onConflict: "user_id,start_date" },
    );
  });

  it("uses id conflict target for other tables", async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({ upsert });

    const result = await supabaseService.push({
      table: "profiles",
      operation: "upsert",
      payload: { id: "u1", username: "soma" },
      entityId: "u1",
    });

    expect(result).toEqual({ ok: true });
    expect(upsert).toHaveBeenCalledWith(
      { id: "u1", username: "soma" },
      { onConflict: "id" },
    );
  });
});
