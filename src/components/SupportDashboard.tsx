/**
 * src/components/SupportDashboard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Viewer role experience: simplified, read-only dashboard for supporters.
 * Shows cycle status, predicted symptoms, support suggestions, next cycle prediction.
 * Explicitly hides all logging/input UI.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useSharedData } from "@/hooks/useSharedData";
import { Typography } from "@/src/components/ui/Typography";
import { useAppTheme } from "@/src/context/ThemeContext";
import type { SharedDataLog } from "@/types/database";
import { SFSymbol, SymbolView } from "expo-symbols";
import { View } from "react-native";

const CYCLE_PHASE_LABELS: Record<string, { label: string; icon: SFSymbol }> = {
  menstrual: {
    label: "Menstrual Phase",
    icon: "heart.fill",
  },
  follicular: {
    label: "Follicular Phase",
    icon: "star.fill",
  },
  ovulation: {
    label: "Ovulation Window",
    icon: "flame.fill",
  },
  luteal: {
    label: "Luteal Phase",
    icon: "moon.fill",
  },
};

const SUPPORT_SUGGESTIONS: Record<string, string[]> = {
  menstrual: [
    "Rest and hydrate",
    "Warm compress for comfort",
    "Offer gentle company",
  ],
  follicular: [
    "Encourage outdoor activities",
    "Social plans often feel good",
    "Energy is naturally higher",
  ],
  ovulation: [
    "Peak confidence period",
    "Great time for social connection",
    "Energy and clarity peak",
  ],
  luteal: [
    "Honor need for rest",
    "Meal prep or cooking help",
    "Quiet quality time appreciated",
  ],
};

export function SupportDashboard({
  partnerId,
  partnerName,
}: {
  partnerId: string;
  partnerName?: string;
}) {
  const { isDark, colors } = useAppTheme();
  const sharedQuery = useSharedData(partnerId, true, 1);
  const logs = sharedQuery?.data ?? [];
  const isLoading = sharedQuery?.isLoading ?? false;

  const today: SharedDataLog | null = logs[0] ?? null;
  const cyclePhase = today?.cycle_phase ?? "follicular";

  const phaseInfo =
    CYCLE_PHASE_LABELS[cyclePhase] || CYCLE_PHASE_LABELS.follicular;
  const suggestions =
    SUPPORT_SUGGESTIONS[cyclePhase] || SUPPORT_SUGGESTIONS.follicular;

  if (isLoading) {
    return (
      <View style={{ gap: 16, marginTop: 32 }}>
        <Typography style={{ fontSize: 16, fontWeight: "600" }}>
          {partnerName || "Friend"}'s Support Dashboard
        </Typography>
        <Typography variant="helper">Loading cycle information…</Typography>
      </View>
    );
  }

  return (
    <View style={{ gap: 16, marginTop: 32 }}>
      {/* Title */}
      <Typography style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
        {partnerName || "Friend"}'s Support Dashboard
      </Typography>

      {/* Cycle Phase Card */}
      <View
        style={{
          borderRadius: 24,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.1)" : colors.borderLight,
          backgroundColor: isDark
            ? "rgba(30,33,40,0.82)"
            : "rgba(255, 255, 255, 0.75)",
          padding: 20,
          alignItems: "center",
        }}
      >
        <View style={{ marginBottom: 12 }}>
          <SymbolView
            name={{
              ios: phaseInfo.icon,
              android: "info",
              web: "info",
            }}
            tintColor="#DDA7A5"
            size={32}
          />
        </View>
        <Typography
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: colors.textPrimary,
            marginBottom: 6,
            textAlign: "center",
          }}
        >
          {phaseInfo.label}
        </Typography>
        {today?.predicted_next_cycle && (
          <Typography
            variant="helper"
            style={{
              textAlign: "center",
              color: colors.textSecondary,
            }}
          >
            Next cycle: {today.predicted_next_cycle}
          </Typography>
        )}
      </View>

      {/* Alert */}
      {today?.partner_alert && (
        <View
          style={{
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.primary,
            backgroundColor: isDark
              ? "rgba(167,139,250,0.14)"
              : "rgba(221,167,165,0.12)",
            padding: 16,
          }}
        >
          <View
            style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}
          >
            <SymbolView
              name={{
                ios: "exclamationmark.circle.fill",
                android: "error",
                web: "error",
              }}
              tintColor={colors.primary}
              size={20}
            />
            <View style={{ flex: 1 }}>
              <Typography
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: colors.textPrimary,
                }}
              >
                Support Alert
              </Typography>
              <Typography
                variant="helper"
                style={{
                  marginTop: 4,
                  color: colors.textSecondary,
                }}
              >
                They shared that they need support today.
              </Typography>
            </View>
          </View>
        </View>
      )}

      {/* Predicted Symptoms (if available in phase enum or future field) */}
      <View
        style={{
          borderRadius: 24,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.1)" : colors.borderLight,
          backgroundColor: isDark
            ? "rgba(30,33,40,0.82)"
            : "rgba(255, 255, 255, 0.72)",
          padding: 16,
        }}
      >
        <Typography
          style={{ fontSize: 13, fontWeight: "600", marginBottom: 12 }}
        >
          How You Can Support
        </Typography>
        <View style={{ gap: 8 }}>
          {suggestions.map((suggestion, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.primary,
                  marginTop: 5,
                }}
              />
              <Typography
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: colors.textPrimary,
                  lineHeight: 18,
                }}
              >
                {suggestion}
              </Typography>
            </View>
          ))}
        </View>
      </View>

      {/* Note */}
      <Typography
        variant="helper"
        style={{
          textAlign: "center",
          fontSize: 11,
          color: colors.textSecondary,
          marginTop: 8,
        }}
      >
        You are viewing as a Supporter. This is read-only and updated in
        real-time.
      </Typography>
    </View>
  );
}
