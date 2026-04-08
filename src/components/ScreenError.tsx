import { useRouter } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

import { Typography } from "@/src/components/ui/Typography";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { useAppTheme } from "@/src/context/ThemeContext";
import { logError } from "@/platform/monitoring/logger";

interface ScreenErrorProps {
  screenName: string;
  error: Error | null;
  onRetry?: () => void;
}

export function ScreenError({ screenName, error, onRetry }: ScreenErrorProps) {
  const router = useRouter();
  const { isDark, colors } = useAppTheme();

  useEffect(() => {
    if (!error) return;

    logError("ui", "screen_error_inline", {
      screenName,
      message: error.message,
      stack: error.stack,
    });
  }, [screenName, error]);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
      return;
    }

    router.back();
  };

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 420,
          alignItems: "center",
          borderRadius: 24,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          paddingHorizontal: 24,
          paddingVertical: 28,
        }}
      >
        <Typography
          style={{
            fontSize: 36,
            lineHeight: 40,
            marginBottom: 10,
          }}
        >
          {"⚠️"}
        </Typography>
        <Typography
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: colors.textPrimary,
            marginBottom: 6,
          }}
        >
          Something went wrong
        </Typography>
        <Typography
          variant="helper"
          style={{
            color: isDark ? "rgba(242,242,242,0.75)" : colors.textSecondary,
            textAlign: "center",
            marginBottom: 18,
          }}
        >
          We couldn't load this screen right now.
        </Typography>

        <PressableScale
          onPress={handleRetry}
          style={{
            borderRadius: 999,
            backgroundColor: colors.primary,
            paddingHorizontal: 24,
            paddingVertical: 12,
          }}
        >
          <Typography
            style={{
              color: "#FFFFFF",
              fontWeight: "600",
              fontSize: 14,
            }}
          >
            Retry
          </Typography>
        </PressableScale>
      </View>
    </View>
  );
}
