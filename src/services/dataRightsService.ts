import { supabase } from "@/lib/supabase";

export type DataRightsRequestType = "export" | "deletion";
export type DataRightsRequestStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "rejected"
  | "cancelled";

export type DataRightsRequest = {
  id: string;
  request_type: DataRightsRequestType;
  status: DataRightsRequestStatus;
  requested_at: string;
  processed_at: string | null;
  processor_note: string | null;
  result_location: string | null;
};

export type DataRightsRequestEvent = {
  id: string;
  request_id: string;
  actor_type: "user" | "operator" | "system";
  event_type:
    | "created"
    | "status_changed"
    | "cancelled"
    | "note_updated"
    | "result_linked";
  old_status: string | null;
  new_status: string | null;
  created_at: string;
};

export async function submitDataRightsRequest(
  requestType: DataRightsRequestType,
  requestNote?: string,
): Promise<{ requestId: string; status: DataRightsRequestStatus }> {
  const { data, error } = await supabase.functions.invoke("data-rights-request", {
    body: {
      requestType,
      requestNote: requestNote?.trim() || undefined,
    },
  });

  if (error) {
    throw new Error(error.message || "Could not submit request.");
  }

  if (!data?.requestId || !data?.status) {
    throw new Error("Unexpected response while creating request.");
  }

  return {
    requestId: String(data.requestId),
    status: String(data.status) as DataRightsRequestStatus,
  };
}

export async function listMyDataRightsRequests(
  limit = 20,
): Promise<DataRightsRequest[]> {
  const { data, error } = await supabase
    .from("data_rights_requests")
    .select(
      "id,request_type,status,requested_at,processed_at,processor_note,result_location",
    )
    .order("requested_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || "Could not load request history.");
  }

  return (data ?? []) as DataRightsRequest[];
}

export async function cancelDataRightsRequest(
  requestId: string,
): Promise<{ requestId: string; status: DataRightsRequestStatus }> {
  const { data, error } = await supabase.functions.invoke(
    "cancel-data-rights-request",
    {
      body: { requestId },
    },
  );

  if (error) {
    throw new Error(error.message || "Could not cancel request.");
  }

  if (!data?.requestId || !data?.status) {
    throw new Error("Unexpected response while cancelling request.");
  }

  return {
    requestId: String(data.requestId),
    status: String(data.status) as DataRightsRequestStatus,
  };
}

export async function listMyDataRightsEvents(
  requestIds: string[],
  limit = 100,
): Promise<DataRightsRequestEvent[]> {
  if (requestIds.length === 0) return [];

  const { data, error } = await supabase
    .from("data_rights_request_events")
    .select("id,request_id,actor_type,event_type,old_status,new_status,created_at")
    .in("request_id", requestIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || "Could not load request events.");
  }

  return (data ?? []) as DataRightsRequestEvent[];
}
