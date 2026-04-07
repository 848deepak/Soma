import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { useCurrentCycle } from "@/hooks/useCurrentCycle";
import { useEndCurrentCycle } from "@/hooks/useCycleActions";
import { useTodayLog } from "@/hooks/useDailyLogs";
import { useProfile } from "@/hooks/useProfile";
import { useSaveLog } from "@/hooks/useSaveLog";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { Typography } from "@/src/components/ui/Typography";
import { useAppTheme } from "@/src/context/ThemeContext";
import { HapticsService } from "@/src/services/haptics/HapticsService";
import type { FlowLevel, SymptomOption } from "@/types/database";

const flowLevels = [
  { label: "None", opacity: 0 },
  { label: "Light", opacity: 0.3 },
  { label: "Medium", opacity: 0.65 },
  { label: "Heavy", opacity: 1 },
] as const;

const symptoms: SymptomOption[] = [
  "Cramps",
  "Tender",
  "Radiant",
  "Brain Fog",
  "Bloating",
  "Energized",
  "Moody",
  "Calm",
];

function Teardrop({
  filled,
  color,
  opacity = 1,
}: {
  filled: boolean;
  color: string;
  opacity?: number;
}) {
  return (
    <Svg width={32} height={40} viewBox="0 0 32 40" fill="none">
      <Path
        d="M16 0C16 0 0 16 0 26C0 33.732 7.163 40 16 40C24.837 40 32 33.732 32 26C32 16 16 0 16 0Z"
        fill={filled ? color : "transparent"}
        fillOpacity={opacity}
        stroke={color}
        strokeWidth={filled ? 0 : 1.5}
        strokeOpacity={filled ? 0 : 0.4}
      />
    </Svg>
  );
}

