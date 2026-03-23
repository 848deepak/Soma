/**
 * SomaLoadingSplash.tsx
 * Custom loading splash screen that replaces the default loading skeleton.
 * Shows beautiful branding and ensures the app never hangs on loading indefinitely.
 */
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { Animated, Text, useColorScheme, View } from "react-native";

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
  subtitle = "Preparing your personal cycle insights...",
}: SomaLoadingSplashProps) {
  const isDark = useColorScheme() === "dark";
  const [opacity] = useState(new Animated.Value(0));
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  useEffect(() => {
    // Fade in animation
    Animated.timing(opacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Show timeout warning after 15 seconds
    const warningTimer = setTimeout(() => {
      setShowTimeoutWarning(true);
    }, 15000);

    // Auto-hide after timeout
    const timeoutTimer = setTimeout(() => {
      console.warn("[SomaLoadingSplash] Timeout reached, calling onTimeout");
      onTimeout?.();
    }, timeout);

    return () => {
      clearTimeout(warningTimer);
      clearTimeout(timeoutTimer);
    };
  }, [opacity, timeout, onTimeout]);

  return (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: isDark ? "#0F1115" : "#FFFDFB",
        alignItems: "center",
        justifyContent: "center",
        opacity,
      }}
    >
      {/* Background gradient orbs */}
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
      <View
        style={{
          position: "absolute",
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: isDark
            ? "rgba(167,139,250,0.25)"
            : "rgba(221,167,165,0.5)",
          opacity: 0.6,
        }}
      />

      {/* SOMA Logo */}
      <View
        style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: isDark ? "#A78BFA" : "#DDA7A5",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 40,
          shadowColor: isDark ? "#7C6BE8" : "#DDA7A5",
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: 0.5,
          shadowRadius: 32,
          elevation: 16,
        }}
      >
        <Text
          style={{
            fontFamily: "PlayfairDisplay-SemiBold",
            fontSize: 36,
            color: "#FFFFFF",
            letterSpacing: 2,
          }}
        >
          SOMA
        </Text>
      </View>

      {/* Loading indicator */}
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: isDark
            ? "rgba(167,139,250,0.2)"
            : "rgba(255, 218, 185, 0.3)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        <SymbolView
          name={{
            ios: "heart.fill",
            android: "favorite",
            web: "favorite",
          }}
          tintColor="#9B7E8C"
          size={24}
          style={{
            // Simple pulse animation
            opacity: showTimeoutWarning ? 0.5 : 1,
          }}
        />
      </View>

      {/* Subtitle */}
      <Text
        style={{
          fontSize: 16,
          color: isDark ? "#F2F2F2" : "#2D2327",
          textAlign: "center",
          marginBottom: 16,
          paddingHorizontal: 32,
        }}
      >
        {subtitle}
      </Text>

      {/* Timeout warning */}
      {showTimeoutWarning && (
        <Text
          style={{
            fontSize: 14,
            color: "#9B7E8C",
            textAlign: "center",
            paddingHorizontal: 32,
            opacity: 0.8,
          }}
        >
          This is taking longer than usual...
        </Text>
      )}
    </Animated.View>
  );
}
