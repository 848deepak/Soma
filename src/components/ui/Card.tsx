import { ReactNode } from "react";
import { View } from "react-native";

import { useAppTheme } from "@/src/context/ThemeContext";

type CardVariant = "glass" | "solid" | "highlight";

type CardProps = {
  children: ReactNode;
  className?: string;
  variant?: CardVariant;
};

const variantClasses: Record<CardVariant, string> = {
  glass: "rounded-[28px] border",
  solid: "rounded-[28px] border",
  highlight: "rounded-[28px] border",
};

export function Card({
  children,
  className = "",
  variant = "glass",
}: CardProps) {
  const { colors, isDark } = useAppTheme();

  const backgroundByVariant = {
    glass: isDark ? "rgba(30,33,40,0.8)" : "rgba(255,255,255,0.72)",
    solid: colors.card,
    highlight: isDark ? "rgba(167,139,250,0.16)" : "rgba(221,167,165,0.2)",
  } as const;

  return (
    <View
      className={`${variantClasses[variant]} p-5 ${className}`}
      style={{
        borderColor: colors.borderLight,
        backgroundColor: backgroundByVariant[variant],
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.2 : 0.15,
        shadowRadius: 32,
        elevation: isDark ? 4 : 6,
      }}
    >
      {children}
    </View>
  );
}
