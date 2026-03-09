import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo } from "react";
import { View, useColorScheme } from "react-native";

import { buildMiniCalendar, useCurrentCycle } from "@/hooks/useCurrentCycle";
import { useProfile } from "@/hooks/useProfile";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { InsightCard } from "@/src/components/cards/InsightCard";
import { HeaderBar } from "@/src/components/ui/HeaderBar";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { Screen } from "@/src/components/ui/Screen";
import { Typography } from "@/src/components/ui/Typography";
import { useAuthContext } from "@/src/context/AuthProvider";
import { useCycleStore } from "@/src/store/useCycleStore";
import { SymbolView } from "expo-symbols";

const PHASE_INSIGHT: Record<string, string> = {
  menstrual:
    "Your body is resting and renewing. Warmth, gentle movement, and nourishment support you today.",
  follicular:
    "Energy is building as your follicular phase begins. Focus and creativity are on the rise.",
  ovulation:
    "Your estrogen is peaking today. You might notice a natural glow and higher energy levels.",
  luteal:
    "Progesterone is rising. Honour rest, reduce stimulants, and be gentle with yourself.",
};

// ── Gradient Orb — hero element matching Figma ─────────────────────────────
function CycleOrb({
  day,
  phaseLabel,
  isDark,
}: {
  day: number;
  phaseLabel: string;
  isDark: boolean;
}) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 8 }}>
      {/* Outer ambient glow */}
      <View
        style={{
          position: "absolute",
          width: 280,
          height: 280,
          borderRadius: 140,
          backgroundColor: isDark
            ? "rgba(79,70,229,0.15)"
            : "rgba(255,218,185,0.4)",
          opacity: 0.7,
        }}
      />
      {/* Mid layer */}
      <View
        style={{
          position: "absolute",
          width: 240,
          height: 240,
          borderRadius: 120,
          backgroundColor: isDark
            ? "rgba(167,139,250,0.25)"
            : "rgba(221,167,165,0.5)",
          opacity: 0.8,
        }}
      />
      {/* Inner solid orb */}
      <View
        style={{
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: isDark ? "#A78BFA" : "#DDA7A5",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: isDark ? "#7C6BE8" : "#DDA7A5",
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: 0.5,
          shadowRadius: 32,
          elevation: 16,
        }}
      >
        {/* Organic inner highlight overlay */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 100,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(255,255,255,0.2)",
          }}
        />
        {/* Day number */}
        <Typography
          style={{
            fontFamily: "PlayfairDisplay-SemiBold",
            fontSize: 64,
            color: "#FFFFFF",
            lineHeight: 68,
            textAlign: "center",
          }}
        >
          {day}
        </Typography>
        {/* DAY label */}
        <Typography
          style={{
            fontSize: 11,
            letterSpacing: 2,
            color: "rgba(255,255,255,0.75)",
            textTransform: "uppercase",
            marginTop: -4,
          }}
        >
          Day
        </Typography>
        {/* Phase name */}
        <Typography
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.9)",
            marginTop: 4,
            textAlign: "center",
            paddingHorizontal: 12,
          }}
        >
          {phaseLabel}
        </Typography>
      </View>
    </View>
  );
}

