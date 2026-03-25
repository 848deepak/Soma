import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  View,
  useColorScheme,
} from "react-native";

import { PressableScale } from "@/src/components/ui/PressableScale";
import { Screen } from "@/src/components/ui/Screen";
import { Typography } from "@/src/components/ui/Typography";
import { logDataAccess } from "@/src/services/auditService";
import {
  cancelDataRightsRequest,
  type DataRightsRequestEvent,
  type DataRightsRequest,
  listMyDataRightsEvents,
  listMyDataRightsRequests,
  submitDataRightsRequest,
} from "@/src/services/dataRightsService";

type RequestKind = "export" | "deletion";

function statusTone(status: DataRightsRequest["status"]): string {
  switch (status) {
    case "completed":
      return "#16A34A";
    case "rejected":
    case "cancelled":
      return "#B91C1C";
    case "in_progress":
      return "#EA580C";
    default:
      return "#9B7E8C";
  }
}

function statusLabel(status: DataRightsRequest["status"]): string {
  return status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function eventLabel(event: DataRightsRequestEvent): string {
  if (event.event_type === "created") return "Request submitted";
  if (event.event_type === "cancelled") return "Request cancelled";
  if (event.event_type === "result_linked") return "Export link attached";
  if (event.event_type === "note_updated") return "Processing note updated";
  if (event.event_type === "status_changed") {
    if (event.new_status) {
      return `Status changed to ${event.new_status.replace("_", " ")}`;
    }
    return "Status changed";
  }
  return "Status updated";
}

export default function DataRightsScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";

  const [isSubmitting, setIsSubmitting] = useState<RequestKind | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [requests, setRequests] = useState<DataRightsRequest[]>([]);
  const [eventsByRequest, setEventsByRequest] = useState<
    Record<string, DataRightsRequestEvent[]>
  >({});
  const [selectedTimelineRequestId, setSelectedTimelineRequestId] = useState<
    string | null
  >(null);
  const previousStatusMapRef = useRef<Record<string, DataRightsRequest["status"]>>({});
  const hasLoadedOnceRef = useRef(false);

  const latestRequestId = useMemo(() => requests[0]?.id ?? null, [requests]);
  const selectedTimelineEvents = useMemo(() => {
    if (!selectedTimelineRequestId) return [];
    return eventsByRequest[selectedTimelineRequestId] ?? [];
  }, [eventsByRequest, selectedTimelineRequestId]);

  async function refreshRequests() {
    setIsRefreshing(true);
    try {
      const result = await listMyDataRightsRequests();
      const nextStatusMap: Record<string, DataRightsRequest["status"]> = {};
      const changedToTerminal = result.filter((item) => {
        const previous = previousStatusMapRef.current[item.id];
        nextStatusMap[item.id] = item.status;
        if (!previous) return false;
        if (previous === item.status) return false;
        return (
          item.status === "completed" ||
          item.status === "rejected" ||
          item.status === "cancelled"
        );
      });

      if (hasLoadedOnceRef.current && changedToTerminal.length > 0) {
        const summary = changedToTerminal
          .map((item) => {
            const kind = item.request_type === "export" ? "Export" : "Deletion";
            return `${kind} request ${item.id.slice(0, 8)} is now ${statusLabel(item.status)}.`;
          })
          .join("\n");

        Alert.alert("Request Status Updated", summary);
      }

      previousStatusMapRef.current = nextStatusMap;
      hasLoadedOnceRef.current = true;
      setRequests(result);

      const requestIds = result.map((item) => item.id);
      const events = await listMyDataRightsEvents(requestIds, 120);
      const grouped: Record<string, DataRightsRequestEvent[]> = {};
      for (const event of events) {
        if (!grouped[event.request_id]) {
          grouped[event.request_id] = [];
        }
        grouped[event.request_id]!.push(event);
      }
      setEventsByRequest(grouped);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not fetch request history.";
      Alert.alert("Load Failed", message);
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    void refreshRequests();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      void refreshRequests();
    }, 30000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  async function handleCancel(requestId: string) {
    Alert.alert(
      "Cancel request",
      "Are you sure you want to cancel this request?",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Request",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await cancelDataRightsRequest(requestId);
              await logDataAccess("gdpr_data_rights", "cancel", {
                request_id: requestId,
              });
              Alert.alert(
                "Request Cancelled",
                `Request ${result.requestId} is now ${statusLabel(result.status)}.`,
              );
              await refreshRequests();
            } catch (error: unknown) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Could not cancel request.";
              Alert.alert("Cancellation Failed", message);
            }
          },
        },
      ],
    );
  }

  async function handleOpenResult(location: string) {
    try {
      const canOpen = await Linking.canOpenURL(location);
      if (!canOpen) {
        Alert.alert(
          "Cannot Open Link",
          "This export link is not available on your device.",
        );
        return;
      }
      await Linking.openURL(location);
      await logDataAccess("gdpr_data_rights", "open_result_link", {
        has_location: true,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Could not open export link.";
      Alert.alert("Open Failed", message);
    }
  }

  async function handleSubmit(kind: RequestKind) {
    const title = kind === "export" ? "Request data export" : "Request account deletion";
    const message =
      kind === "export"
        ? "We will prepare a privacy export package and process your request."
        : "This submits a deletion request for your account data. Processing may be delayed for verification and safety checks.";

    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Submit",
        style: kind === "deletion" ? "destructive" : "default",
        onPress: async () => {
          setIsSubmitting(kind);
          try {
            const response = await submitDataRightsRequest(kind);
            await logDataAccess("gdpr_data_rights", "request", {
              request_type: kind,
              request_id: response.requestId,
            });
            Alert.alert(
              "Request Submitted",
              `Request ID: ${response.requestId}\nStatus: ${statusLabel(response.status)}`,
            );
            await refreshRequests();
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Could not submit your request.";
            Alert.alert("Submission Failed", errorMessage);
          } finally {
            setIsSubmitting(null);
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <View style={{ marginTop: 8 }}>
        <Typography variant="serifSm">Data Rights Requests</Typography>
        <Typography variant="helper" style={{ marginTop: 6 }}>
          Submit and track export or deletion requests under privacy regulations.
        </Typography>
      </View>

      <View
        style={{
          marginTop: 12,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(221,167,165,0.28)",
          backgroundColor: isDark ? "rgba(30,33,40,0.85)" : "rgba(255,255,255,0.75)",
          padding: 14,
        }}
      >
        <Typography variant="serifSm" style={{ fontSize: 18 }}>
          Submit a new request
        </Typography>

        <PressableScale
          onPress={() => handleSubmit("export")}
          style={{
            marginTop: 12,
            borderRadius: 999,
            alignItems: "center",
            paddingVertical: 12,
            backgroundColor: "#DDA7A5",
            opacity: isSubmitting ? 0.65 : 1,
          }}
          disabled={Boolean(isSubmitting)}
        >
          <Typography style={{ color: "#FFFFFF", fontWeight: "600" }}>
            {isSubmitting === "export" ? "Submitting..." : "Request Data Export"}
          </Typography>
        </PressableScale>

        <PressableScale
          onPress={() => handleSubmit("deletion")}
          style={{
            marginTop: 10,
            borderRadius: 999,
            alignItems: "center",
            paddingVertical: 12,
            backgroundColor: "#B91C1C",
            opacity: isSubmitting ? 0.65 : 1,
          }}
          disabled={Boolean(isSubmitting)}
        >
          <Typography style={{ color: "#FFFFFF", fontWeight: "600" }}>
            {isSubmitting === "deletion" ? "Submitting..." : "Request Account Deletion"}
          </Typography>
        </PressableScale>

        {latestRequestId ? (
          <Typography variant="helper" style={{ marginTop: 10 }}>
            Latest request ID: {latestRequestId}
          </Typography>
        ) : null}
      </View>

      <View
        style={{
          marginTop: 12,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(221,167,165,0.28)",
          backgroundColor: isDark ? "rgba(30,33,40,0.85)" : "rgba(255,255,255,0.75)",
          padding: 14,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Typography variant="serifSm" style={{ fontSize: 18 }}>
            Request history
          </Typography>
          <PressableScale onPress={refreshRequests} disabled={isRefreshing}>
            <Typography variant="helper">
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Typography>
          </PressableScale>
        </View>

        {requests.length === 0 ? (
          <Typography variant="muted" style={{ marginTop: 10 }}>
            No requests submitted yet.
          </Typography>
        ) : (
          requests.map((item) => (
            <View
              key={item.id}
              style={{
                marginTop: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(221,167,165,0.22)",
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(255,255,255,0.7)",
                padding: 10,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Typography style={{ fontWeight: "600" }}>
                  {item.request_type === "export" ? "Data export" : "Deletion"}
                </Typography>
                <Typography style={{ color: statusTone(item.status), fontWeight: "600" }}>
                  {statusLabel(item.status)}
                </Typography>
              </View>
              <Typography variant="helper" style={{ marginTop: 4 }}>
                ID: {item.id}
              </Typography>
              <Typography variant="helper" style={{ marginTop: 2 }}>
                Requested: {new Date(item.requested_at).toLocaleString()}
              </Typography>
              {item.processed_at ? (
                <Typography variant="helper" style={{ marginTop: 2 }}>
                  Processed: {new Date(item.processed_at).toLocaleString()}
                </Typography>
              ) : null}
              {item.processor_note ? (
                <Typography variant="muted" style={{ marginTop: 6 }}>
                  {item.processor_note}
                </Typography>
              ) : null}
              {item.request_type === "export" &&
              item.status === "completed" &&
              item.result_location ? (
                <PressableScale
                  onPress={() => handleOpenResult(item.result_location!)}
                  style={{
                    marginTop: 8,
                    alignSelf: "flex-start",
                    borderRadius: 999,
                    backgroundColor: "#DDA7A5",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  <Typography style={{ color: "#FFFFFF", fontWeight: "600" }}>
                    Open Export Link
                  </Typography>
                </PressableScale>
              ) : null}
              {item.status === "pending" || item.status === "in_progress" ? (
                <PressableScale
                  onPress={() => handleCancel(item.id)}
                  style={{
                    marginTop: 8,
                    alignSelf: "flex-start",
                    borderRadius: 999,
                    backgroundColor: "#B91C1C",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  <Typography style={{ color: "#FFFFFF", fontWeight: "600" }}>
                    Cancel Request
                  </Typography>
                </PressableScale>
              ) : null}

              {(eventsByRequest[item.id]?.length ?? 0) > 0 ? (
                <View style={{ marginTop: 10 }}>
                  <Typography variant="helper" style={{ fontWeight: "600" }}>
                    Timeline
                  </Typography>
                  {(eventsByRequest[item.id] ?? []).slice(0, 3).map((event) => (
                    <Typography key={event.id} variant="helper" style={{ marginTop: 2 }}>
                      {`${new Date(event.created_at).toLocaleString()} - ${eventLabel(event)}`}
                    </Typography>
                  ))}
                  <PressableScale
                    onPress={() => setSelectedTimelineRequestId(item.id)}
                    style={{
                      marginTop: 8,
                      alignSelf: "flex-start",
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: "rgba(221,167,165,0.45)",
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                    }}
                  >
                    <Typography variant="helper" style={{ fontWeight: "600" }}>
                      View Full Timeline
                    </Typography>
                  </PressableScale>
                </View>
              ) : null}
            </View>
          ))
        )}
      </View>

      <Modal
        visible={selectedTimelineRequestId !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedTimelineRequestId(null)}
      >
        <Pressable
          onPress={() => setSelectedTimelineRequestId(null)}
          style={{
            flex: 1,
            backgroundColor: "rgba(15,17,21,0.55)",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              maxHeight: "72%",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: isDark
                ? "rgba(255,255,255,0.12)"
                : "rgba(221,167,165,0.35)",
              backgroundColor: isDark ? "#1D2129" : "#FFFDFB",
              padding: 14,
            }}
          >
            <Typography variant="serifSm">Full Timeline</Typography>
            <Typography variant="helper" style={{ marginTop: 4 }}>
              {selectedTimelineRequestId
                ? `Request ${selectedTimelineRequestId}`
                : ""}
            </Typography>

            <ScrollView
              style={{ marginTop: 10, maxHeight: 360 }}
              showsVerticalScrollIndicator={false}
            >
              {selectedTimelineEvents.length === 0 ? (
                <Typography variant="muted">No timeline events found.</Typography>
              ) : (
                selectedTimelineEvents.map((event) => (
                  <View
                    key={event.id}
                    style={{
                      marginBottom: 8,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(221,167,165,0.25)",
                      padding: 10,
                    }}
                  >
                    <Typography variant="helper" style={{ fontWeight: "600" }}>
                      {eventLabel(event)}
                    </Typography>
                    <Typography variant="helper" style={{ marginTop: 2 }}>
                      {new Date(event.created_at).toLocaleString()}
                    </Typography>
                    <Typography variant="helper" style={{ marginTop: 2 }}>
                      Actor: {event.actor_type}
                    </Typography>
                  </View>
                ))
              )}
            </ScrollView>

            <PressableScale
              onPress={() => setSelectedTimelineRequestId(null)}
              style={{
                marginTop: 10,
                alignItems: "center",
                borderRadius: 999,
                backgroundColor: "#DDA7A5",
                paddingVertical: 10,
              }}
            >
              <Typography style={{ color: "#FFFFFF", fontWeight: "600" }}>
                Close
              </Typography>
            </PressableScale>
          </Pressable>
        </Pressable>
      </Modal>

      <PressableScale
        onPress={() => router.back()}
        style={{
          marginTop: 14,
          marginBottom: 20,
          borderRadius: 999,
          alignItems: "center",
          paddingVertical: 13,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(221,167,165,0.35)",
        }}
      >
        <Typography style={{ fontWeight: "600", color: isDark ? "#F2F2F2" : "#2D2327" }}>
          Back
        </Typography>
      </PressableScale>
    </Screen>
  );
}
