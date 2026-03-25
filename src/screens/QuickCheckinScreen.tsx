/**
 * src/screens/QuickCheckinScreen.tsx
 *
 * Figma "Quick Check-in" — rendered as a slide-up bottom sheet
 * over a semi-transparent backdrop (presentation: transparentModal).
 */
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { Dimensions, Pressable, View, useColorScheme } from "react-native";
import Animated, {
    FadeIn,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

import { useSaveLog } from "@/hooks/useSaveLog";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { Typography } from "@/src/components/ui/Typography";
import { HapticsService } from "@/src/services/haptics/HapticsService";
import type { FlowLevel, MoodOption } from "@/types/database";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const moodOptions: Array<{
  id: string;
  label: MoodOption;
  icon: { ios: string; android: string; web: string };
  color: string;
}> = [
  {
    id: "happy",
    label: "Happy",
    icon: { ios: "face.smiling.fill", android: "mood", web: "mood" },
    color: "#FFDAB9",
  },
  {
    id: "sensitive",
    label: "Sensitive",
    icon: { ios: "heart.fill", android: "favorite", web: "favorite" },
    color: "#DDA7A5",
  },
  {
    id: "energetic",
    label: "Energetic",
    icon: {
      ios: "cup.and.saucer.fill",
      android: "local_cafe",
      web: "local_cafe",
    },
    color: "#8BA888",
  },
  {
    id: "tired",
    label: "Tired",
    icon: { ios: "moon.zzz.fill", android: "bedtime", web: "bedtime" },
    color: "#9B7E8C",
  },
];

const FLOW_LABELS = ["None", "Light", "Medium", "Heavy", "Very Heavy"];

export function QuickCheckinScreen() {
  const router = useRouter();
  const saveLog = useSaveLog();
  const isDark = useColorScheme() === "dark";

  const [flowLevel, setFlowLevel] = useState<number>(2);
  const [selectedMood, setSelectedMood] = useState<MoodOption | null>(null);
  const [shareAlert, setShareAlert] = useState(false);

  // Slide-up animation
  const translateY = useSharedValue(SCREEN_HEIGHT);

  useEffect(() => {
    translateY.value = withTiming(0, { duration: 320 });
  }, [translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  function handleFlowChange(value: number) {
    void HapticsService.selection();
    setFlowLevel(value);
  }

  function handleMoodSelect(mood: MoodOption) {
    void HapticsService.impactLight();
    setSelectedMood((prev) => (prev === mood ? null : mood));
  }

  function handleDismiss() {
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 260 });
    setTimeout(() => router.back(), 280);
  }

  function handleSave() {
    void HapticsService.success();
    saveLog.mutate(
      {
        flow_level: flowLevel as FlowLevel,
        ...(selectedMood ? { mood: selectedMood } : {}),
        partner_alert: shareAlert,
      },
      {
        onSuccess: () => handleDismiss(),
      },
    );
  }

  const cardBg = isDark ? "rgba(26,29,36,0.98)" : "rgba(255,253,251,0.98)";
  const cardBorder = isDark
    ? "rgba(255,255,255,0.1)"
    : "rgba(221,167,165,0.25)";

  return (
    <View style={{ flex: 1 }}>
      {/* Semi-transparent backdrop */}
      <Animated.View
        entering={FadeIn.duration(200)}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.45)",
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={handleDismiss} />
      </Animated.View>

      {/* Bottom sheet */}
      <Animated.View
        style={[
          {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            borderWidth: 1,
            borderColor: cardBorder,
            backgroundColor: cardBg,
            paddingHorizontal: 28,
            paddingTop: 20,
            paddingBottom: 48,
          },
          sheetStyle,
        ]}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <Typography
            style={{
              fontFamily: "PlayfairDisplay-SemiBold",
              fontSize: 24,
              color: isDark ? "#F2F2F2" : "#2D2327",
            }}
          >
            Quick Check-in
          </Typography>
          <PressableScale
            onPress={handleDismiss}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark
                ? "rgba(155, 126, 140, 0.25)"
                : "rgba(155, 126, 140, 0.12)",
            }}
          >
            <Typography
              style={{ fontSize: 18, color: "#9B7E8C", lineHeight: 22 }}
            >
              ×
            </Typography>
          </PressableScale>
        </View>

        {/* Flow level slider */}
        <Typography
          style={{
            fontSize: 14,
            fontWeight: "500",
            color: isDark ? "#F2F2F2" : "#2D2327",
            marginBottom: 14,
          }}
        >
          Flow Level
        </Typography>

        <View
          style={{
            height: 8,
            borderRadius: 999,
            backgroundColor: "rgba(221, 167, 165, 0.2)",
            overflow: "hidden",
            marginBottom: 12,
          }}
        >
          <View
            style={{
              width: `${(flowLevel / 4) * 100}%`,
              height: 8,
              borderRadius: 999,
              backgroundColor: "#DDA7A5",
            }}
          />
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          {FLOW_LABELS.map((label, index) => {
            const isActive = flowLevel === index;
            return (
              <PressableScale
                key={label}
                onPress={() => handleFlowChange(index)}
                style={{ alignItems: "center", paddingHorizontal: 2 }}
              >
                <Typography
                  style={{
                    fontSize: 11,
                    color: isActive
                      ? isDark
                        ? "#F2F2F2"
                        : "#2D2327"
                      : "#9B7E8C",
                    fontWeight: isActive ? "600" : "400",
                  }}
                >
                  {label}
                </Typography>
              </PressableScale>
            );
          })}
        </View>

        {/* Mood chips */}
        <Typography
          style={{
            fontSize: 14,
            fontWeight: "500",
            color: isDark ? "#F2F2F2" : "#2D2327",
            marginBottom: 14,
          }}
        >
          How are you feeling?
        </Typography>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 24,
          }}
        >
          {moodOptions.map((option) => {
            const isActive = selectedMood === option.label;
            return (
              <PressableScale
                key={option.id}
                onPress={() => handleMoodSelect(option.label)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 12,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: isActive
                    ? option.color
                    : "rgba(221,167,165,0.2)",
                  backgroundColor: isActive
                    ? `${option.color}40`
                    : isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(255,255,255,0.6)",
                  shadowColor: option.color,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isActive ? 0.25 : 0,
                  shadowRadius: 16,
                  elevation: isActive ? 4 : 0,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isActive
                      ? `${option.color}30`
                      : "rgba(221, 167, 165, 0.1)",
                  }}
                >
                  <SymbolView
                    name={option.icon as any}
                    tintColor={option.color}
                    size={20}
                  />
                </View>
                <Typography
                  style={{
                    fontSize: 11,
                    color: isActive
                      ? isDark
                        ? "#F2F2F2"
                        : "#2D2327"
                      : "#9B7E8C",
                    fontWeight: isActive ? "600" : "400",
                  }}
                >
                  {option.label}
                </Typography>
              </PressableScale>
            );
          })}
        </View>

        {/* Partner alert toggle */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "rgba(221,167,165,0.15)",
            backgroundColor: isDark
              ? "rgba(221,167,165,0.12)"
              : "rgba(221,167,165,0.08)",
            paddingHorizontal: 16,
            paddingVertical: 14,
            marginBottom: 24,
          }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Typography
              style={{
                fontSize: 14,
                fontWeight: "500",
                color: isDark ? "#F2F2F2" : "#2D2327",
              }}
            >
              Share severe cramps with Partner?
            </Typography>
            <Typography
              style={{
                marginTop: 2,
                fontSize: 12,
                color: "#9B7E8C",
              }}
            >
              They'll be notified to check in on you
            </Typography>
          </View>
          <PressableScale
            onPress={() => setShareAlert((prev) => !prev)}
            style={{
              width: 56,
              height: 32,
              borderRadius: 999,
              marginLeft: 12,
              justifyContent: "center",
              backgroundColor: shareAlert
                ? "#DDA7A5"
                : "rgba(155, 126, 140, 0.2)",
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: "#FFFFFF",
                marginLeft: shareAlert ? 28 : 4,
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 8,
                elevation: 2,
              }}
            />
          </PressableScale>
        </View>

        {/* Save button */}
        <PressableScale
          onPress={handleSave}
          style={{
            alignItems: "center",
            borderRadius: 999,
            backgroundColor: "#DDA7A5",
            paddingVertical: 20,
            opacity: saveLog.isPending ? 0.6 : 1,
            shadowColor: "#DDA7A5",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.4,
            shadowRadius: 40,
            elevation: 12,
          }}
        >
          <Typography
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: "#FFFFFF",
            }}
          >
            {saveLog.isPending ? "Saving…" : "Save & Close"}
          </Typography>
        </PressableScale>
      </Animated.View>
    </View>
  );
}
