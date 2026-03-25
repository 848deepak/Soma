jest.mock("@/lib/supabase");

import { supabase } from "@/lib/supabase";
import {
  cancelDataRightsRequest,
  listMyDataRightsEvents,
  listMyDataRightsRequests,
  submitDataRightsRequest,
} from "@/src/services/dataRightsService";

describe("dataRightsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("submits request via edge function", async () => {
    const invoke = jest
      .fn()
      .mockResolvedValue({ data: { requestId: "req_1", status: "pending" }, error: null });
    (supabase.functions.invoke as jest.Mock).mockImplementation(invoke);

    const result = await submitDataRightsRequest("export", "Please provide full export");

    expect(invoke).toHaveBeenCalledWith("data-rights-request", {
      body: {
        requestType: "export",
        requestNote: "Please provide full export",
      },
    });
    expect(result).toEqual({ requestId: "req_1", status: "pending" });
  });

  it("throws when function invoke returns an error", async () => {
    const invoke = jest
      .fn()
      .mockResolvedValue({ data: null, error: { message: "boom" } });
    (supabase.functions.invoke as jest.Mock).mockImplementation(invoke);

    await expect(submitDataRightsRequest("deletion")).rejects.toThrow("boom");
  });

  it("loads request history ordered by requested_at", async () => {
    const limit = jest.fn().mockResolvedValue({
      data: [
        {
          id: "req_2",
          request_type: "deletion",
          status: "pending",
          requested_at: "2026-03-25T10:00:00.000Z",
          processed_at: null,
          processor_note: null,
          result_location: null,
        },
      ],
      error: null,
    });
    const order = jest.fn().mockReturnValue({ limit });
    const select = jest.fn().mockReturnValue({ order });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await listMyDataRightsRequests(10);

    expect(supabase.from).toHaveBeenCalledWith("data_rights_requests");
    expect(select).toHaveBeenCalledWith(
      "id,request_type,status,requested_at,processed_at,processor_note,result_location",
    );
    expect(order).toHaveBeenCalledWith("requested_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(10);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("req_2");
  });

  it("cancels a pending request through edge function", async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: { requestId: "req_3", status: "cancelled" },
      error: null,
    });
    (supabase.functions.invoke as jest.Mock).mockImplementation(invoke);

    const result = await cancelDataRightsRequest("req_3");

    expect(invoke).toHaveBeenCalledWith("cancel-data-rights-request", {
      body: { requestId: "req_3" },
    });
    expect(result).toEqual({ requestId: "req_3", status: "cancelled" });
  });

  it("loads request events for provided request IDs", async () => {
    const limit = jest.fn().mockResolvedValue({
      data: [
        {
          id: "evt_1",
          request_id: "req_2",
          actor_type: "user",
          event_type: "created",
          old_status: null,
          new_status: "pending",
          created_at: "2026-03-25T10:01:00.000Z",
        },
      ],
      error: null,
    });
    const order = jest.fn().mockReturnValue({ limit });
    const inFilter = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ in: inFilter });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const result = await listMyDataRightsEvents(["req_2"], 10);

    expect(supabase.from).toHaveBeenCalledWith("data_rights_request_events");
    expect(select).toHaveBeenCalledWith(
      "id,request_id,actor_type,event_type,old_status,new_status,created_at",
    );
    expect(inFilter).toHaveBeenCalledWith("request_id", ["req_2"]);
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(10);
    expect(result[0]?.id).toBe("evt_1");
  });
});
