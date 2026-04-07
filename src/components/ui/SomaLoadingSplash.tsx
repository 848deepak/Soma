/**
 * Full-screen branded splash shown during app bootstrap.
 * Keeps launch visuals aligned with native splash assets.
 */
import { useEffect, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";

import { useAppTheme } from "@/src/context/ThemeContext";
import { logWarn } from "@/platform/monitoring/logger";

interface SomaLoadingSplashProps {
  /** Force hide the splash after a timeout (default: 20 seconds) */
  timeout?: number;
  /** Callback when timeout is reached */
  onTimeout?: () => void;
  /** Optional subtitle text */
  subtitle?: string;
}

export function SomaLoadingSplash({
  timeout = 20000,
  onTimeout,
  subtitle = "cycle intelligence",
}: SomaLoadingSplashProps) {
  const { isDark, theme } = useAppTheme();
  const [opacity] = useState(new Animated.Value(0));
  const [heartPulse] = useState(new Animated.Value(1));

  const palette =
    theme === "lavender"
      ? {
          background: "#F3F0FF",
          halo: "#E8E0F8",
          orb: "#9B8AC4",
          shadow: "#7C6B9E",
          title: "#6E4FA3",
          subtitle: "#7C6B9E",
        }
      : isDark
        ? {
            background: "#0F1115",
            halo: "#1A2024",
            orb: "#A78BFA",
            shadow: "#A78BFA",
            title: "#EADFF0",
            subtitle: "#C9B9D1",
          }
        : {
            background: "#FDF7F5",
            halo: "#F6E6E3",
            orb: "#DDA7A5",
            shadow: "#DDA7A5",
            title: "#6E4A57",
            subtitle: "#8A6977",
          };

  useEffect(() => {
    // Fade in animation
    Animated.timing(opacity, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(heartPulse, {
          toValue: 1.08,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heartPulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();

    // Auto-hide after timeout
    const timeoutTimer = setTimeout(() => {
      logWarn("soma_loading_splash_timeout", {
        message: "Timeout reached, calling onTimeout",
      });
      onTimeout?.();
    }, timeout);

    return () => {
      clearTimeout(timeoutTimer);
      pulseLoop.stop();
    };
  }, [heartPulse, opacity, timeout, onTimeout]);

  return (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: palette.background,
        alignItems: "center",
        justifyContent: "center",
        opacity,
      }}
    >
      <View
        style={{
          position: "absolute",
          width: 320,
          height: 320,
          borderRadius: 160,
          backgroundColor: palette.halo,
          opacity: 0.9,
        }}
      />
      <Animated.View
        style={{
          width: 154,
          height: 154,
          borderRadius: 77,
          backgroundColor: palette.orb,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale: heartPulse }],
          shadowColor: palette.shadow,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.35,
          shadowRadius: 20,
          elevation: 8,
          marginBottom: 36,
        }}
      >
        <Text
          style={{
            fontSize: 74,
            color: "#FFFFFF",
            lineHeight: 74,
          }}
        >
          ♥
        </Text>
      </Animated.View>

      <Text
        style={{
          fontFamily: "PlayfairDisplay-SemiBold",
          fontSize: 44,
          color: palette.title,
          letterSpacing: 6,
          textAlign: "center",
          marginBottom: 10,
          paddingHorizontal: 32,
        }}
      >
        SOMA
      </Text>

      <Text
        style={{
          fontSize: 15,
          color: palette.subtitle,
          letterSpacing: 1.2,
          textAlign: "center",
          textTransform: "lowercase",
          paddingHorizontal: 32,
        }}
      >
        {subtitle}
      </Text>
    </Animated.View>
  );
}
