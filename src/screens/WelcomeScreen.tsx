import { useRouter } from "expo-router";
import { useEffect } from "react";
import { View, useColorScheme } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";

import { useProfile } from "@/hooks/useProfile";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { Screen } from "@/src/components/ui/Screen";
import { Typography } from "@/src/components/ui/Typography";
import { HAS_LAUNCHED_KEY } from "@/src/constants/storage";
import { useAuthContext } from "@/src/context/AuthProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Multi-layer animated orb matching Figma welcome screen ──────────────────
function AnimatedOrb({ isDark }: { isDark: boolean }) {
  // Outer glow pulse — slow 3s cycle
  const outerScale = useSharedValue(1);
  const outerOpacity = useSharedValue(0.5);

  // Mid glow pulse — offset 1.5s
  const midScale = useSharedValue(1);
  const midOpacity = useSharedValue(0.65);

  useEffect(() => {
    outerScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 2000 }),
        withTiming(1.0, { duration: 2000 }),
      ),
      -1,
      false,
    );
    outerOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 2000 }),
        withTiming(0.4, { duration: 2000 }),
      ),
      -1,
      false,
    );

    // Slight delay for stagger effect
    setTimeout(() => {
      midScale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 2000 }),
          withTiming(1.0, { duration: 2000 }),
        ),
        -1,
        false,
      );
      midOpacity.value = withRepeat(
        withSequence(
          withTiming(0.85, { duration: 2000 }),
          withTiming(0.6, { duration: 2000 }),
        ),
        -1,
        false,
      );
    }, 600);
  }, [outerScale, outerOpacity, midScale, midOpacity]);

  const outerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: outerScale.value }],
    opacity: outerOpacity.value,
  }));

  const midAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: midScale.value }],
    opacity: midOpacity.value,
  }));

  return (
    <View
      style={{
        width: 320,
        height: 320,
        marginBottom: 64,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Outer pulse glow */}
      <Animated.View
        style={[
          {
            position: "absolute",
            width: 320,
            height: 320,
            borderRadius: 160,
            backgroundColor: isDark
              ? "rgba(167,139,250,0.2)"
              : "rgba(255,218,185,0.55)",
          },
          outerAnimStyle,
        ]}
      />
      {/* Mid glow layer */}
      <Animated.View
        style={[
          {
            position: "absolute",
            width: 288,
            height: 288,
            borderRadius: 144,
            backgroundColor: isDark
              ? "rgba(167,139,250,0.35)"
              : "rgba(221,167,165,0.6)",
          },
          midAnimStyle,
        ]}
      />
      {/* Inner static orb */}
      <View
        style={{
          width: 224,
          height: 224,
          borderRadius: 112,
          backgroundColor: isDark ? "#A78BFA" : "#DDA7A5",
          shadowColor: isDark ? "#7C6BE8" : "#DDA7A5",
          shadowOffset: { width: 0, height: 20 },
          shadowOpacity: 0.5,
          shadowRadius: 40,
          elevation: 16,
        }}
      >
        {/* Organic inner highlight */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 112,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(255,255,255,0.25)",
          }}
        />
      </View>
    </View>
  );
}

export function WelcomeScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const { user, isAnonymous } = useAuthContext();
  const { data: profile } = useProfile();

  const displayName = profile?.first_name?.trim() || (isAnonymous ? "Guest User" : "there");
  const username =
    profile?.username?.trim() ||
    (user?.email
      ? user.email.split("@")[0]
      : isAnonymous
        ? "guest"
        : `user-${user?.id?.slice(0, 6) ?? "guest"}`);
  const email = user?.email ?? (isAnonymous ? "Guest Account" : "Private account");
  const profileInfo = profile?.date_of_birth
    ? `DOB: ${profile.date_of_birth}`
    : "Profile can be completed anytime in Settings";

  async function handleGetStarted() {
    await AsyncStorage.setItem(HAS_LAUNCHED_KEY, "true");
    if (profile?.is_onboarded) {
      router.replace("/(tabs)" as never);
      return;
    }
    router.push("/setup" as never);
  }

  return (
    <Screen showAurora={false}>
      {/* Extra ambient background blobs (decorative, matching Figma) */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 60,
          left: 16,
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: isDark
            ? "rgba(79,70,229,0.15)"
            : "rgba(255,218,185,0.5)",
          opacity: 0.6,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: 120,
          right: 24,
          width: 160,
          height: 160,
          borderRadius: 80,
          backgroundColor: isDark
            ? "rgba(167,139,250,0.12)"
            : "rgba(155,126,140,0.3)",
          opacity: 0.5,
        }}
      />

      <View style={{ marginTop: 26, alignItems: "center" }}>
        {/* ── Animated aurora orb ─────────────────────────── */}
        <AnimatedOrb isDark={isDark} />

        {/* ── Heading ─────────────────────────────────────── */}
        <Typography variant="serif" className="text-center">
          {"Listen to your\nbody's rhythm."}
        </Typography>

        {/* ── Subtitle ────────────────────────────────────── */}
        <Typography
          variant="muted"
          className="mt-4 text-center"
          style={{ fontSize: 16, lineHeight: 24 }}
        >
          {"Track your cycle with warmth,\nwisdom, and complete privacy."}
        </Typography>

        <Typography className="mt-5 text-center text-base font-semibold text-somaCharcoal dark:text-darkTextPrimary">
          Welcome, {displayName}
        </Typography>
        <Typography
          variant="helper"
          className="mt-1 text-center text-somaMauve dark:text-darkTextSecondary"
          style={{ fontSize: 13 }}
        >
          @{username} · {email}
        </Typography>
        <Typography
          variant="helper"
          className="mt-1 text-center text-somaMauve/80 dark:text-darkTextSecondary"
          style={{ fontSize: 12 }}
        >
          {profileInfo}
        </Typography>

        {/* ── Get Started CTA ─────────────────────────────── */}
        <PressableScale
          onPress={handleGetStarted}
          className="mt-14 w-full items-center rounded-full bg-somaBlush py-[20px] dark:bg-darkPrimary"
          style={{
            shadowColor: "#DDA7A5",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.4,
            shadowRadius: 40,
            elevation: 12,
          }}
        >
          <Typography className="text-base font-semibold text-white">
            {profile?.is_onboarded ? "Go to Home" : "Get Started"}
          </Typography>
        </PressableScale>

        {/* ── Sign in link for returning users ─────────────── */}
        <PressableScale
          onPress={() => router.push("/auth/login" as never)}
          className="mt-5 items-center"
        >
          <Typography
            variant="helper"
            className="text-somaMauve/70 dark:text-darkTextSecondary"
          >
            Already have an account? Sign in
          </Typography>
        </PressableScale>
      </View>
    </Screen>
  );
}
