import { ReactNode } from "react";
import { ScrollView, StatusBar, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/src/context/ThemeContext";

type ScreenProps = {
  children: ReactNode;
  scrollable?: boolean;
  /**
   * When true, renders ambient aurora background blobs behind content.
   * Defaults to true for most screens per Figma design.
   */
  showAurora?: boolean;
  horizontalPadding?: number;
};

/** Soft ambient background blobs matching Figma's aurora glow effect */
function AuroraBlobs({
  isDark,
  theme,
}: {
  isDark: boolean;
  theme: "cream" | "midnight" | "lavender";
}) {
  const topGlow =
    theme === "lavender"
      ? "rgba(193,187,221,0.42)"
      : isDark
        ? "rgba(79,70,229,0.12)"
        : "rgba(255,218,185,0.35)";

  const bottomGlow =
    theme === "lavender"
      ? "rgba(155,138,196,0.3)"
      : isDark
        ? "rgba(167,139,250,0.1)"
        : "rgba(221,167,165,0.25)";

  return (
    <>
      {/* Top-right warm peach glow */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -60,
          right: -60,
          width: 280,
          height: 280,
          borderRadius: 140,
          backgroundColor: topGlow,
          // React Native doesn't support CSS blur, so we approximate with opacity layers
          opacity: 0.6,
        }}
      />
      {/* Bottom-left dusty-rose glow */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: "30%",
          left: -80,
          width: 240,
          height: 240,
          borderRadius: 120,
          backgroundColor: bottomGlow,
          opacity: 0.5,
        }}
      />
    </>
  );
}

export function Screen({
  children,
  scrollable = true,
  showAurora = true,
  horizontalPadding = 28,
}: ScreenProps) {
  const { isDark, colors, theme } = useAppTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Aurora background — absolutely positioned so it goes behind content */}
      {showAurora && <AuroraBlobs isDark={isDark} theme={theme} />}

      {scrollable ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: horizontalPadding,
            paddingBottom: 40,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {children}
        </ScrollView>
      ) : (
        <View
          style={{
            flex: 1,
            paddingHorizontal: horizontalPadding,
            paddingBottom: 32,
          }}
        >
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
