/**
 * src/components/SharedFeed.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Display partner's shared activity: recent logs, alerts, cycle events.
 * Permission-filtered and role-aware.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useSharedData } from "@/hooks/useSharedData";
import { Typography } from "@/src/components/ui/Typography";
import { useAppTheme } from "@/src/context/ThemeContext";
import type { CareCircleRole } from "@/types/database";
import { View } from "react-native";

export function SharedFeed({
  partnerId,
  partnerName,
  role,
  enabled = true,
}: {
  partnerId: string;
  partnerName?: string;
  role: CareCircleRole;
  enabled?: boolean;
}) {
  const { isDark, colors } = useAppTheme();
  const { data: logs = [], isLoading } = useSharedData(
    enabled ? partnerId : null,
    enabled,
    7,
  );

  if (isLoading) {
    return (
      <View
        style={{
          marginTop: 16,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.1)" : colors.borderLight,
          backgroundColor: isDark
            ? "rgba(30,33,40,0.82)"
            : "rgba(255, 255, 255, 0.75)",
          padding: 20,
        }}
      >
        <Typography
          style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}
        >
          {partnerName || "Partner"}'s Recent Activity
        </Typography>
        <Typography variant="helper">Loading shared activity…</Typography>
      </View>
    );
  }

  if (logs.length === 0) {
    return (
      <View
        style={{
          marginTop: 16,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.1)" : colors.borderLight,
          backgroundColor: isDark
            ? "rgba(30,33,40,0.82)"
            : "rgba(255, 255, 255, 0.75)",
          padding: 20,
        }}
      >
        <Typography
          style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}
        >
          {partnerName || "Partner"}'s Recent Activity
        </Typography>
        <Typography variant="helper" style={{ textAlign: "center" }}>
          No shared activity yet.
        </Typography>
      </View>
    );
  }

  return (
    <View
      style={{
        marginTop: 16,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.1)" : colors.borderLight,
        backgroundColor: isDark
          ? "rgba(30,33,40,0.82)"
          : "rgba(255, 255, 255, 0.75)",
        padding: 20,
      }}
    >
      <Typography style={{ fontSize: 14, fontWeight: "600", marginBottom: 12 }}>
        {partnerName || "Partner"}'s Recent Activity
      </Typography>

      <View style={{ gap: 12 }}>
        {logs.map((log, i) => {
          const events: string[] = [];

          if (log.partner_alert) {
            events.push("Sent support alert");
          }
          if (log.mood && role !== "viewer") {
            events.push(`Feeling ${log.mood}`);
          }
          if (log.symptoms && log.symptoms.length > 0) {
            events.push(`Logged ${log.symptoms.length} symptoms`);
          }
          if (log.cycle_phase) {
            events.push(`${log.cycle_phase} phase`);
          }

          if (events.length === 0) {
            events.push("Logged activity");
          }

          return (
            <View
              key={i}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 8,
                borderBottomWidth: i < logs.length - 1 ? 1 : 0,
                borderBottomColor: isDark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(255,255,255,0.3)",
              }}
            >
              <View style={{ flex: 1 }}>
                <Typography
                  style={{ fontSize: 13, fontWeight: "500", marginBottom: 3 }}
                >
                  {events.join(" • ")}
                </Typography>
                <Typography variant="helper" style={{ fontSize: 11 }}>
                  {log.date}
                </Typography>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