export function DailyLogScreen() {
  const router = useRouter();
  const { theme, isDark, colors } = useAppTheme();
  const saveLog = useSaveLog();
  const endCurrentCycle = useEndCurrentCycle();

  const { data: todayLog } = useTodayLog();
  const { data: profile } = useProfile();
  const { data: cycleData } = useCurrentCycle(
    profile?.cycle_length_average ?? 28,
    profile?.period_duration_average ?? 5,
  );

  const [flowLevel, setFlowLevel] = useState<number>(
    Math.min(todayLog?.flow_level ?? 2, 3),
  );
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(
    todayLog?.symptoms ?? [],
  );
  const [notes, setNotes] = useState(todayLog?.notes ?? "");
  const accentPrimary = colors.primary;
  const accentPrimaryDark = colors.primaryDark;
  const hasActivePeriod = Boolean(cycleData?.cycle);

  const subtitle = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [],
  );

  function handleFlowChange(index: number) {
    void HapticsService.selection();
    setFlowLevel(index);
  }

  function handleSymptomToggle(symptom: string) {
    void HapticsService.impactLight();
    setSelectedSymptoms((previous) =>
      previous.includes(symptom)
        ? previous.filter((item) => item !== symptom)
        : [...previous, symptom],
    );
  }

  function handleSave() {
    if (!hasActivePeriod) {
      void HapticsService.error();
      Alert.alert(
        "Start Period First",
        "No active period found. Start your period before saving a daily log.",
      );
      return;
    }

    void HapticsService.success();
    saveLog.mutate(
      {
        flow_level: flowLevel as FlowLevel,
        symptoms: selectedSymptoms as SymptomOption[],
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => router.back(),
      },
    );
  }

  function handleEndPeriod() {
    if (endCurrentCycle.isPending) {
      return;
    }

    Alert.alert(
      "End Current Period",
      "Mark today as the end of your current period?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End",
          onPress: async () => {
            if (endCurrentCycle.isPending) {
              return;
            }

            try {
              await HapticsService.impactMedium();
              await endCurrentCycle.mutateAsync();
              await HapticsService.success();
              Alert.alert("Saved", "Current period ended today.");
            } catch (error: unknown) {
              await HapticsService.error();
              const message = error instanceof Error ? error.message : "";

              // IMPROVED: Better error messages with user-friendly copy
              if (
                message.includes("No active period") ||
                message.includes("already ended")
              ) {
                Alert.alert(
                  "No Active Period",
                  "There's no active period to end. Start a new period first.",
                  [{ text: "OK" }],
                );
              } else if (
                message.includes("network") ||
                message.includes("offline") ||
                message.includes("Failed")
              ) {
                Alert.alert(
                  "Connection Issue",
                  message.includes("sync") || message.includes("offline")
                    ? "You're offline. The period will be ended when you're online again."
                    : "Connection error. Please check your internet and try again.",
                  [{ text: "Try Again", onPress: () => handleEndPeriod() }],
                );
              } else if (
                message.includes("Invalid") ||
                message.includes("format")
              ) {
                Alert.alert(
                  "Data Error",
                  "Your period data appears corrupted. Please contact support.",
                  [{ text: "OK" }],
                );
              } else {
                const fallbackMessage =
                  message || "Could not end the current period.";
                Alert.alert("Action Failed", fallbackMessage, [
                  { text: "Try Again", onPress: () => handleEndPeriod() },
                ]);
              }
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Soft Aurora Background Blurs */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 320,
            height: 320,
            borderRadius: 160,
            backgroundColor: isDark
              ? "rgba(167,139,250,0.12)"
              : theme === "lavender"
                ? "rgba(193,187,221,0.25)"
                : "rgba(255,218,185,0.25)",
            opacity: 0.8,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: "33%",
            right: 0,
            width: 288,
            height: 288,
            borderRadius: 144,
            backgroundColor: isDark
              ? "rgba(129,140,248,0.12)"
              : "rgba(155,126,140,0.18)",
            opacity: 0.7,
          }}
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 180 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingTop: 36,
              paddingBottom: 14,
            }}
          >
            <View style={{ flex: 1 }}>
              <Typography
                style={{
                  fontFamily: "PlayfairDisplay-SemiBold",
                  fontSize: 28,
                  lineHeight: 34,
                  color: colors.textPrimary,
                }}
              >
                {"How are you\nfeeling today?"}
              </Typography>
              <Typography
                style={{
                  marginTop: 8,
                  fontSize: 14,
                  color: colors.textSecondary,
                }}
              >
                {subtitle}
              </Typography>

              {hasActivePeriod ? (
                <PressableScale
                  onPress={handleEndPeriod}
                  style={{
                    marginTop: 12,
                    alignSelf: "flex-start",
                    borderRadius: 999,
                    backgroundColor:
                      theme === "lavender"
                        ? "rgba(155,138,196,0.2)"
                        : "rgba(221, 167, 165, 0.2)",
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    opacity: endCurrentCycle.isPending ? 0.7 : 1,
                  }}
                >
                  <Typography
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: colors.textPrimary,
                    }}
                  >
                    {endCurrentCycle.isPending ? "Ending…" : "End Period"}
                  </Typography>
                </PressableScale>
              ) : null}
            </View>
            <PressableScale
              onPress={() => router.back()}
              testID="daily-log-close-button"
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isDark
                  ? "rgba(30,33,40,0.85)"
                  : colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 16,
                elevation: 3,
              }}
            >
              <SymbolView
                name={{ ios: "xmark", android: "close", web: "close" }}
                tintColor={colors.textSecondary}
                size={20}
              />
            </PressableScale>
          </View>

          <View style={{ paddingTop: 12 }}>
            {/* Flow */}
            <View style={{ marginBottom: 42 }}>
              <Typography
                style={{
                  fontFamily: "PlayfairDisplay-SemiBold",
                  fontSize: 18,
                  color: isDark ? "#F2F2F2" : "#2D2327",
                  marginBottom: 24,
                }}
              >
                Flow
              </Typography>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  paddingHorizontal: 14,
                }}
              >
                {flowLevels.map((level, index) => {
                  const isSelected = flowLevel === index;
                  return (
                    <PressableScale
                      key={level.label}
                      onPress={() => handleFlowChange(index)}
                      style={{ alignItems: "center", gap: 10 }}
                    >
                      <View
                        style={{
                          transform: [{ scale: isSelected ? 1.15 : 1 }],
                          shadowColor: accentPrimary,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: isSelected ? 0.3 : 0,
                          shadowRadius: 12,
                          elevation: isSelected ? 5 : 0,
                        }}
                      >
                        <Teardrop
                          filled={index > 0}
                          color={accentPrimary}
                          opacity={level.opacity}
                        />
                      </View>
                      <Typography
                        style={{
                          fontSize: 12,
                          fontWeight: isSelected ? "600" : "400",
                          color: isSelected
                            ? isDark
                              ? colors.textPrimary
                              : colors.textPrimary
                            : colors.textSecondary,
                        }}
                      >
                        {level.label}
                      </Typography>
                    </PressableScale>
                  );
                })}
              </View>
            </View>

            {/* Symptoms */}
            <View style={{ marginBottom: 42 }}>
              <Typography
                style={{
                  fontFamily: "PlayfairDisplay-SemiBold",
                  fontSize: 18,
                  color: isDark ? "#F2F2F2" : "#2D2327",
                  marginBottom: 24,
                }}
              >
                Symptoms
              </Typography>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {symptoms.map((symptom) => {
                  const isSelected = selectedSymptoms.includes(symptom);
                  return (
                    <PressableScale
                      key={symptom}
                      onPress={() => handleSymptomToggle(symptom)}
                      style={{
                        paddingHorizontal: 20,
                        paddingVertical: 12,
                        borderRadius: 999,
                        backgroundColor: isSelected
                          ? colors.accent
                          : "transparent",
                        borderWidth: isSelected ? 0 : 1,
                        borderColor: colors.border,
                        shadowColor: colors.accent,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: isSelected ? 0.3 : 0,
                        shadowRadius: 16,
                        elevation: isSelected ? 4 : 0,
                      }}
                    >
                      <Typography
                        style={{
                          fontSize: 14,
                          color: isSelected ? "#FFFFFF" : colors.textSecondary,
                          fontWeight: isSelected ? "500" : "400",
                        }}
                      >
                        {symptom}
                      </Typography>
                    </PressableScale>
                  );
                })}
              </View>
            </View>

            {/* Divider */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                marginBottom: 28,
                opacity: 0.4,
              }}
            >
              <View
                style={{ flex: 1, height: 1, backgroundColor: colors.primary }}
              />
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.primary,
                }}
              />
              <View
                style={{ flex: 1, height: 1, backgroundColor: colors.primary }}
              />
            </View>

            {/* Notes */}
            <View style={{ marginBottom: 18 }}>
              <Typography
                style={{
                  fontFamily: "PlayfairDisplay-SemiBold",
                  fontSize: 18,
                  color: isDark ? "#F2F2F2" : "#2D2327",
                  marginBottom: 16,
                }}
              >
                Notes
              </Typography>
              <View
                style={{
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: isDark
                    ? "rgba(30,33,40,0.9)"
                    : theme === "lavender"
                      ? "rgba(193,187,221,0.15)"
                      : "rgba(255, 218, 185, 0.15)",
                  padding: 18,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.08,
                  shadowRadius: 20,
                  elevation: 2,
                }}
              >
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  placeholder="How are you feeling? Any observations?"
                  placeholderTextColor={colors.textSecondary}
                  textAlignVertical="top"
                  style={{
                    minHeight: 80,
                    fontSize: 14,
                    lineHeight: 20,
                    color: colors.textPrimary,
                  }}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Save button bar */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 28,
            paddingTop: 18,
            paddingBottom: 28,
            backgroundColor: isDark
              ? "rgba(15,17,21,0.95)"
              : colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <PressableScale
            onPress={handleSave}
            disabled={saveLog.isPending || !hasActivePeriod}
            style={{
              alignItems: "center",
              borderRadius: 999,
              backgroundColor: accentPrimary,
              paddingVertical: 20,
              opacity: saveLog.isPending || !hasActivePeriod ? 0.6 : 1,
              shadowColor: accentPrimaryDark,
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.4,
              shadowRadius: 40,
              elevation: 12,
            }}
          >
            <Typography
              style={{ fontSize: 16, fontWeight: "600", color: "#FFFFFF" }}
            >
              {saveLog.isPending ? "Saving…" : "Save Log"}
            </Typography>
          </PressableScale>

          {!hasActivePeriod ? (
            <Typography
              variant="helper"
              style={{ marginTop: 8, textAlign: "center", color: colors.textSecondary }}
            >
              Start your period to enable logging.
            </Typography>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
