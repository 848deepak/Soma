import { useEffect, useMemo } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { useCycleHistory } from "@/src/domain/cycle";
import { useDailyLogs } from "@/src/domain/calendar";
import {
    buildCycleHistoryBars,
    buildSymptomStats,
    buildTrendInsight,
} from "@/services/CycleIntelligence";
import { InsightCard } from "@/src/components/cards/InsightCard";
import { HeaderBar } from "@/src/components/ui/HeaderBar";
import { Screen } from "@/src/components/ui/Screen";
import { Typography } from "@/src/components/ui/Typography";
import { useAppTheme } from "@/src/context/ThemeContext";
import { logDataAccess } from "@/src/services/auditService";
import { ScreenErrorBoundary } from "@/src/components/ScreenErrorBoundary";

export function InsightsScreen() {
  const { theme, isDark, colors } = useAppTheme();
  const nonDarkBarSurface =
    theme === "lavender" ? "rgba(193,187,221,0.25)" : "rgba(255,218,185,0.25)";
  const { data: cycles = [], isLoading: cyclesLoading } = useCycleHistory(6);
  const { data: logs = [], isLoading: logsLoading } = useDailyLogs(90);

  const bars = useMemo(() => buildCycleHistoryBars(cycles), [cycles]);
  const symptomStats = useMemo(() => buildSymptomStats(logs), [logs]);
  const insight = useMemo(
    () => buildTrendInsight(cycles, logs),
    [cycles, logs],
  );

  const isLoading = cyclesLoading || logsLoading;

  useEffect(() => {
    if (isLoading) return;

    void logDataAccess("cycle_data", "view", {
      source: "insights_overview",
      barsCount: bars.length,
      symptomStatCount: symptomStats.length,
      insightTitle: insight.title,
      cyclesCount: cycles.length,
      logsCount: logs.length,
    });
  }, [
    isLoading,
    bars.length,
    symptomStats.length,
    insight.title,
    cycles.length,
    logs.length,
  ]);

  const cardStyle = {
    marginTop: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 3,
  };

  return (
    <Screen>
      <HeaderBar title={"Body\nTrends"} />

      {/* ── Cycle History bar chart ─────────────────────────────── */}
      <Animated.View
        entering={FadeInUp.delay(60).duration(450)}
        style={cardStyle}
      >
        <Typography
          style={{
            marginBottom: 16,
            fontSize: 17,
            fontWeight: "600",
            color: colors.textPrimary,
          }}
        >
          Cycle History
        </Typography>

        {!isLoading && bars.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 24 }}>
            <Typography variant="helper" style={{ textAlign: "center" }}>
              Complete your first cycle to see history here.
            </Typography>
          </View>
        ) : (
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "space-between",
              borderRadius: 16,
              backgroundColor: isDark
                ? "rgba(167,139,250,0.08)"
                : nonDarkBarSurface,
              paddingHorizontal: 12,
              paddingVertical: 16,
            }}
          >
            {(isLoading
              ? Array.from({ length: 6 }, (_, i) => ({
                  month: "···",
                  length: 25 + i * 2,
                }))
              : bars
            ).map((bar, index) => {
              const height = Math.max(26, (bar.length - 25) * 12);
              const barColor =
                index % 2 === 0
                  ? colors.primary
                  : colors.secondary;
              return (
                <View
                  key={`${bar.month}-${index}`}
                  style={{ alignItems: "center", opacity: isLoading ? 0.3 : 1 }}
                >
                  <View
                    style={{
                      width: 28,
                      height,
                      borderRadius: 14,
                      backgroundColor: barColor,
                    }}
                  />
                  <Typography variant="helper" style={{ marginTop: 8 }}>
                    {bar.month}
                  </Typography>
                </View>
              );
            })}
          </View>
        )}
      </Animated.View>

      {/* ── Symptom Patterns tag cloud ──────────────────────────── */}
      <Animated.View
        entering={FadeInUp.delay(140).duration(450)}
        style={cardStyle}
      >
        <Typography
          style={{
            marginBottom: 16,
            fontSize: 17,
            fontWeight: "600",
            color: colors.textPrimary,
          }}
        >
          Symptom Patterns
        </Typography>

        {!isLoading && symptomStats.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 24 }}>
            <Typography variant="helper" style={{ textAlign: "center" }}>
              Log symptoms to see patterns here.
            </Typography>
          </View>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {(isLoading
              ? [
                  {
                    name: "Cramps" as const,
                    frequency: 70,
                    size: 17,
                    count: 0,
                  },
                  {
                    name: "Bloating" as const,
                    frequency: 50,
                    size: 15,
                    count: 0,
                  },
                  { name: "Moody" as const, frequency: 40, size: 14, count: 0 },
                ]
              : symptomStats
            ).map((symptom, index) => {
              const high = symptom.frequency > 60;
              return (
                <View
                  key={`${symptom.name}-${index}`}
                  style={{
                    marginBottom: 8,
                    marginRight: 8,
                    borderRadius: 999,
                    borderWidth: high ? 0 : 1,
                    borderColor: isDark
                      ? "rgba(167,139,250,0.3)"
                      : "rgba(155,126,140,0.3)",
                    backgroundColor: high
                      ? isDark
                        ? "#818CF8"
                        : "#9B7E8C"
                      : isDark
                        ? "rgba(167,139,250,0.12)"
                        : "rgba(155,126,140,0.08)",
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    opacity: isLoading ? 0.3 : 1,
                  }}
                >
                  <Text
                    style={{
                      fontSize: symptom.size,
                      fontWeight: "500",
                      color: high ? "#FFFFFF" : isDark ? "#F2F2F2" : "#2D2327",
                    }}
                  >
                    {symptom.name}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </Animated.View>

      {/* ── Trend Insight callout ───────────────────────────────── */}
      <InsightCard delay={220} title={insight.title} body={insight.body} />
    </Screen>
  );
}

export function InsightsScreenWithErrorBoundary() {
  return (
    <ScreenErrorBoundary screenName="InsightsScreen">
      <InsightsScreen />
    </ScreenErrorBoundary>
  );
}
