import { ReactNode } from "react";
import { StyleProp, ViewStyle } from "react-native";

import { PressableScale } from "@/src/components/ui/PressableScale";
import { Typography } from "@/src/components/ui/Typography";
import { useAppTheme } from "@/src/context/ThemeContext";
import { HapticsService } from "@/src/services/haptics/HapticsService";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = {
  title: string;
  onPress: () => void;
  icon?: ReactNode;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  className?: string;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "min-h-[56px] flex-row items-center justify-center rounded-full px-6",
  secondary:
    "min-h-[56px] flex-row items-center justify-center rounded-full border-2 bg-transparent px-6",
  ghost: "min-h-[44px] flex-row items-center justify-center px-4",
};

const textClasses: Record<ButtonVariant, string> = {
  primary: "font-semibold",
  secondary: "font-semibold",
  ghost: "font-medium",
};

export function Button({
  title,
  onPress,
  icon,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
  className = "",
}: ButtonProps) {
  const { colors, isDark } = useAppTheme();

  const variantStyle: Record<ButtonVariant, ViewStyle> = {
    primary: {
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: isDark ? 0.3 : 0.22,
      shadowRadius: 24,
      elevation: 8,
    },
    secondary: {
      borderColor: colors.primary,
    },
    ghost: {},
  };

  const textStyleByVariant: Record<ButtonVariant, { color: string }> = {
    primary: { color: "#FFFFFF" },
    secondary: { color: colors.primary },
    ghost: { color: colors.textSecondary },
  };

  return (
    <PressableScale
      accessibilityRole="button"
      className={`${variantClasses[variant]} ${className}`}
      style={[
        variantStyle[variant],
        { opacity: disabled || loading ? 0.6 : 1 },
        style as ViewStyle,
      ]}
      onPress={async () => {
        if (disabled || loading) return;
        await HapticsService.selection();
        onPress();
      }}
    >
      {icon}
      <Typography
        variant="body"
        className={textClasses[variant]}
        style={textStyleByVariant[variant]}
      >
        {loading ? "…" : title}
      </Typography>
    </PressableScale>
  );
}