export function HomeScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const hydrate = useCycleStore((s) => s.hydrate);
  const { user } = useAuthContext();

  // ─── Real-time Supabase sync ─────────────────────────────────────────────
  useRealtimeSync(user?.id);

  // ─── Live data hooks ─────────────────────────────────────────────────────
  const { data: profile } = useProfile();
  const { data: cycleData } = useCurrentCycle(
    profile?.cycle_length_average ?? 28,
    profile?.period_duration_average ?? 5,
  );

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // ─── Derived display values ───────────────────────────────────────────────
  const greetingName = profile?.first_name || "there";
  const cycleDay = cycleData?.cycleDay ?? 1;
  const phaseLabel = cycleData?.phaseLabel ?? "Cycle Phase";
  const insightText = cycleData?.phase
    ? (PHASE_INSIGHT[cycleData.phase] ?? PHASE_INSIGHT.follicular!)
    : "Loading your cycle data…";

  const miniCalendar = useMemo(
    () =>
      buildMiniCalendar(
        cycleData?.cycle ?? null,
        profile?.period_duration_average ?? 5,
      ),
    [cycleData?.cycle, profile?.period_duration_average],
  );

  const handleLogFlow = useCallback(() => {
    router.push("/quick-checkin" as never);
  }, [router]);

  const handleLogSymptoms = useCallback(() => {
    router.push("/log" as never);
  }, [router]);

  return (
    <Screen>
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <HeaderBar
        title={`Good Morning,\n${greetingName}`}
        rightSlot={
          <PressableScale
            className="h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-somaPeach/30 dark:border-darkBorder dark:bg-darkCard"
            style={{
              shadowColor: "#DDA7A5",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            <SymbolView
              name={{ ios: "bell", android: "notifications", web: "notifications" }}
              tintColor="#9B7E8C"
              size={20}
            />
          </PressableScale>
        }
      />

      {/* ── Hero gradient orb ─────────────────────────────────────── */}
      <View
        style={{
          marginTop: 24,
          height: 280,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CycleOrb day={cycleDay} phaseLabel={phaseLabel} isDark={isDark} />
      </View>

      {/* ── Phase insight card ────────────────────────────────────── */}
      <InsightCard body={insightText} delay={100} />

      {/* ── Decorative dots ───────────────────────────────────────── */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          marginTop: 16,
          marginBottom: 4,
        }}
      >
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: "#DDA7A5",
          }}
        />
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: "#FFDAB9",
          }}
        />
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: "#9B7E8C",
            opacity: 0.5,
          }}
        />
      </View>

      {/* ── Mini calendar strip ───────────────────────────────────── */}
      <View
        style={{
          marginTop: 8,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: isDark
            ? "rgba(255,255,255,0.1)"
            : "rgba(221,167,165,0.2)",
          backgroundColor: isDark
            ? "rgba(30,33,40,0.8)"
            : "rgba(255,255,255,0.75)",
          padding: 16,
          shadowColor: "#DDA7A5",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 2,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {miniCalendar.map((item) => (
            <View
              key={`${item.day}-${item.date}`}
              style={{ alignItems: "center" }}
            >
              <Typography
                variant="helper"
                style={{ marginBottom: 4, color: "#9B7E8C" }}
              >
                {item.day}
              </Typography>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: item.isCurrent
                    ? isDark
                      ? "#A78BFA"
                      : "#DDA7A5"
                    : "transparent",
                  shadowColor: item.isCurrent ? "#DDA7A5" : "transparent",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: item.isCurrent ? 0.4 : 0,
                  shadowRadius: 10,
                  elevation: item.isCurrent ? 4 : 0,
                }}
              >
                <Typography
                  style={{
                    color: item.isCurrent
                      ? "#FFFFFF"
                      : isDark
                        ? "#F2F2F2"
                        : "#2D2327",
                    fontWeight: item.isCurrent ? "600" : "400",
                    fontSize: 14,
                  }}
                >
                  {item.date}
                </Typography>
              </View>
              {item.hasPeriod && !item.isCurrent ? (
                <View
                  style={{
                    marginTop: 4,
                    width: 5,
                    height: 5,
                    borderRadius: 2.5,
                    backgroundColor: "#DDA7A5",
                  }}
                />
              ) : null}
            </View>
          ))}
        </View>
      </View>

      {/* ── Action Buttons (Figma: "Log Today's Flow" + "Log Symptoms") ───── */}
      <View
        style={{
          marginTop: 20,
          flexDirection: "row",
          gap: 12,
          marginBottom: 32,
        }}
      >
        {/* Primary: Log Today's Flow */}
        <PressableScale
          onPress={handleLogFlow}
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            backgroundColor: isDark ? "#A78BFA" : "#DDA7A5",
            paddingVertical: 18,
            shadowColor: isDark ? "#7C6BE8" : "#DDA7A5",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.4,
            shadowRadius: 24,
            elevation: 10,
          }}
        >
          <Typography
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#FFFFFF",
              textAlign: "center",
            }}
          >
            Log Today's Flow
          </Typography>
        </PressableScale>

        {/* Secondary: Log Symptoms */}
        <PressableScale
          onPress={handleLogSymptoms}
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            borderWidth: 1.5,
            borderColor: isDark ? "#A78BFA" : "#DDA7A5",
            backgroundColor: "transparent",
            paddingVertical: 18,
          }}
        >
          <Typography
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: isDark ? "#A78BFA" : "#DDA7A5",
              textAlign: "center",
            }}
          >
            Log Symptoms
          </Typography>
        </PressableScale>
      </View>
    </Screen>
  );
}
